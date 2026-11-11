import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  type Profile,
  type VerifyCallback,
} from 'passport-google-oauth20';
import { AuthProvider } from '../../users/user.entity.js';
import { AuthService } from '../auth.service.js';

export interface GoogleOAuthConfig {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
}

/**
 * Esqueleto de OAuth2 com Google. Só é registrada quando GOOGLE_CLIENT_ID e
 * GOOGLE_CLIENT_SECRET estão definidos (ver AuthModule). Outros provedores
 * (GitHub, Microsoft...) seguem o mesmo formato.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    options: GoogleOAuthConfig,
    private readonly authService: AuthService,
  ) {
    super({ ...options, scope: ['email', 'profile'] });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('Google account has no email'), false);
      return;
    }

    const user = await this.authService.validateOAuthUser({
      provider: AuthProvider.Google,
      providerId: profile.id,
      email,
      name: profile.displayName || email,
    });
    done(null, user);
  }
}
