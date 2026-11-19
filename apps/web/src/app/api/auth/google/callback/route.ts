import type { NextRequest } from 'next/server';

import { handleGoogleCallback } from '@/features/social-auth/server';

export async function GET(request: NextRequest) {
    return handleGoogleCallback(request);
}
