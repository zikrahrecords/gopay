import './globals.css';
export const metadata = { title: 'GOPAY BDT' };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#c8102e' };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
