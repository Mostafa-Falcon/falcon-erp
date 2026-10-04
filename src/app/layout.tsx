import type { Metadata, Viewport } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { DirectionProvider } from '@radix-ui/react-direction';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-cairo',
});

/**
 * Applies the persisted theme before first paint so there is no flash of the
 * wrong colour scheme. Exported so the login screen and the app shell can reuse
 * the exact same boot logic instead of duplicating the inline script.
 */
export const themeBootScript = `(function(){try{var t=localStorage.getItem('falcon_theme');var d=t==='dark';var e=document.documentElement;e.classList.toggle('dark',d);e.setAttribute('data-theme',d?'dark':'light');}catch(e){}})();`;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#090d16' },
  ],
};

export const metadata: Metadata = {
  title: 'ERP Systems | نظام الإدارة والمحاسبة المتكامل',
  description: 'منظومة إدارة الموارد الشاملة - تعمل بدون إنترنت وسحابياً',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${cairo.className}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-[100dvh] h-[100dvh] w-full overflow-hidden font-sans antialiased text-foreground bg-app">
        <DirectionProvider dir="rtl">
          <div className="min-h-[100dvh] h-[100dvh] w-full overflow-hidden flex flex-col font-sans">
            {children}
          </div>
          <Toaster />
        </DirectionProvider>
      </body>
    </html>
  );
}