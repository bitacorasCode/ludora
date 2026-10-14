import '../globals.css';

import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { Header } from '@/components/layout';
import { ThemeProvider } from '@/components/theme';
import { geistMono, geistSans, notoSans } from '@/config/fonts';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return {
    title: {
      default: t('title'),
      template: '%s | Ludora',
    },
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
