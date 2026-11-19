export const PRISMA_ERROR_CODES = {
    uniqueConstraintViolation: 'P2002',
} as const;

export const DATABASE_CONSTRAINTS = {
    usersNicknameUnique: 'users_nickname_key',
    usersEmailUnique: 'users_email_key',
    authIdentityProviderUserUnique: 'auth_identities_provider_provider_user_id_key',
} as const;

export const SINGLE_RECORD_COUNT = 1;
