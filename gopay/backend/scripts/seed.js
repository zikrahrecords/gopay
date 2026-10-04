require('dotenv').config();
const bcrypt = require('bcryptjs'), crypto = require('crypto'), { pool } = require('../src/db');
(async () => {
  const { ADMIN_PHONE: p, ADMIN_PASSWORD: pw } = process.env;
  if (!p || !pw || pw.length < 10) throw new Error('Set ADMIN_PHONE and a strong ADMIN_PASSWORD in .env');
  await pool.query(`insert into users(name,phone,password_hash,role,referral_code) values('Admin',$1,$2,'admin',$3) on conflict(phone) do nothing`,
    [p, await bcrypt.hash(pw, 12), crypto.randomBytes(4).toString('hex').toUpperCase()]);
  const { rows } = await pool.query('select count(*)::int n from products');
  if (!rows[0].n) for (const [n, a, r] of [['Earbuds', 100, 3], ['Smart watch', 144, 3], ['Power bank', 150, 3], ['Headphone', 200, 3.5]])
    await pool.query('insert into products(short_name,amount,reward_rate) values($1,$2,$3)', [n, a, r]);
  console.log('Seed complete'); await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
