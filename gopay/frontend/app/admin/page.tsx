'use client';
import { useState } from 'react';
import { api, tk, useApi } from '@/lib/api';
const TABS = ['Overview', 'Products', 'Users', 'Withdrawals', 'Settings'];
export default function Admin() {
  const me = useApi('/me'); const [tab, setTab] = useState('Overview'); const [msg, setMsg] = useState('');
  if (!me.d) return <p className="p-6">Loading...</p>;
  if (me.d.role !== 'admin') return <p className="p-6">Access denied.</p>;
  return (
    <div className="mx-auto min-h-screen max-w-3xl p-3.5">
      <div className="mb-3 flex items-center justify-between rounded-2xl bg-pri p-3 text-white"><b>GOPAY Admin</b><a href="/" className="text-sm underline">Exit</a></div>
      <div className="mb-3 flex gap-2 overflow-x-auto">{TABS.map(t => <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm ${tab === t ? 'bg-pri text-white' : 'bg-white'}`}>{t}</button>)}</div>
      {msg && <p role="status" className="err mb-2">{msg}</p>}
      {tab === 'Overview' && <Overview />}{tab === 'Products' && <Products say={setMsg} />}{tab === 'Users' && <Users say={setMsg} />}{tab === 'Withdrawals' && <Withdrawals say={setMsg} />}{tab === 'Settings' && <Settings say={setMsg} />}
    </div>
  );
}
function Overview() { const { d } = useApi('/admin/stats'); return <div className="grid grid-cols-3 gap-3">{[['Users', d?.users], ['Orders', d?.orders], ['Pending withdrawals', d?.pending_withdrawals]].map(([l, v]) => <div key={l as string} className="card"><div className="text-xs text-neutral-500">{l}</div><div className="text-2xl font-bold">{v ?? '-'}</div></div>)}</div>; }
function Products({ say }: any) {
  const { d, reload } = useApi<any[]>('/admin/products'); const [f, setF] = useState({ short_name: '', amount: '', reward_rate: '3', image_url: '' });
  function img(e: any) { const file = e.target.files[0]; if (!file) return; if (file.size > 250000) return say('Image must be under 250 KB'); const r = new FileReader(); r.onload = () => setF({ ...f, image_url: r.result as string }); r.readAsDataURL(file); }
  async function add() { try { await api('/admin/products', { method: 'POST', body: { short_name: f.short_name, amount: Number(f.amount), reward_rate: Number(f.reward_rate), image_url: f.image_url || null } }); say('Product added'); reload(); } catch (x: any) { say(x.message); } }
  return <div className="grid gap-3"><div className="card grid gap-2"><b>Add product</b><input type="file" accept="image/*" onChange={img} /><input className="inp" placeholder="Short name" value={f.short_name} onChange={e => setF({ ...f, short_name: e.target.value })} />
    <input className="inp" type="number" placeholder="Amount (BDT)" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /><input className="inp" type="number" step="0.01" placeholder="Reward rate %" value={f.reward_rate} onChange={e => setF({ ...f, reward_rate: e.target.value })} /><button className="btn" onClick={add}>Save product</button></div>
    {d?.map(p => <div key={p.id} className="card flex justify-between"><span>{p.short_name} · {tk(p.amount)} · {p.reward_rate}%</span><button className="text-pri" onClick={async () => { await api('/admin/products/' + p.id, { method: 'PATCH', body: { active: !p.active } }); reload(); }}>{p.active ? 'Hide' : 'Show'}</button></div>)}</div>;
}
function Users({ say }: any) {
  const { d } = useApi<any[]>('/admin/users'); const [amt, setAmt] = useState<Record<number, string>>({});
  return <div className="grid gap-2">{d?.map(u => <div key={u.id} className="card"><b>{u.name}</b> <span className="text-sm text-neutral-500">#{u.id} · {u.phone}</span><div className="text-sm">Available {tk(u.available_balance)} · Buy {tk(u.buy_balance)}</div>
    <div className="mt-2 flex gap-2"><input className="inp" type="number" placeholder="Deposit amount" value={amt[u.id] || ''} onChange={e => setAmt({ ...amt, [u.id]: e.target.value })} /><button className="btn !w-auto" onClick={async () => { try { await api(`/admin/users/${u.id}/deposit`, { method: 'POST', body: { amount: Number(amt[u.id]) } }); say('Deposit recorded'); } catch (x: any) { say(x.message); } }}>Deposit</button></div></div>)}</div>;
}
function Withdrawals({ say }: any) {
  const { d, reload } = useApi<any[]>('/admin/withdrawals'); const [amt, setAmt] = useState<Record<number, string>>({});
  const act = async (fn: () => Promise<any>) => { try { await fn(); say('Done'); reload(); } catch (x: any) { say(x.message); } };
  return <div className="grid gap-2">{d?.map(w => { const left = w.amount - w.completed; return <div key={w.id} className="card"><div className="flex justify-between"><b>{w.public_id} · {w.kind}</b><span className="badge">{w.status}</span></div>
    <div className="text-sm text-neutral-500">{w.phone} → {w.provider} {w.number}</div><div className="mt-1 grid grid-cols-3 text-sm"><div>Requested<br /><b>{tk(w.amount)}</b></div><div>Completed<br /><b>{tk(w.completed)}</b></div><div>Processing<br /><b>{tk(w.status === 'rejected' ? 0 : left)}</b></div></div>
    {(w.status === 'processing' || w.status === 'partial') && <div className="mt-2 flex gap-2"><input className="inp" type="number" placeholder={`Up to ${left}`} value={amt[w.id] || ''} onChange={e => setAmt({ ...amt, [w.id]: e.target.value })} />
      <button className="btn !w-auto" onClick={() => act(() => api(`/admin/withdrawals/${w.id}/complete`, { method: 'POST', body: { amount: Number(amt[w.id]) } }))}>Complete</button>
      <button className="btn-o !w-auto" onClick={() => confirm('Reject and refund the remaining amount?') && act(() => api(`/admin/withdrawals/${w.id}/reject`, { method: 'POST' }))}>Reject</button></div>}</div>; })}</div>;
}
function Settings({ say }: any) {
  const { d } = useApi<any[]>('/admin/settings'); const [f, setF] = useState<Record<string, string> | null>(null);
  const v = f || Object.fromEntries((d || []).map(r => [r.key, r.value]));
  const fld = (k: string, l: string) => <label className="grid gap-1 text-sm">{l}<input className="inp" value={v[k] || ''} onChange={e => setF({ ...v, [k]: e.target.value })} /></label>;
  return <div className="card grid gap-2"><b>Support contacts</b>{fld('support_wa', 'WhatsApp number (e.g. 8801XXXXXXXXX)')}{fld('support_tg', 'Telegram username')}{fld('support_email', 'Support email')}
    <button className="btn" onClick={async () => { try { await api('/admin/settings', { method: 'PUT', body: { support_wa: v.support_wa || '', support_tg: v.support_tg || '', support_email: v.support_email || '' } }); say('Saved'); } catch (x: any) { say(x.message); } }}>Save</button></div>;
}
