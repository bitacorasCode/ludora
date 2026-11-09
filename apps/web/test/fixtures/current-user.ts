import type { CurrentUser } from '@/lib/auth';

export const currentUser = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  nickname: 'Jugador',
  email: 'jugador@example.test',
  createdAt: '2026-10-20T12:00:00.000Z',
  avatarPresetId: null,
} satisfies CurrentUser;
