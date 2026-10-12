import '../globals.css';

import type { Metadata } from 'next';
import { Geist, Geist_Mono, Noto_Sans } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { Header } from '@/components/layout/header';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const notoSans = Noto_Sans({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export async function generateMetadata({
  params,
}: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Layout' });

  return (
    <html
      lang={locale}
      suppressHydrationWarning
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
        <ThemeProvider>
          <NextIntlClientProvider>
            <a
              href='#content'
              className='sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground'
            >
              {t('skipToContent')}
            </a>
            <Header />
            <main id='content' className='flex-1'>
              {children}
            </main>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
