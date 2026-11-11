import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { AuthProvider, User } from './user.entity.js';

export interface CreateUserInput {
  email: string;
  name: string;
  passwordHash?: string | null;
  provider?: AuthProvider;
  providerId?: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOneBy({ email: email.toLowerCase() });
  }

  create(input: CreateUserInput): Promise<User> {
    const user = this.users.create({
      ...input,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash ?? null,
      provider: input.provider ?? AuthProvider.Local,
      providerId: input.providerId ?? null,
    });
    return this.users.save(user);
  }

  findAll(): Promise<User[]> {
    return this.users.find({ order: { createdAt: 'DESC' } });
  }
}
