import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../users/user.entity.js';

export const ROLES_KEY = 'roles';

/** Restringe a rota aos papéis informados (checado pelo RolesGuard). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
