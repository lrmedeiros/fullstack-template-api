import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import type { EnvironmentVariables } from '../config/env.validation.js';
import type { User } from '../users/user.entity.js';
import { AuthService } from './auth.service.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { GoogleOAuthGuard } from './guards/google-oauth.guard.js';

@ApiTags('auth')
@Public()
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  @Post('register')
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({ description: 'Email already registered' })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  /** Inicia o fluxo OAuth2 (redireciona para o consentimento do Google). */
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  google(): void {}

  /**
   * Callback do Google. Emite o JWT e devolve o usuário ao front-end.
   * O token vai no fragmento (#), que não é enviado a servidores nem fica
   * em logs de acesso.
   */
  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const { accessToken } = await this.authService.buildAuthResponse(
      req.user as User,
    );
    const webUrl = this.config.get('WEB_URL', { infer: true });
    res.redirect(`${webUrl}/auth/callback#token=${accessToken}`);
  }
}
