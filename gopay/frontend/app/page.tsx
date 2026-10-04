'use client';
import Link from 'next/link';
import Shell, { Ic } from '@/components/Shell';
import { tk, useApi } from '@/lib/api';
const Q = [['/buy', 'card', 'Buy', 'bg-sky-100 text-sky-800'], ['/wallet', 'wallet', 'Wallet', 'bg-violet-100 text-violet-800'],
  ['/withdraw', 'wallet', 'Withdraw', 'bg-rose-100 text-rose-800'], ['/history', 'gift', 'History', 'bg-amber-100 text-amber-800']];
export default function Home() {
  const { d, e } = useApi('/summary');
  return (
    <Shell title="GOPAY BDT">
      {e && <p className="err">{e}</p>}
      <div className="rounded-3xl bg-gradient-to-br from-pri to-[#8f0a20] p-4 text-white"><small>Available balance</small><div className="text-4xl font-bold text-[#ffd24d]">{tk(d?.available ?? 0)}</div><small>Bonus {tk(d?.bonus ?? 0)}</small></div>
      <div className="card flex items-center justify-between bg-gradient-to-br from-[#a86f00] via-gold to-[#ffcf6b]"><div><small>Buy balance</small><div className="text-3xl font-bold">{tk(d?.buy ?? 0)}</div></div><Link href="/history" className="badge bg-white">History</Link></div>
      <div className="grid grid-cols-2 gap-3"><div className="card bg-emerald-50"><small>Incoming</small><div className="text-lg font-bold text-emerald-700">{tk(d?.incoming ?? 0)}</div></div><div className="card bg-rose-50"><small>Outgoing</small><div className="text-lg font-bold text-rose-700">{tk(d?.outgoing ?? 0)}</div></div></div>
      <div className="card grid grid-cols-4 gap-2 text-center text-xs">{Q.map(([h, i, l, c]) => <Link key={h} href={h}><span className={`mx-auto mb-1 grid h-12 w-12 place-items-center rounded-2xl ${c}`}><Ic n={i} /></span>{l}</Link>)}</div>
    </Shell>
  );
}
