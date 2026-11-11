import { Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { GoogleStrategy } from './strategies/google.strategy.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

/** Registra a estratégia do Google só quando há credenciais configuradas. */
const googleStrategyProvider: Provider = {
  provide: GoogleStrategy,
  inject: [ConfigService, AuthService],
  useFactory: (
    config: ConfigService<EnvironmentVariables, true>,
    authService: AuthService,
  ) => {
    const clientID = config.get('GOOGLE_CLIENT_ID', { infer: true });
    const clientSecret = config.get('GOOGLE_CLIENT_SECRET', { infer: true });
    if (!clientID || !clientSecret) {
      return null;
    }
    const callbackURL =
      config.get('GOOGLE_CALLBACK_URL', { infer: true }) ??
      'http://localhost:3001/api/auth/google/callback';
    return new GoogleStrategy(
      { clientID, clientSecret, callbackURL },
      authService,
    );
  },
};

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          // `expiresIn` aceita "1h", "15m", "7d"...
          expiresIn: config.get('JWT_EXPIRES_IN', { infer: true }) as never,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, googleStrategyProvider],
})
export class AuthModule {}
