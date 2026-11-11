import { validateEnv } from './env.validation.js';

const validEnv = {
  DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/app',
  JWT_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('applies defaults and converts numeric values', () => {
    const env = validateEnv({ ...validEnv, PORT: '4000' });

    expect(env.PORT).toBe(4000);
    expect(env.JWT_EXPIRES_IN).toBe('1h');
    expect(env.WEB_URL).toBe('http://localhost:3000');
  });

  it('fails fast when a required variable is missing', () => {
    expect(() => validateEnv({ JWT_SECRET: 'x'.repeat(32) })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('rejects a short JWT secret', () => {
    expect(() => validateEnv({ ...validEnv, JWT_SECRET: 'short' })).toThrow(
      /JWT_SECRET must have at least 32 characters/,
    );
  });
});
