import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

import { ENV_ENABLED_FLAG } from './src/config/environment';

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
        globalNotFound: true,
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

