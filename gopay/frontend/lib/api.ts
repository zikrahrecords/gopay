'use client';
import { useCallback, useEffect, useState } from 'react';
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export async function api<T = any>(path: string, o: { method?: string; body?: unknown } = {}): Promise<T> {
  const r = await fetch(BASE + '/api' + path, { method: o.method || 'GET', credentials: 'include',
    headers: o.body ? { 'Content-Type': 'application/json' } : {}, body: o.body ? JSON.stringify(o.body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'Request failed'), { status: r.status });
  return j;
}
export function useApi<T = any>(path: string) {
  const [d, setD] = useState<T | null>(null); const [e, setE] = useState('');
  const load = useCallback(() => api<T>(path).then(setD).catch(x => { if (x.status === 401) location.href = '/login'; else setE(x.message); }), [path]);
  useEffect(() => { load(); }, [load]);
  return { d, e, reload: load };
}
export const tk = (n: number | string) => '৳' + Number(n).toLocaleString();
