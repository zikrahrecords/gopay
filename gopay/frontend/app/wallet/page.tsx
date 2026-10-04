'use client';
import { useState } from 'react';
import Shell from '@/components/Shell';
import { api, useApi } from '@/lib/api';
export default function Wallet() {
  const { d, reload } = useApi<any[]>('/wallets'); const [p, setP] = useState('bKash'); const [n, setN] = useState(''); const [err, setErr] = useState('');
  const run = async (fn: () => Promise<any>) => { setErr(''); try { await fn(); reload(); } catch (x: any) { setErr(x.message); } };
  return (
    <Shell title="Wallet">
      <div className="card grid gap-2"><b>Add wallet</b>
        <select className="inp" value={p} onChange={e => setP(e.target.value)}><option>bKash</option><option>Nagad</option><option>Rocket</option></select>
        <input className="inp" inputMode="numeric" placeholder="01XXXXXXXXX" value={n} onChange={e => setN(e.target.value)} />
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn" onClick={() => run(async () => { await api('/wallets', { method: 'POST', body: { provider: p, number: n } }); setN(''); })}>Add wallet</button></div>
      {d?.map(w => <div key={w.id} className="card flex items-center justify-between"><div><b>{w.provider}</b><div className="text-sm text-neutral-500">{w.number}</div></div>
        <button className={w.online ? 'rounded-xl bg-pri px-4 py-2 font-semibold text-white' : 'rounded-xl bg-soft px-4 py-2 font-semibold text-pri'} onClick={() => run(() => api(`/wallets/${w.id}/online`, { method: 'PATCH', body: { online: !w.online } }))}>{w.online ? 'Online' : 'Offline'}</button></div>)}
      <div className="card text-sm text-neutral-600">When a number goes online, your full buy balance is sent to it as a withdrawal request.</div>
    </Shell>
  );
}
