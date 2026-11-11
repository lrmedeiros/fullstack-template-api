import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    setupFiles: ['reflect-metadata'],
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    // Carrega .env (DATABASE_URL, JWT_SECRET...) quando existir; no CI as
    // variáveis vêm do workflow.
    env: loadEnv('test', process.cwd(), ''),
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
