'use client';
import Link from 'next/link';
import { useState } from 'react';
import Shell, { Ic } from '@/components/Shell';
import { api, useApi } from '@/lib/api';
export default function Profile() {
  const { d, reload } = useApi('/me'); const [msg, setMsg] = useState('');
  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setMsg('Choose a JPG, PNG or WebP image.');
    if (f.size > 5 * 1048576) return setMsg('Image must be under 5 MB.');
    const img = new Image(); const u = URL.createObjectURL(f);
    img.onload = async () => {
      const c = document.createElement('canvas'), z = Math.min(img.width, img.height); c.width = c.height = 256;
      c.getContext('2d')!.drawImage(img, (img.width - z) / 2, (img.height - z) / 2, z, z, 0, 0, 256, 256); URL.revokeObjectURL(u);
      try { await api('/me', { method: 'PATCH', body: { avatar: c.toDataURL('image/jpeg', 0.85) } }); setMsg('Photo updated'); reload(); } catch (x: any) { setMsg(x.message); }
    };
    img.src = u;
  }
  const row = (h: string, t: string) => <Link href={h} className="flex items-center justify-between border-b border-soft py-3 last:border-0">{t}<span className="text-neutral-400">›</span></Link>;
  return (
    <Shell title="Profile">
      <div className="card grid justify-items-center gap-1 text-center">
        <div className="relative h-24 w-24"><div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-gold to-pri text-white shadow">{d?.avatar ? <img src={d.avatar} alt="Profile photo" className="h-full w-full object-cover" /> : <Ic n="user" c="h-12 w-12" />}</div>
          <label className="absolute -bottom-1 -right-1 grid h-9 w-9 cursor-pointer place-items-center rounded-full border-2 border-white bg-pri text-white" aria-label="Change profile photo">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth={1.8}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick} /></label></div>
        <b className="text-lg">{d?.name}</b><div className="text-sm text-neutral-500">User ID {d?.id} · {d?.phone}</div><span className="badge">{d?.status === 'active' ? 'Active' : d?.status}</span>
        <div className="text-xs text-neutral-500">Referral code: <b>{d?.referral_code}</b></div>{msg && <p role="status" className="err">{msg}</p>}
      </div>
      <div className="card py-1">{row('/withdraw', 'Withdraw')}{row('/history', 'Payment records')}{row('/profile/password', 'Change password')}
        <button onClick={async () => { await api('/auth/logout', { method: 'POST' }); location.href = '/login'; }} className="w-full py-3 text-left">Logout</button></div>
    </Shell>
  );
}
