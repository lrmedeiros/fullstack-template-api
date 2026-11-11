import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum Role {
  User = 'user',
  Admin = 'admin',
}

export enum AuthProvider {
  Local = 'local',
  Google = 'google',
}

@Entity('users')
export class User {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_users' })
  id: string;

  @ApiProperty({ example: 'ada@example.com' })
  @Index('UQ_users_email', { unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @ApiProperty({ example: 'Ada Lovelace' })
  @Column({ type: 'varchar', length: 120 })
  name: string;

  /** Nulo para contas criadas via OAuth. Nunca é serializado. */
  @Exclude()
  @Column({ name: 'password_hash', type: 'varchar', nullable: true })
  passwordHash: string | null;

  @ApiProperty({ enum: Role })
  @Column({
    type: 'enum',
    enum: Role,
    enumName: 'user_role',
    default: Role.User,
  })
  role: Role;

  @ApiProperty({ enum: AuthProvider })
  @Column({
    type: 'enum',
    enum: AuthProvider,
    enumName: 'auth_provider',
    default: AuthProvider.Local,
  })
  provider: AuthProvider;

  @Exclude()
  @Column({ name: 'provider_id', type: 'varchar', nullable: true })
  providerId: string | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
