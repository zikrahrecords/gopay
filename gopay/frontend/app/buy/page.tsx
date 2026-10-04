'use client';
import { useState } from 'react';
import Shell, { Ic } from '@/components/Shell';
import { api, tk, useApi } from '@/lib/api';
export default function Buy() {
  const { d, e, reload } = useApi<any[]>('/products'); const [msg, setMsg] = useState('');
  async function claim(p: any) {
    if (!confirm(`Claim this order for ${p.amount} BDT?`)) return;
    try { await api('/orders', { method: 'POST', body: { productId: p.id } }); setMsg('Order claimed'); reload(); } catch (x: any) { setMsg(x.message); }
  }
  return (
    <Shell title="Buy">
      <div className="card bg-gradient-to-br from-soft to-white"><b className="text-lg">Buy Platform Balance</b><div className="text-sm text-neutral-600">Choose amount and wallet.</div><div className="mt-2 grid grid-cols-2 gap-2"><span className="rounded-full bg-pri py-2 text-center font-semibold text-white">BDT</span><span className="rounded-full bg-white py-2 text-center font-semibold">USDT</span></div></div>
      {(e || msg) && <p role="status" className="err">{e || msg}</p>}
      {d?.map(p => (
        <div key={p.id} className="card">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 flex-none place-items-center overflow-hidden rounded-xl bg-soft text-pri">{p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : <Ic n="card" />}</div>
            <div className="flex-1"><div className="text-xl font-bold">{Number(p.amount).toFixed(2)} BDT</div><div className="text-sm text-neutral-500">{p.short_name}</div></div>
          </div>
          <div className="mt-2.5 grid grid-cols-[1fr_1fr_1.3fr] items-center gap-2 rounded-xl bg-[#fff6e6] p-2 text-center">
            <div><b className="text-amber-700">+{(p.amount * p.reward_rate / 100).toFixed(2)}</b><div className="text-[11px] text-neutral-500">Reward</div></div>
            <div><b>{Number(p.reward_rate).toFixed(2)}%</b><div className="text-[11px] text-neutral-500">Reward rate</div></div>
            <button className="btn !px-2 !py-3 text-xs" onClick={() => claim(p)}>Claim purchase order</button>
          </div>
        </div>))}
    </Shell>
  );
}
