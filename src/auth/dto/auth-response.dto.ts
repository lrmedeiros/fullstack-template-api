import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/user.entity.js';

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT para o header Authorization: Bearer' })
  accessToken: string;

  @ApiProperty({ type: User })
  user: User;
}
