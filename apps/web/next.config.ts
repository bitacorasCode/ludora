import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const e2eMode = ['signed-in', 'guest'].includes(process.env.LUDORA_E2E_MODE ?? '')
    ? process.env.LUDORA_E2E_MODE
    : undefined;

const nextConfig: NextConfig = {
    /* config options here */
    distDir: e2eMode ? `.next-e2e/${e2eMode}` : '.next',
    cacheComponents: true,
    partialPrefetching: true,
    experimental: {
        globalNotFound: true,
    },
    turbopack: {
        resolveAlias: e2eMode
            ? { '@/config/auth': `./e2e/fixtures/auth-${e2eMode}.ts` }
            : {},
        rules: {
            "*.css": {
                loaders: ["@tailwindcss/turbopack"],
                as: "*.css",
            },
        },
    },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);

