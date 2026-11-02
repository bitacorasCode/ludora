import { SECONDS_PER_MINUTE } from '../../common/constants/time.js';
import type { SendMailInput } from '../../mail/index.js';

type PasswordResetMailInput = {
    resetUrl: string;
    expiresInSeconds: number;
};

export function createPasswordResetMail({
    resetUrl,
    expiresInSeconds,
}: PasswordResetMailInput): Pick<SendMailInput, 'subject' | 'text'> {
    const expiresInMinutes = expiresInSeconds / SECONDS_PER_MINUTE;

    return {
        subject: 'Recupera tu contraseña en Ludora',
        text: [
            'Recibimos una solicitud para restablecer la contraseña de tu cuenta de Ludora.',
            '',
            'Abre este enlace para elegir una nueva contraseña:',
            resetUrl,
            '',
            `El enlace caduca ${expiresInMinutes} minutos después de generarse y solo puede utilizarse una vez.`,
            '',
            'Si no solicitaste este cambio, puedes ignorar este mensaje.',
        ].join('\n'),
    };
}
