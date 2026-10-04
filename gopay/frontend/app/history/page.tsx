'use client';
import Shell from '@/components/Shell';
import { tk, useApi } from '@/lib/api';
export default function History() {
  const { d } = useApi<any[]>('/history');
  return <Shell title="History" back="/">{d?.length === 0 && <div className="card text-neutral-500">No activity yet.</div>}
    {d?.map(h => <div key={h.id} className="card flex justify-between text-sm"><span>{h.note}</span><span className="text-neutral-500">{tk(h.amount)} · {new Date(h.created_at).toLocaleDateString()}</span></div>)}</Shell>;
}
