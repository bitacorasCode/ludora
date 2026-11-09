import { setImmediate } from 'node:timers';

import { Injectable, Logger } from '@nestjs/common';

import { MailService } from '../../mail/index.js';
import { createPasswordChangedMail } from '../templates/password-changed-mail.js';

@Injectable()
export class PasswordNotificationService {
    private readonly logger = new Logger(PasswordNotificationService.name);

    constructor(private readonly mailService: MailService) {}

    passwordChanged(to: string): void {
        // The caller has committed the change; SMTP cannot fail its response.
        setImmediate(() => {
            void this.mailService.send({ to, ...createPasswordChangedMail() }).catch(() => {
                this.logger.error('Could not send password change notification.');
            });
        });
    }
}
