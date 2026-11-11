import type { DataSourceOptions } from 'typeorm';
import { Task } from '../tasks/task.entity.js';
import { User } from '../users/user.entity.js';
import { migrations } from './migrations/index.js';

/**
 * Fonte única das opções do TypeORM, usada tanto pela aplicação Nest
 * quanto pela CLI de migrations (data-source.ts).
 *
 * `synchronize` fica sempre desligado: o schema só muda via migrations.
 */
export function buildDataSourceOptions(url: string): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    entities: [User, Task],
    migrations,
    synchronize: false,
    // gen_random_uuid() é nativo do Postgres 13+ (dispensa a extensão uuid-ossp).
    uuidExtension: 'pgcrypto',
  };
}
