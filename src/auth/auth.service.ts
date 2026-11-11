import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { AuthProvider, type User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import type { AuthResponseDto } from './dto/auth-response.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';

const BCRYPT_ROUNDS = 10;

export interface OAuthProfile {
  provider: AuthProvider;
  providerId: string;
  email: string;
  name: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);

    // Mesma mensagem para email inexistente e senha errada (evita enumeração).
    const valid =
      user?.passwordHash != null &&
      (await bcrypt.compare(dto.password, user.passwordHash));

    if (!user || !valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  /** Encontra ou cria o usuário vindo de um provedor OAuth2 (ex.: Google). */
  async validateOAuthUser(profile: OAuthProfile): Promise<User> {
    const existing = await this.usersService.findByEmail(profile.email);
    if (existing) {
      return existing;
    }

    return this.usersService.create({
      email: profile.email,
      name: profile.name,
      provider: profile.provider,
      providerId: profile.providerId,
    });
  }

  async buildAuthResponse(user: User): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken, user };
  }
}
