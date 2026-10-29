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
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    register(@Body({ schema: registerSchema }) data: RegisterDto) {
        return this.authService.register(data);
    }

    @Post('resend-verification')
    @HttpCode(HttpStatus.OK)
    resendVerification(
        @Body({ schema: resendVerificationSchema }) data: ResendVerificationDto,
    ) {
        return this.authService.resendVerification(data);
    }

    @Post('verify-email')
    @HttpCode(HttpStatus.OK)
    verifyEmail(@Body({ schema: verifyEmailSchema }) data: VerifyEmailDto) {
        return this.authService.verifyEmail(data);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(@Body({ schema: loginSchema }) data: LoginDto) {
        return this.authService.login(data);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    getMe(@Req() request: AuthenticatedRequest) {
        return this.authService.getCurrentUser(request.auth.userId);
    }
}
