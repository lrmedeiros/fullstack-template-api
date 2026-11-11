import {
  Injectable,
  NotImplementedException,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { EnvironmentVariables } from '../../config/env.validation.js';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    if (!this.config.get('GOOGLE_CLIENT_ID', { infer: true })) {
      throw new NotImplementedException(
        'Google OAuth is not configured (set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)',
      );
    }
    return super.canActivate(context);
  }
}
