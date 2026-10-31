import 'server-only';

import { io } from 'next/cache';
import { z } from 'zod';

import { MILLISECONDS_PER_SECOND } from '@/lib/time';

export async function getVerificationWaitSeconds(
  resendAvailableAt: unknown,
): Promise<number> {
  const availability = z.iso.datetime().safeParse(resendAvailableAt);

  if (!availability.success) return 0;

  await io();

  return Math.max(
    0,
    Math.ceil((Date.parse(availability.data) - Date.now()) / MILLISECONDS_PER_SECOND),
  );
}
