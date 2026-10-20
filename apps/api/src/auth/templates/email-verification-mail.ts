import type { SendMailInput } from '../../mail/index.js';

type EmailVerificationMailInput = {
    code: string;
    expiresInSeconds: number;
};

export function createEmailVerificationMail({
    code,
    expiresInSeconds,
}: EmailVerificationMailInput): Pick<SendMailInput, 'subject' | 'text'> {
    const expiresInMinutes = expiresInSeconds / 60;

    return {
        subject: 'Confirma tu correo en Ludora',
        text: [
            'Estás a un paso de completar tu registro en Ludora.',
            '',
            `Tu código de verificación es: ${code}`,
            '',
            `El código caduca ${expiresInMinutes} minutos después de generarse.`,
            'Puedes introducirlo en la pantalla de verificación de Ludora.',
            '',
            'Si no solicitaste este registro, puedes ignorar este mensaje.',
        ].join('\n'),
    };
}