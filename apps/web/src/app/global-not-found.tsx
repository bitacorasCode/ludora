import './globals.css';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { geistMono, geistSans, notoSans } from '@/config/fonts';
import { NotFoundPageContent } from '@/features/not-found';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({
    locale: routing.defaultLocale,
    namespace: 'NotFound',
  });

  return {
    title: `${t('title')} | Ludora`,
    description: t('description'),
  };
}

export default function GlobalNotFound() {
  return (
    <html
      lang={routing.defaultLocale}
      className={cn(
        'h-full font-sans antialiased',
        geistSans.variable,
        geistMono.variable,
        notoSans.variable,
      )}
    >
      <body className='min-h-full'>
        <main>
          <NotFoundPageContent locale={routing.defaultLocale} />
        </main>
      </body>
    </html>
  );
}
