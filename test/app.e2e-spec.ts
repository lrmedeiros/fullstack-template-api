import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

/**
 * Testes ponta a ponta contra um Postgres real (o do docker-compose ou o
 * service container do CI). Cada execução usa emails únicos, então não é
 * preciso limpar o banco.
 */
describe('API (e2e)', () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;

  const credentials = {
    name: 'E2E User',
    email: `e2e-${randomUUID()}@example.com`,
    password: 'S3nhaForte',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = configureApp(
      moduleRef.createNestApplication(),
    ) as INestApplication<App>;
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health reports the database as up', async () => {
    const res = await http.get('/health').expect(200);
    expect(res.body.info.database.status).toBe('up');
  });

  it('rejects protected routes without a token', async () => {
    await http.get('/api/tasks').expect(401);
  });

  describe('auth', () => {
    it('validates the register payload', async () => {
      const res = await http
        .post('/api/auth/register')
        .send({ name: 'A', email: 'not-an-email', password: '123' })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([
          'email must be an email',
          'name must be longer than or equal to 2 characters',
        ]),
      );
    });

    it('rejects unknown fields (whitelist)', async () => {
      await http
        .post('/api/auth/register')
        .send({ ...credentials, role: 'admin' })
        .expect(400);
    });

    it('registers, never exposes the password hash, and blocks duplicates', async () => {
      const res = await http
        .post('/api/auth/register')
        .send(credentials)
        .expect(201);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({
        email: credentials.email,
        role: 'user',
      });
      expect(res.body.user).not.toHaveProperty('passwordHash');

      await http.post('/api/auth/register').send(credentials).expect(409);
    });

    it('logs in with valid credentials only', async () => {
      await http
        .post('/api/auth/login')
        .send({ email: credentials.email, password: 'errada123' })
        .expect(401);

      const res = await http
        .post('/api/auth/login')
        .send({ email: credentials.email, password: credentials.password })
        .expect(200);
      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    it('answers 501 for Google OAuth when it is not configured', async () => {
      if (process.env.GOOGLE_CLIENT_ID) return;
      await http.get('/api/auth/google').expect(501);
    });
  });

  describe('users and tasks', () => {
    let token: string;
    let otherToken: string;

    beforeAll(async () => {
      const login = await http
        .post('/api/auth/login')
        .send({ email: credentials.email, password: credentials.password });
      token = login.body.accessToken;

      const other = await http.post('/api/auth/register').send({
        name: 'Other User',
        email: `e2e-other-${randomUUID()}@example.com`,
        password: 'S3nhaForte',
      });
      otherToken = other.body.accessToken;
    });

    it('GET /api/users/me returns the authenticated user', async () => {
      const res = await http
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.email).toBe(credentials.email);
    });

    it('GET /api/users is restricted to admins', async () => {
      await http
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('runs the full task CRUD, isolated per user', async () => {
      const auth = { Authorization: `Bearer ${token}` };

      const created = await http
        .post('/api/tasks')
        .set(auth)
        .send({ title: '  Write e2e tests  ' })
        .expect(201);
      expect(created.body).toMatchObject({
        title: 'Write e2e tests',
        status: 'todo',
      });
      const id: string = created.body.id;

      const list = await http
        .get('/api/tasks?status=todo&limit=5')
        .set(auth)
        .expect(200);
      expect(list.body.meta).toMatchObject({ page: 1, limit: 5, total: 1 });
      expect(list.body.data[0].id).toBe(id);

      const updated = await http
        .patch(`/api/tasks/${id}`)
        .set(auth)
        .send({ status: 'done' })
        .expect(200);
      expect(updated.body.status).toBe('done');

      // Outro usuário não enxerga a tarefa (404, não 403).
      await http
        .get(`/api/tasks/${id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);

      await http.delete(`/api/tasks/${id}`).set(auth).expect(204);
      await http.get(`/api/tasks/${id}`).set(auth).expect(404);
    });

    it('validates ids and enums', async () => {
      const auth = { Authorization: `Bearer ${token}` };
      await http.get('/api/tasks/not-a-uuid').set(auth).expect(400);
      await http
        .post('/api/tasks')
        .set(auth)
        .send({ title: 'x', status: 'archived' })
        .expect(400);
    });
  });
});
