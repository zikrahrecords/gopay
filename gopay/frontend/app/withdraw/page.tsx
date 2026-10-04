'use client';
import { useState } from 'react';
import Shell from '@/components/Shell';
import { api, tk, useApi } from '@/lib/api';
export default function Withdraw() {
  const w = useApi<any[]>('/wallets'), l = useApi<any[]>('/withdrawals'), s = useApi('/summary');
  const [wid, setWid] = useState(''); const [amt, setAmt] = useState(''); const [err, setErr] = useState('');
  async function go() { setErr(''); try { await api('/withdrawals', { method: 'POST', body: { walletId: Number(wid || w.d?.[0]?.id), amount: Number(amt) } }); setAmt(''); l.reload(); s.reload(); } catch (x: any) { setErr(x.message); } }
  const col = (st: string) => st === 'paid' ? 'badge' : 'badge !bg-amber-100';
  return (
    <Shell title="Withdrawal" back="/profile">
      <div className="rounded-3xl bg-gradient-to-br from-pri to-[#8f0a20] p-4 text-white"><small>Available balance</small><div className="text-3xl font-bold text-[#ffd24d]">{tk(s.d?.available ?? 0)}</div></div>
      {w.d?.length ? <div className="card grid gap-2">
        <select className="inp" value={wid} onChange={e => setWid(e.target.value)}>{w.d.map(x => <option key={x.id} value={x.id}>{x.provider} {x.number}</option>)}</select>
        <input className="inp" type="number" placeholder="Amount (min 200)" value={amt} onChange={e => setAmt(e.target.value)} />
        {err && <p className="err" role="alert">{err}</p>}<button className="btn" onClick={go}>Withdraw available balance</button></div>
        : <div className="card">Add a wallet first in the Wallet tab.</div>}
      {l.d?.map(x => <div key={x.id} className="card"><div className="flex justify-between"><b>{x.public_id} · {x.kind === 'buy' ? 'Buy balance' : 'Available'}</b><span className={col(x.status)}>{x.status}</span></div>
        <div className="text-sm text-neutral-500">{x.provider} {x.number}</div>
        <div className="mt-1 grid grid-cols-3 text-sm"><div>Requested<br /><b>{tk(x.amount)}</b></div><div>Completed<br /><b className="text-emerald-700">{tk(x.completed)}</b></div><div>Processing<br /><b>{tk(x.status === 'rejected' ? 0 : x.amount - x.completed)}</b></div></div>
        {x.payments.map((p: any, i: number) => <div key={i} className="mt-1 text-xs text-neutral-500">Paid {tk(p.amount)} · {new Date(p.at).toLocaleDateString()}</div>)}</div>)}
    </Shell>
  );
}
