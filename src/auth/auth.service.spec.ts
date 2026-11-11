import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import { AuthProvider, Role, type User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: '7d3f8c2a-1b4e-4f6a-9c8d-2e5f7a9b1c3d',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    passwordHash: null,
    role: Role.User,
    provider: AuthProvider.Local,
    providerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  const usersService = {
    findByEmail: vi.fn(),
    create: vi.fn(),
  };
  const jwtService = { signAsync: vi.fn().mockResolvedValue('signed.jwt') };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('rejects an email that is already registered', async () => {
      usersService.findByEmail.mockResolvedValue(makeUser());

      await expect(
        service.register({
          name: 'Ada',
          email: 'ada@example.com',
          password: 'S3nhaForte',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('stores a bcrypt hash (never the plain password) and returns a token', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockImplementation(async (input) =>
        makeUser(input as Partial<User>),
      );

      const result = await service.register({
        name: 'Ada',
        email: 'ada@example.com',
        password: 'S3nhaForte',
      });

      const { passwordHash } = usersService.create.mock.calls[0][0] as {
        passwordHash: string;
      };
      expect(passwordHash).not.toBe('S3nhaForte');
      await expect(bcrypt.compare('S3nhaForte', passwordHash)).resolves.toBe(
        true,
      );
      expect(result.accessToken).toBe('signed.jwt');
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: result.user.id,
        email: 'ada@example.com',
        role: Role.User,
      });
    });
  });

  describe('login', () => {
    it('returns a token for valid credentials', async () => {
      const passwordHash = await bcrypt.hash('S3nhaForte', 4);
      usersService.findByEmail.mockResolvedValue(makeUser({ passwordHash }));

      const result = await service.login({
        email: 'ada@example.com',
        password: 'S3nhaForte',
      });

      expect(result.accessToken).toBe('signed.jwt');
    });

    it.each([
      ['unknown email', null],
      ['OAuth-only account', makeUser({ provider: AuthProvider.Google })],
    ])('rejects login for %s', async (_case, user) => {
      usersService.findByEmail.mockResolvedValue(user);

      await expect(
        service.login({ email: 'ada@example.com', password: 'S3nhaForte' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a wrong password', async () => {
      const passwordHash = await bcrypt.hash('S3nhaForte', 4);
      usersService.findByEmail.mockResolvedValue(makeUser({ passwordHash }));

      await expect(
        service.login({ email: 'ada@example.com', password: 'errada123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('validateOAuthUser', () => {
    it('reuses an existing account with the same email', async () => {
      const existing = makeUser();
      usersService.findByEmail.mockResolvedValue(existing);

      const user = await service.validateOAuthUser({
        provider: AuthProvider.Google,
        providerId: 'google-123',
        email: 'ada@example.com',
        name: 'Ada',
      });

      expect(user).toBe(existing);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('creates a passwordless account on first OAuth login', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockImplementation(async (input) =>
        makeUser(input as Partial<User>),
      );

      await service.validateOAuthUser({
        provider: AuthProvider.Google,
        providerId: 'google-123',
        email: 'new@example.com',
        name: 'New User',
      });

      expect(usersService.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        name: 'New User',
        provider: AuthProvider.Google,
        providerId: 'google-123',
      });
    });
  });
});
