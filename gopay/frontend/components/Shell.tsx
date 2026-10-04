'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
const P: Record<string, JSX.Element> = {
  home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></>,
  card: <><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M2 10h20M6 15h4" /></>,
  gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v9h14v-9M12 8v13" /><path d="M12 8c-1-4-6-4-5-1 .5 1.5 3 1 5 1zM12 8c1-4 6-4 5-1-.5 1.5-3 1-5 1z" /></>,
  wallet: <><path d="M3 7a2 2 0 0 1 2-2h13v4" /><path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z" /><circle cx="16.5" cy="14.5" r="1" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  headset: <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="13" width="4" height="7" rx="1.5" /><rect x="17" y="13" width="4" height="7" rx="1.5" /><path d="M19 20c0 1.5-2 2-5 2" /></>,
  x: <path d="M6 6l12 12M18 6L6 18" />,
};
export const Ic = ({ n, c = 'h-6 w-6' }: { n: string; c?: string }) =>
  <svg viewBox="0 0 24 24" className={`${c} fill-none stroke-current`} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{P[n]}</svg>;
type Sup = { wa: string; tg: string; mail: string };
export default function Shell({ title, back, children }: { title: string; back?: string; children: React.ReactNode }) {
  const path = usePathname(); const [sup, setSup] = useState<Sup | null>(null);
  const open = async () => setSup(await api<Sup>('/support').catch(() => ({ wa: '', tg: '', mail: '' })));
  const tab = (href: string, n: string, l: string) =>
    <Link href={href} className={`grid justify-items-center text-xs ${path === href ? 'font-semibold text-pri' : 'text-neutral-500'}`}><Ic n={n} />{l}</Link>;
  return (
    <div className="mx-auto min-h-screen max-w-md pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-2 rounded-b-3xl bg-gradient-to-br from-pri to-[#e5391f] px-4 py-3.5 text-white">
        {back && <Link href={back} aria-label="Back" className="text-2xl">‹</Link>}
        <h1 className="flex-1 text-lg font-semibold">{title}</h1>
        <button onClick={open} aria-label="Support" className="p-1"><Ic n="headset" /></button>
      </header>
      <main className="grid gap-3 p-3.5">{children}</main>
      <nav className="fixed bottom-0 left-1/2 z-20 grid w-full max-w-md -translate-x-1/2 grid-cols-5 items-end rounded-t-3xl bg-white px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_18px_rgba(120,40,20,.14)]">
        {tab('/', 'home', 'Home')}{tab('/buy', 'card', 'Buy')}
        <button onClick={open} aria-label="Deposit" className="relative -mt-8 mx-auto grid h-16 w-16 place-items-center rounded-full border-4 border-[#fff6e6] bg-gradient-to-br from-gold to-pri text-white shadow-lg"><Ic n="gift" c="h-7 w-7" /></button>
        {tab('/wallet', 'wallet', 'Wallet')}{tab('/profile', 'user', 'Profile')}
      </nav>
      {sup && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/45" onClick={() => setSup(null)}>
          <div role="dialog" aria-label="Support" className="grid w-full max-w-md gap-2 rounded-t-3xl bg-white p-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between"><b>Support and deposits</b><button onClick={() => setSup(null)} aria-label="Close"><Ic n="x" /></button></div>
            <p className="text-sm text-neutral-600">To deposit, contact support with your User ID and the amount.</p>
            {sup.wa && <a className="btn" href={`https://wa.me/${sup.wa}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
            {sup.tg && <a className="btn-o" href={`https://t.me/${sup.tg}`} target="_blank" rel="noopener noreferrer">Telegram</a>}
            {sup.mail && <a className="btn-o" href={`mailto:${sup.mail}`}>Email</a>}
            {!sup.wa && !sup.tg && !sup.mail && <p className="text-sm">Support contacts are not set yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
