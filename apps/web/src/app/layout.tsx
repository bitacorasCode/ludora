import type { Metadata } from 'next';
import { Geist, Geist_Mono, Noto_Sans } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';

import './globals.css';

const notoSans = Noto_Sans({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Ludora',
  description: 'Una plataforma para descubrir y jugar.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang='es'
      className={cn(
        'h-full',
        'antialiased',
        geistSans.variable,
        geistMono.variable,
        'font-sans',
        notoSans.variable,
      )}
    >
      <body className='min-h-full flex flex-col'>
        <a
          href='#contenido'
          className='sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground'
        >
          Saltar al contenido
        </a>
        <Header />
        <main id='contenido' className='flex-1'>
          {children}
        </main>
      </body>
    </html>
  );
}
