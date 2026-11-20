import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

import { ENV_ENABLED_FLAG } from './src/config/environment';
import { routing } from './src/i18n/routing';

const NEXT_OUTPUT_DIRECTORIES = {
    app: '.next',
    e2e: '.next-e2e',
} as const;

const nextConfig: NextConfig = {
    /* config options here */
    distDir: process.env.LUDORA_E2E === ENV_ENABLED_FLAG
        ? NEXT_OUTPUT_DIRECTORIES.e2e
        : NEXT_OUTPUT_DIRECTORIES.app,
    cacheComponents: true,
    partialPrefetching: true,
    experimental: {
        agentUpgrade: 'security',
        globalNotFound: true,
    },
    async rewrites() {
        return {
            afterFiles: [
                {
                    // Keep missing root files from being interpreted as a locale.
                    source: '/:file([^/]*\\.[^/]*)',
                    destination: `/${routing.defaultLocale}/:file`,
                },
            ],
        };
    },
    turbopack: {
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

