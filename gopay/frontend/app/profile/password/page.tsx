'use client';
import { useState } from 'react';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';
export default function Password() {
  const [v, setV] = useState({ cur: '', nw: '', cf: '' }); const [e, setE] = useState<Record<string, string>>({}); const [ok, setOk] = useState('');
  async function save() {
    const x: Record<string, string> = {};
    if (!v.cur) x.cur = 'Enter your current password.';
    if (!v.nw) x.nw = 'Enter a new password.'; else if (v.nw.length < 8) x.nw = 'Use at least 8 characters.'; else if (v.nw === v.cur) x.nw = 'New password must differ from the current one.';
    if (!v.cf) x.cf = 'Confirm your new password.'; else if (v.cf !== v.nw) x.cf = 'Passwords do not match.';
    setE(x); setOk(''); if (Object.keys(x).length) return;
    try { await api('/me/password', { method: 'POST', body: { current: v.cur, next: v.nw } }); setOk('Password updated'); setV({ cur: '', nw: '', cf: '' }); } catch (r: any) { setE({ cur: r.message }); }
  }
  const f = (k: 'cur' | 'nw' | 'cf', l: string, ac: string) => <label className="grid gap-1 text-sm text-neutral-600">{l}<input className="inp" type="password" autoComplete={ac} value={v[k]} onChange={ev => setV({ ...v, [k]: ev.target.value })} />{e[k] && <span className="err" role="alert">{e[k]}</span>}</label>;
  return <Shell title="Change password" back="/profile"><div className="card grid gap-3">{f('cur', 'Current password', 'current-password')}{f('nw', 'New password', 'new-password')}{f('cf', 'Confirm new password', 'new-password')}{ok && <p className="text-green-700">{ok}</p>}<button className="btn" onClick={save}>Update password</button></div></Shell>;
}
