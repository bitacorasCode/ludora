import { PASSWORD_FORM_MODE } from '@ludora/contracts/auth';
import { z } from 'zod';

export const PASSWORD_RECOVERY_COMPLETION_PARAM = 'passwordUpdated';

export const passwordResetTokenSchema = z.base64url().min(1);
export const passwordFormModeSchema = z.enum(PASSWORD_FORM_MODE).catch(PASSWORD_FORM_MODE.reset);
