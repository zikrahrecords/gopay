'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
export default function Login() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [f, setF] = useState({ name: '', phone: '', password: '', referral: '', token: '' });
  const [err, setErr] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { const t = new URLSearchParams(location.search).get('reset'); if (t) { setF(x => ({ ...x, token: t })); setMode('reset'); } }, []);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setMsg(''); setBusy(true);
    try {
      if (mode === 'login') await api('/auth/login', { method: 'POST', body: { phone: f.phone, password: f.password } });
      if (mode === 'register') await api('/auth/register', { method: 'POST', body: { name: f.name, phone: f.phone, password: f.password, referral: f.referral || undefined } });
      if (mode === 'login' || mode === 'register') return void (location.href = '/');
      if (mode === 'forgot') { await api('/auth/forgot', { method: 'POST', body: { phone: f.phone } }); setMsg('If this number exists, a reset link has been sent.'); }
      if (mode === 'reset') { await api('/auth/reset', { method: 'POST', body: { token: f.token, password: f.password } }); setMsg('Password updated. Please sign in.'); setMode('login'); }
    } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <div className="mx-auto grid min-h-screen max-w-md content-center gap-4 p-5">
      <div className="text-center"><div className="text-3xl font-bold text-pri">GOPAY <span className="rounded-lg bg-pri px-2 text-lg text-white">BDT</span></div></div>
      <form onSubmit={submit} className="card grid gap-3">
        <b className="text-lg">{{ login: 'Sign in', register: 'Create account', forgot: 'Forgot password', reset: 'Set new password' }[mode]}</b>
        {mode === 'register' && <input className="inp" placeholder="Full name" value={f.name} onChange={set('name')} required />}
        {mode !== 'reset' && <input className="inp" inputMode="numeric" placeholder="Mobile number (01XXXXXXXXX)" value={f.phone} onChange={set('phone')} required />}
        {mode !== 'forgot' && <input className="inp" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Password" value={f.password} onChange={set('password')} required />}
        {mode === 'register' && <input className="inp" placeholder="Referral code (optional)" value={f.referral} onChange={set('referral')} />}
        {err && <p className="err" role="alert">{err}</p>}{msg && <p className="text-sm text-green-700">{msg}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Please wait...' : 'Continue'}</button>
        <div className="flex justify-between text-sm text-pri">
          <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create account' : 'Back to sign in'}</button>
          {mode === 'login' && <button type="button" onClick={() => setMode('forgot')}>Forgot password?</button>}
        </div>
      </form>
    </div>
  );
}
