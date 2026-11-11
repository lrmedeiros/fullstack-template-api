import { Controller, Get, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role, User } from './user.entity.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOkResponse({ type: User })
  async me(@CurrentUser() authUser: AuthUser): Promise<User> {
    const user = await this.usersService.findById(authUser.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Get()
  @Roles(Role.Admin)
  @ApiOkResponse({ type: [User] })
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }
}
