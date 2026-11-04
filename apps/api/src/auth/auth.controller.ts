import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';
import { AUTH_RATE_LIMIT_CONFIG } from '../config/rate-limit.js';
import {
    type ForgotPasswordDto,
    forgotPasswordSchema,
    type LoginDto,
    loginSchema,
    type RegisterDto,
    registerSchema,
    type ResendVerificationDto,
    resendVerificationSchema,
    type ResetPasswordDto,
    resetPasswordSchema,
    type VerifyEmailDto,
    verifyEmailSchema,
} from './dto/index.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { AuthService, PasswordRecoveryService } from './services/index.js';
import type { AuthenticatedRequest } from './types/authenticated-request.js';

@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly passwordRecoveryService: PasswordRecoveryService,
    ) { }

    @Post('register')
    @Throttle({ default: AUTH_RATE_LIMIT_CONFIG.register })
    register(@Body({ schema: registerSchema }) data: RegisterDto) {
        return this.authService.register(data);
    }

    @Post('resend-verification')
    @Throttle({ default: AUTH_RATE_LIMIT_CONFIG.resendVerification })
    @HttpCode(HttpStatus.OK)
    resendVerification(
        @Body({ schema: resendVerificationSchema }) data: ResendVerificationDto,
    ) {
        return this.authService.resendVerification(data);
    }

    @Post('verify-email')
    @Throttle({ default: AUTH_RATE_LIMIT_CONFIG.verifyEmail })
    @HttpCode(HttpStatus.OK)
    verifyEmail(@Body({ schema: verifyEmailSchema }) data: VerifyEmailDto) {
        return this.authService.verifyEmail(data);
    }

    @Post('login')
    @Throttle({ default: AUTH_RATE_LIMIT_CONFIG.login }) @HttpCode(HttpStatus.OK)
    login(@Body({ schema: loginSchema }) data: LoginDto) {
        return this.authService.login(data);
    }

    @Post('forgot-password')
    @Throttle({ default: AUTH_RATE_LIMIT_CONFIG.forgotPassword })
    @HttpCode(HttpStatus.ACCEPTED)
    forgotPassword(
        @Body({ schema: forgotPasswordSchema }) { email }: ForgotPasswordDto,
    ) {
        this.passwordRecoveryService.request(email);

        return { accepted: true };
    }

    @Post('reset-password')
    @Throttle({ default: AUTH_RATE_LIMIT_CONFIG.resetPassword })
    @HttpCode(HttpStatus.OK)
    async resetPassword(
        @Body({ schema: resetPasswordSchema }) { token, password }: ResetPasswordDto,
    ) {
        await this.passwordRecoveryService.reset(token, password);

        return { reset: true };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    getMe(@Req() request: AuthenticatedRequest) {
        return this.authService.getCurrentUser(request.auth.userId);
    }
}
