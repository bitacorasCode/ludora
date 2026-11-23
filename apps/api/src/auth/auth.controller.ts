import {
    Body,
    Controller,
    Get,
    Header,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { InternalRequestGuard, RateLimitGuard } from '../common/guards/index.js';
import { AUTH_RATE_LIMIT_CONFIG } from '../config/rate-limit.js';
import {
    type ChangePasswordDto,
    changePasswordSchema,
    type CompleteOAuthRegistrationDto,
    completeOAuthRegistrationSchema,
    type ForgotPasswordDto,
    forgotPasswordSchema,
    type GoogleCallbackDto,
    googleCallbackSchema,
    type LoginDto,
    loginSchema,
    type OAuthRegistrationContextDto,
    oauthRegistrationContextSchema,
    type RefreshTokenDto,
    refreshTokenSchema,
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
import {
    AuthService,
    AuthSessionService,
    GoogleAuthService,
    OAuthAccountService,
    PasswordChangeService,
    PasswordRecoveryService,
} from './services/index.js';
import type { AuthenticatedRequest } from './types/authenticated-request.js';

@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly passwordRecoveryService: PasswordRecoveryService,
        private readonly googleAuthService: GoogleAuthService,
        private readonly authSessionService: AuthSessionService,
        private readonly oauthAccountService: OAuthAccountService,
        private readonly passwordChangeService: PasswordChangeService,
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
    @Header('Cache-Control', 'no-store')
    verifyEmail(@Body({ schema: verifyEmailSchema }) data: VerifyEmailDto) {
        return this.authService.verifyEmail(data);
    }

    @Post('login')
    @Throttle({ default: AUTH_RATE_LIMIT_CONFIG.login })
    @HttpCode(HttpStatus.OK)
    @Header('Cache-Control', 'no-store')
    login(@Body({ schema: loginSchema }) data: LoginDto) {
        return this.authService.login(data);
    }

    @Post('refresh')
    @UseGuards(InternalRequestGuard)
    @HttpCode(HttpStatus.OK)
    @Header('Cache-Control', 'no-store')
    refresh(@Body({ schema: refreshTokenSchema }) { refreshToken }: RefreshTokenDto) {
        return this.authSessionService.rotateRefreshToken(refreshToken);
    }

    @Post('logout')
    @UseGuards(InternalRequestGuard)
    @HttpCode(HttpStatus.OK)
    @Header('Cache-Control', 'no-store')
    async logout(@Body({ schema: refreshTokenSchema }) { refreshToken }: RefreshTokenDto) {
        await this.authSessionService.revokeByRefreshToken(refreshToken);

        return { loggedOut: true };
    }

    @Post('logout/current')
    @UseGuards(InternalRequestGuard, JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @Header('Cache-Control', 'no-store')
    async logoutCurrentSession(@Req() { auth: { sessionId } }: AuthenticatedRequest) {
        await this.authSessionService.revokeBySessionId(sessionId);

        return { loggedOut: true };
    }

    @Post('activity')
    @UseGuards(InternalRequestGuard, JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async recordActivity(@Req() { auth: { sessionId, userId, authVersion } }: AuthenticatedRequest) {
        await this.authSessionService.recordActivity(sessionId, userId, authVersion);

        return { accepted: true };
    }

    @Post('forgot-password')
    @Throttle({ default: AUTH_RATE_LIMIT_CONFIG.forgotPassword })
    @HttpCode(HttpStatus.ACCEPTED)
    async forgotPassword(
        @Body({ schema: forgotPasswordSchema }) { email }: ForgotPasswordDto,
    ) {
        await this.passwordRecoveryService.request(email);

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

    @Post('change-password')
    @UseGuards(JwtAuthGuard)
    @Throttle({ default: AUTH_RATE_LIMIT_CONFIG.changePassword })
    @HttpCode(HttpStatus.OK)
    @Header('Cache-Control', 'no-store')
    changePassword(
        @Req() { auth: { userId, authVersion } }: AuthenticatedRequest,
        @Body({ schema: changePasswordSchema }) data: ChangePasswordDto,
    ) {
        return this.passwordChangeService.changePassword(userId, authVersion, data);
    }

    @Post('google/start')
    @UseGuards(InternalRequestGuard)
    @Throttle({ default: AUTH_RATE_LIMIT_CONFIG.login })
    @HttpCode(HttpStatus.OK)
    @Header('Cache-Control', 'no-store')
    startGoogleAuthorization() {
        return this.googleAuthService.createAuthorizationRequest();
    }

    @Post('google/callback')
    @UseGuards(InternalRequestGuard)
    @Throttle({ default: AUTH_RATE_LIMIT_CONFIG.login })
    @HttpCode(HttpStatus.OK)
    @Header('Cache-Control', 'no-store')
    async loginWithGoogle(
        @Body({ schema: googleCallbackSchema }) { flowToken, responseParameters }: GoogleCallbackDto,
    ) {
        const identity = await this.googleAuthService.verifyAuthorization(
            flowToken,
            responseParameters,
        );

        return this.oauthAccountService.resolveExternalIdentity(identity);
    }

    @Post('oauth/register')
    @UseGuards(InternalRequestGuard)
    @Throttle({ default: AUTH_RATE_LIMIT_CONFIG.register })
    @HttpCode(HttpStatus.CREATED)
    @Header('Cache-Control', 'no-store')
    completeOAuthRegistration(
        @Body({ schema: completeOAuthRegistrationSchema }) data: CompleteOAuthRegistrationDto,
    ) {
        return this.oauthAccountService.completeOAuthRegistration(data);
    }

    @Post('oauth/registration-context')
    @UseGuards(InternalRequestGuard)
    @Throttle({ default: AUTH_RATE_LIMIT_CONFIG.login })
    @HttpCode(HttpStatus.OK)
    @Header('Cache-Control', 'no-store')
    getOAuthRegistrationContext(
        @Body({ schema: oauthRegistrationContextSchema }) data: OAuthRegistrationContextDto,
    ) {
        return this.oauthAccountService.getOAuthRegistrationContext(data);
    }
}
