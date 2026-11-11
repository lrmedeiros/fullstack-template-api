# Fullstack Template — API

[![CI](https://github.com/lrmedeiros/fullstack-template-api/actions/workflows/ci.yml/badge.svg)](https://github.com/lrmedeiros/fullstack-template-api/actions/workflows/ci.yml)

> 🇧🇷 [Leia em português](README.md)

REST API built with **NestJS 12 + TypeScript + TypeORM + PostgreSQL**. It has **JWT** authentication, a **Google OAuth2** skeleton, role-based authorization, DTO validation, Swagger docs, unit and e2e tests, Docker, and CI.

This is the back end of a full stack template. The front end (Next.js + React + Tailwind) lives in **[fullstack-template-web](https://github.com/lrmedeiros/fullstack-template-web)**.

## One-command start

Requires Docker.

```bash
docker compose up --build
```

| Service  | URL                                            |
| -------- | ---------------------------------------------- |
| API      | http://localhost:3001/api                      |
| Swagger  | http://localhost:3001/docs                     |
| Health   | http://localhost:3001/health                   |
| Postgres | `localhost:5432` (postgres/postgres, db `app`) |

Migrations run automatically on boot. To run **API + web + database** together, use `docker compose up` from the web repository.

## Local development

```bash
cp .env.example .env
docker compose up -d db      # Postgres only
npm install
npm run start:dev            # http://localhost:3001
```

## Endpoints

| Method | Route                | Access        | Description                                          |
| ------ | -------------------- | ------------- | ---------------------------------------------------- |
| POST   | `/api/auth/register` | public        | Sign up, returns `{ accessToken, user }`             |
| POST   | `/api/auth/login`    | public        | Email/password login                                 |
| GET    | `/api/auth/google`   | public        | Starts Google OAuth2 (501 if not configured)         |
| GET    | `/api/users/me`      | authenticated | Current user                                         |
| GET    | `/api/users`         | admin         | List users                                           |
| GET    | `/api/tasks`         | authenticated | Paginated list (`page`, `limit`, `status`, `search`) |
| POST   | `/api/tasks`         | authenticated | Create task                                          |
| GET    | `/api/tasks/:id`     | owner         | Task details                                         |
| PATCH  | `/api/tasks/:id`     | owner         | Partial update                                       |
| DELETE | `/api/tasks/:id`     | owner         | Delete                                               |
| GET    | `/health`            | public        | Health check (database)                              |

## Architecture and decisions

- **Secure by default.** `JwtAuthGuard` is global, so every route needs a token unless it has `@Public()`. `RolesGuard` checks `@Roles(...)`, and `ThrottlerGuard` rate-limits requests (10/min on auth routes).
- **Owner isolation.** Every task query is scoped by `ownerId`. Another user's task returns **404**, not 403, so the API doesn't reveal that the task exists.
- **Validation at the edge.** `ValidationPipe` runs with `whitelist` + `forbidNonWhitelisted`, so unknown fields are rejected. DTOs also normalize input (trim, lowercase email).
- **Passwords.** Passwords are hashed with bcrypt. `passwordHash` is `@Exclude()`d and stripped by `ClassSerializerInterceptor`. Login uses the same error for an unknown email and a wrong password, which prevents user enumeration.
- **Schema changes only through migrations.** `synchronize` is always off. Migrations are generated from the entities and listed explicitly, which works the same in ESM, in builds, and in tests. CI runs `migration:check` to catch entity changes that have no migration.
- **Fail-fast config.** Environment variables are validated on boot with class-validator.
- **Pluggable OAuth2.** The Google strategy is registered only when credentials exist. The callback issues a JWT and redirects to the web app with the token in the URL fragment, so it never reaches server logs.
- **ESM + Vitest.** NestJS 12 is ESM-only, so tests use Vitest, which has a Jest-compatible API. Linting uses oxlint with type-aware rules.
- **Lean Docker image.** Multi-stage build, production dependencies only, non-root user, `HEALTHCHECK`.

## Scripts

`start:dev`, `test`, `test:cov`, `test:e2e`, `lint`, `typecheck`, `migration:generate -- src/database/migrations/Name`, `migration:run`, `migration:revert`, `migration:check`. After generating a migration, register its class in `src/database/migrations/index.ts`.

## Google OAuth2 (optional)

Create a Web OAuth client in Google Cloud Console, add `http://localhost:3001/api/auth/google/callback` as a redirect URI, then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## Stack

NestJS 12 · TypeScript · TypeORM 1 · PostgreSQL 17 · Passport (JWT, Google OAuth2) · class-validator · Swagger · Vitest · Supertest · oxlint · Prettier · Docker · GitHub Actions · Husky · Commitlint

## License

[MIT](LICENSE) © Lucas Rinaldi Medeiros Silva
