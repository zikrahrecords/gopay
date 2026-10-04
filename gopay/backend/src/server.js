require('dotenv').config();
const express = require('express'), helmet = require('helmet'), cors = require('cors'), cookie = require('cookie-parser'),
  rate = require('express-rate-limit'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'), crypto = require('crypto'),
  { z } = require('zod'), { pool, tx } = require('./db');
const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 32) throw new Error('JWT_SECRET (32+ chars) is required');
const app = express();
app.use(helmet(), cors({ origin: process.env.FRONTEND_ORIGIN, credentials: true }), express.json({ limit: '1mb' }), cookie());
const fail = (s, m) => { throw Object.assign(new Error(m), { status: s }); };
const h = f => (req, res, next) => f(req, res, next).catch(e => e.status ? res.status(e.status).json({ error: e.message }) : (console.error(e), res.status(500).json({ error: 'Server error' })));
const parse = (sc, d) => { const r = sc.safeParse(d); if (!r.success) fail(400, r.error.issues[0].message); return r.data; };
const pid = p => p + crypto.randomBytes(3).toString('hex').toUpperCase();
const pub = ({ password_hash, ...u }) => u;
const sign = (res, id) => res.cookie('token', jwt.sign({ id }, SECRET, { expiresIn: '7d' }), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 6048e5 });
const ledger = (c, uid, type, amt, note) => c.query('insert into ledger(user_id,type,amount,note) values($1,$2,$3,$4)', [uid, type, amt, note]);
const authLimit = rate({ windowMs: 15 * 60e3, max: 20, standardHeaders: true });
const auth = h(async (req, res, next) => {
  let id; try { ({ id } = jwt.verify(req.cookies.token, SECRET)); } catch { fail(401, 'Please sign in'); }
  const { rows: [u] } = await pool.query('select * from users where id=$1', [id]);
  if (!u || u.status !== 'active') fail(401, 'Please sign in'); req.user = u; next();
});
const admin = (req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Forbidden' });
const pw = z.string().min(8, 'Password must be at least 8 characters').max(100);

// ---- Auth
app.post('/api/auth/register', authLimit, h(async (req, res) => {
  const d = parse(z.object({ name: z.string().trim().min(2).max(60), phone: z.string().regex(/^01\d{9}$/, 'Enter a valid 11-digit mobile number'), password: pw, referral: z.string().max(20).optional() }), req.body);
  const ref = d.referral ? (await pool.query('select id from users where referral_code=$1', [d.referral.toUpperCase()])).rows[0] : null;
  try {
    const { rows: [u] } = await pool.query('insert into users(name,phone,password_hash,referral_code,referred_by) values($1,$2,$3,$4,$5) returning *',
      [d.name, d.phone, await bcrypt.hash(d.password, 12), crypto.randomBytes(4).toString('hex').toUpperCase(), ref ? ref.id : null]);
    sign(res, u.id); res.json(pub(u));
  } catch (e) { if (e.code === '23505') fail(409, 'This number is already registered'); throw e; }
}));
app.post('/api/auth/login', authLimit, h(async (req, res) => {
  const d = parse(z.object({ phone: z.string(), password: z.string() }), req.body);
  const { rows: [u] } = await pool.query('select * from users where phone=$1', [d.phone]);
  if (!u || !(await bcrypt.compare(d.password, u.password_hash))) fail(401, 'Phone or password is incorrect');
  if (u.status !== 'active') fail(403, 'Account is blocked'); sign(res, u.id); res.json(pub(u));
}));
app.post('/api/auth/logout', (req, res) => res.clearCookie('token').json({ ok: true }));
app.post('/api/auth/forgot', authLimit, h(async (req, res) => {
  const { phone } = parse(z.object({ phone: z.string() }), req.body);
  const { rows: [u] } = await pool.query('select id from users where phone=$1', [phone]);
  if (u) {
    const t = crypto.randomBytes(24).toString('hex');
    await pool.query("insert into password_resets(user_id,token_hash,expires_at) values($1,$2,now()+interval '30 minutes')", [u.id, crypto.createHash('sha256').update(t).digest('hex')]);
    console.log(`[reset] ${process.env.FRONTEND_ORIGIN}/login?reset=${t}  (connect an SMS/email provider to send this)`);
  }
  res.json({ ok: true });
}));
app.post('/api/auth/reset', authLimit, h(async (req, res) => {
  const d = parse(z.object({ token: z.string(), password: pw }), req.body);
  await tx(async c => {
    const { rows: [r] } = await c.query('select * from password_resets where token_hash=$1 and not used and expires_at>now() for update', [crypto.createHash('sha256').update(d.token).digest('hex')]);
    if (!r) fail(400, 'Reset link is invalid or expired');
    await c.query('update password_resets set used=true where id=$1', [r.id]);
    await c.query('update users set password_hash=$1 where id=$2', [await bcrypt.hash(d.password, 12), r.user_id]);
  });
  res.json({ ok: true });
}));

// ---- Profile
app.get('/api/me', auth, (req, res) => res.json(pub(req.user)));
app.patch('/api/me', auth, h(async (req, res) => {
  const d = parse(z.object({ name: z.string().trim().min(2).max(60).optional(), avatar: z.string().max(400000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, 'Invalid image').optional() }), req.body);
  const { rows: [u] } = await pool.query('update users set name=coalesce($1,name), avatar=coalesce($2,avatar) where id=$3 returning *', [d.name || null, d.avatar || null, req.user.id]);
  res.json(pub(u));
}));
app.post('/api/me/password', auth, h(async (req, res) => {
  const d = parse(z.object({ current: z.string().min(1, 'Enter your current password'), next: pw }), req.body);
  if (!(await bcrypt.compare(d.current, req.user.password_hash))) fail(400, 'Current password is incorrect');
  if (d.current === d.next) fail(400, 'New password must differ from the current one');
  await pool.query('update users set password_hash=$1 where id=$2', [await bcrypt.hash(d.next, 12), req.user.id]); res.json({ ok: true });
}));
app.get('/api/support', auth, h(async (req, res) => {
  const { rows } = await pool.query("select key,value from settings where key like 'support_%'");
  const m = Object.fromEntries(rows.map(r => [r.key, r.value])); res.json({ wa: m.support_wa, tg: m.support_tg, mail: m.support_email });
}));

// ---- Summary, products, orders
app.get('/api/summary', auth, h(async (req, res) => {
  const u = req.user, q = s => pool.query(s, [u.id]).then(r => r.rows[0]);
  const [inc, out, bonus] = await Promise.all([
    q('select coalesce(sum(p.amount),0) v from withdrawal_payments p join withdrawals w on w.id=p.withdrawal_id where w.user_id=$1'),
    q('select coalesce(sum(amount),0) v from orders where user_id=$1'),
    q("select coalesce(sum(amount),0) v from ledger where user_id=$1 and type='bonus'")]);
  res.json({ available: u.available_balance, buy: u.buy_balance, incoming: inc.v, outgoing: out.v, bonus: bonus.v });
}));
app.get('/api/history', auth, h(async (req, res) => res.json((await pool.query('select * from ledger where user_id=$1 order by id desc limit 100', [req.user.id])).rows)));
app.get('/api/products', auth, h(async (req, res) => res.json((await pool.query('select id,short_name,image_url,amount,reward_rate from products where active order by amount')).rows)));
app.post('/api/orders', auth, h(async (req, res) => {
  const { productId } = parse(z.object({ productId: z.number().int() }), req.body);
  res.json(await tx(async c => {
    const { rows: [p] } = await c.query('select * from products where id=$1 and active', [productId]); if (!p) fail(404, 'Product not available');
    const reward = Number((Number(p.amount) * Number(p.reward_rate) / 100).toFixed(2));
    await c.query('update users set buy_balance=buy_balance+$1, available_balance=available_balance+$2 where id=$3', [p.amount, reward, req.user.id]);
    const { rows: [o] } = await c.query('insert into orders(public_id,user_id,product_id,amount,reward) values($1,$2,$3,$4,$5) returning *', [pid('ORD'), req.user.id, p.id, p.amount, reward]);
    await ledger(c, req.user.id, 'purchase', p.amount, 'Purchase order ' + o.public_id);
    await ledger(c, req.user.id, 'bonus', reward, 'Bonus added'); return o;
  }));
}));

// ---- Wallets & withdrawals
app.get('/api/wallets', auth, h(async (req, res) => res.json((await pool.query('select * from wallets where user_id=$1 order by id', [req.user.id])).rows)));
app.post('/api/wallets', auth, h(async (req, res) => {
  const d = parse(z.object({ provider: z.enum(['bKash', 'Nagad', 'Rocket']), number: z.string().regex(/^01\d{9}$/, 'Enter a valid 11-digit number') }), req.body);
  try { res.json((await pool.query('insert into wallets(user_id,provider,number) values($1,$2,$3) returning *', [req.user.id, d.provider, d.number])).rows[0]); }
  catch (e) { if (e.code === '23505') fail(409, 'Wallet already added'); throw e; }
}));
app.patch('/api/wallets/:id/online', auth, h(async (req, res) => {
  const { online } = parse(z.object({ online: z.boolean() }), req.body);
  res.json(await tx(async c => {
    const { rows: [w] } = await c.query('update wallets set online=$1 where id=$2 and user_id=$3 returning *', [online, req.params.id, req.user.id]); if (!w) fail(404, 'Wallet not found');
    let wd = null;
    if (online) {
      const { rows: [u] } = await c.query('select buy_balance from users where id=$1 for update', [req.user.id]);
      if (Number(u.buy_balance) > 0) {
        await c.query('update users set buy_balance=0 where id=$1', [req.user.id]);
        wd = (await c.query("insert into withdrawals(public_id,user_id,wallet_id,kind,amount) values($1,$2,$3,'buy',$4) returning *", [pid('WD'), req.user.id, w.id, u.buy_balance])).rows[0];
        await ledger(c, req.user.id, 'buy_withdrawal', u.buy_balance, 'Buy balance sent to withdrawal');
      }
    }
    return { wallet: w, withdrawal: wd };
  }));
}));
app.get('/api/withdrawals', auth, h(async (req, res) => res.json((await pool.query(
  `select w.*, wl.provider, wl.number, coalesce((select json_agg(json_build_object('amount',p.amount,'at',p.created_at) order by p.id desc) from withdrawal_payments p where p.withdrawal_id=w.id),'[]') payments
   from withdrawals w join wallets wl on wl.id=w.wallet_id where w.user_id=$1 order by w.id desc`, [req.user.id])).rows)));
app.post('/api/withdrawals', auth, h(async (req, res) => {
  const d = parse(z.object({ walletId: z.number().int(), amount: z.number().min(200, 'Minimum withdrawal is 200 BDT') }), req.body);
  res.json(await tx(async c => {
    const { rows: [w] } = await c.query('select id from wallets where id=$1 and user_id=$2', [d.walletId, req.user.id]); if (!w) fail(404, 'Wallet not found');
    const { rows: [u] } = await c.query('select available_balance from users where id=$1 for update', [req.user.id]);
    if (d.amount > Number(u.available_balance)) fail(400, 'Amount exceeds your available balance');
    await c.query('update users set available_balance=available_balance-$1 where id=$2', [d.amount, req.user.id]);
    const { rows: [r] } = await c.query("insert into withdrawals(public_id,user_id,wallet_id,kind,amount) values($1,$2,$3,'available',$4) returning *", [pid('WD'), req.user.id, w.id, d.amount]);
    await ledger(c, req.user.id, 'withdrawal', d.amount, 'Withdrawal requested ' + r.public_id); return r;
  }));
}));

// ---- Admin (role checked on the server for every route)
const A = [auth, admin];
app.get('/api/admin/stats', ...A, h(async (req, res) => res.json((await pool.query(
  "select (select count(*)::int from users where role='user') users,(select count(*)::int from orders) orders,(select count(*)::int from withdrawals where status in ('processing','partial')) pending_withdrawals")).rows[0])));
app.get('/api/admin/users', ...A, h(async (req, res) => res.json((await pool.query("select id,name,phone,status,available_balance,buy_balance from users where role='user' order by id desc limit 200")).rows)));
app.post('/api/admin/users/:id/deposit', ...A, h(async (req, res) => {
  const { amount } = parse(z.object({ amount: z.number().positive() }), req.body);
  await tx(async c => { const r = await c.query("update users set available_balance=available_balance+$1 where id=$2 and role='user'", [amount, req.params.id]); if (!r.rowCount) fail(404, 'User not found'); await ledger(c, req.params.id, 'deposit', amount, 'Deposit'); });
  res.json({ ok: true });
}));
app.get('/api/admin/orders', ...A, h(async (req, res) => res.json((await pool.query('select o.*,p.short_name,u.phone from orders o join products p on p.id=o.product_id join users u on u.id=o.user_id order by o.id desc limit 200')).rows)));
app.get('/api/admin/products', ...A, h(async (req, res) => res.json((await pool.query('select * from products order by id')).rows)));
const prod = z.object({ short_name: z.string().trim().min(1).max(40), amount: z.number().positive(), reward_rate: z.number().min(0).max(100), image_url: z.string().max(400000).regex(/^(data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+|https:\/\/.+)$/).nullable().optional(), active: z.boolean().optional() });
app.post('/api/admin/products', ...A, h(async (req, res) => { const d = parse(prod, req.body); res.json((await pool.query('insert into products(short_name,amount,reward_rate,image_url,active) values($1,$2,$3,$4,coalesce($5,true)) returning *', [d.short_name, d.amount, d.reward_rate, d.image_url || null, d.active])).rows[0]); }));
app.patch('/api/admin/products/:id', ...A, h(async (req, res) => { const d = parse(prod.partial(), req.body); res.json((await pool.query('update products set short_name=coalesce($1,short_name),amount=coalesce($2,amount),reward_rate=coalesce($3,reward_rate),image_url=coalesce($4,image_url),active=coalesce($5,active) where id=$6 returning *', [d.short_name, d.amount, d.reward_rate, d.image_url, d.active, req.params.id])).rows[0]); }));
app.get('/api/admin/withdrawals', ...A, h(async (req, res) => res.json((await pool.query('select w.*,u.phone,wl.provider,wl.number from withdrawals w join users u on u.id=w.user_id join wallets wl on wl.id=w.wallet_id order by w.id desc limit 200')).rows)));
app.post('/api/admin/withdrawals/:id/complete', ...A, h(async (req, res) => {
  const { amount } = parse(z.object({ amount: z.number().positive() }), req.body);
  await tx(async c => {
    const { rows: [w] } = await c.query("update withdrawals set completed=completed+$1, status=case when completed+$1>=amount then 'paid' else 'partial' end where id=$2 and status in ('processing','partial') and amount-completed>=$1 returning *", [amount, req.params.id]);
    if (!w) fail(400, 'Invalid amount or withdrawal already closed');
    await c.query('insert into withdrawal_payments(withdrawal_id,amount) values($1,$2)', [w.id, amount]); await ledger(c, w.user_id, 'payment', amount, 'Payment completed ' + w.public_id);
  });
  res.json({ ok: true });
}));
app.post('/api/admin/withdrawals/:id/reject', ...A, h(async (req, res) => {
  await tx(async c => {
    const { rows: [w] } = await c.query("update withdrawals set status='rejected' where id=$1 and status in ('processing','partial') returning *", [req.params.id]); if (!w) fail(400, 'Withdrawal already closed');
    const left = Number(w.amount) - Number(w.completed), col = w.kind === 'buy' ? 'buy_balance' : 'available_balance';
    await c.query(`update users set ${col}=${col}+$1 where id=$2`, [left, w.user_id]); await ledger(c, w.user_id, 'refund', left, 'Withdrawal rejected ' + w.public_id);
  });
  res.json({ ok: true });
}));
app.get('/api/admin/settings', ...A, h(async (req, res) => res.json((await pool.query('select key,value from settings')).rows)));
app.put('/api/admin/settings', ...A, h(async (req, res) => {
  const d = parse(z.object({ support_wa: z.string().max(40), support_tg: z.string().max(60), support_email: z.string().max(100) }), req.body);
  for (const [k, v] of Object.entries(d)) await pool.query('insert into settings(key,value) values($1,$2) on conflict(key) do update set value=$2', [k, v]);
  res.json({ ok: true });
}));
app.listen(process.env.PORT || 4000, () => console.log('API on :' + (process.env.PORT || 4000)));
