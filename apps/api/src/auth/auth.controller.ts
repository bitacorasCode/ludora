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
import { type LoginDto, loginSchema } from './dto/login.dto.js';
import {
    type RegisterDto,
    registerSchema,
} from './dto/register.dto.js';
import {
    type ResendVerificationDto,
    resendVerificationSchema,
} from './dto/resend-verification.dto.js';
import {
    type VerifyEmailDto,
    verifyEmailSchema,
} from './dto/verify-email.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { AuthService } from './services/index.js';
import type { AuthenticatedRequest } from './types/authenticated-request.js';

@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
    constructor(private readonly authService: AuthService) { }

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

    @Get('me')
    @UseGuards(JwtAuthGuard)
    getMe(@Req() request: AuthenticatedRequest) {
        return this.authService.getCurrentUser(request.auth.userId);
    }
}
