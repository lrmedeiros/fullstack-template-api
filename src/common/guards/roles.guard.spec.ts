import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../users/user.entity.js';
import { RolesGuard } from './roles.guard.js';

function contextWithUser(user?: { role: Role }): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  afterEach(() => vi.restoreAllMocks());

  it('allows routes without @Roles()', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(contextWithUser({ role: Role.User }))).toBe(true);
  });

  it('allows a user with a required role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.Admin]);
    expect(guard.canActivate(contextWithUser({ role: Role.Admin }))).toBe(true);
  });

  it('forbids a user without the required role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.Admin]);
    expect(() =>
      guard.canActivate(contextWithUser({ role: Role.User })),
    ).toThrow(ForbiddenException);
  });

  it('forbids when there is no authenticated user', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.Admin]);
    expect(() => guard.canActivate(contextWithUser())).toThrow(
      ForbiddenException,
    );
  });
});
