import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './typeorm.options.js';

/**
 * DataSource usado pela CLI do TypeORM (migration:run, migration:generate...).
 * Os scripts do package.json compilam o projeto e apontam para dist/.
 */
export default new DataSource(
  buildDataSourceOptions(
    process.env.DATABASE_URL ??
      'postgres://postgres:postgres@localhost:5432/app',
  ),
);
