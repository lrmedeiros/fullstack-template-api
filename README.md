# Fullstack Template — API

[![CI](https://github.com/lrmedeiros/fullstack-template-api/actions/workflows/ci.yml/badge.svg)](https://github.com/lrmedeiros/fullstack-template-api/actions/workflows/ci.yml)

> 🇺🇸 [Read in English](README.en.md)

API REST em **NestJS 12 + TypeScript + TypeORM + PostgreSQL**, com autenticação **JWT**, esqueleto de **OAuth2 (Google)**, autorização por papéis, validação com DTOs, documentação Swagger, testes unitários e e2e, Docker e CI.

É o back-end de um template full stack. O front-end (Next.js + React + Tailwind) fica em **[fullstack-template-web](https://github.com/lrmedeiros/fullstack-template-web)**.

## Subir em um comando

Pré-requisito: Docker.

```bash
docker compose up --build
```

| Serviço  | URL                                               |
| -------- | ------------------------------------------------- |
| API      | http://localhost:3001/api                         |
| Swagger  | http://localhost:3001/docs                        |
| Health   | http://localhost:3001/health                      |
| Postgres | `localhost:5432` (postgres/postgres, banco `app`) |

As migrations rodam sozinhas quando a API inicia. Para subir **API + front + banco** juntos, use o `docker compose up` do repositório web.

## Rodar localmente (sem Docker para a API)

```bash
cp .env.example .env
docker compose up -d db      # só o Postgres
npm install
npm run start:dev            # http://localhost:3001
```

## Endpoints

| Método | Rota                 | Acesso      | Descrição                                            |
| ------ | -------------------- | ----------- | ---------------------------------------------------- |
| POST   | `/api/auth/register` | público     | Cria conta e devolve `{ accessToken, user }`         |
| POST   | `/api/auth/login`    | público     | Login com email e senha                              |
| GET    | `/api/auth/google`   | público     | Inicia OAuth2 com Google (501 se não configurado)    |
| GET    | `/api/users/me`      | autenticado | Usuário logado                                       |
| GET    | `/api/users`         | admin       | Lista usuários                                       |
| GET    | `/api/tasks`         | autenticado | Lista paginada (`page`, `limit`, `status`, `search`) |
| POST   | `/api/tasks`         | autenticado | Cria tarefa                                          |
| GET    | `/api/tasks/:id`     | dono        | Detalhe                                              |
| PATCH  | `/api/tasks/:id`     | dono        | Atualização parcial                                  |
| DELETE | `/api/tasks/:id`     | dono        | Remove                                               |
| GET    | `/health`            | público     | Health check (banco)                                 |

O contrato completo, com schemas e exemplos, está no Swagger (`/docs`), que também aceita o token pelo botão **Authorize**.

## Arquitetura e decisões

```
src/
├── auth/            # registro, login, JWT, OAuth2 (Passport strategies + guards)
├── users/           # entidade User, serviço e rotas /users
├── tasks/           # CRUD de exemplo: entidade, DTOs, serviço, controller
├── health/          # @nestjs/terminus
├── common/          # decorators (@Public, @Roles, @CurrentUser), guards, interceptors
├── config/          # validação das variáveis de ambiente
├── database/        # opções do TypeORM, DataSource da CLI e migrations
├── app.module.ts
├── app.setup.ts     # pipes, interceptors, CORS, helmet, Swagger (compartilhado com os e2e)
└── main.ts
```

- **Seguro por padrão.** O `JwtAuthGuard` é global: toda rota exige token, a menos que tenha `@Public()`. Se alguém esquecer o decorator, a rota fica fechada, não aberta. Em seguida, o `RolesGuard` checa `@Roles(Role.Admin)`, e o `ThrottlerGuard` limita a taxa de requisições (10/min nas rotas de auth).
- **Isolamento por dono.** Todo acesso a tarefas filtra por `ownerId`. Quando a tarefa é de outro usuário, a resposta é **404**, e não 403, para não revelar que o recurso existe.
- **Validação na borda.** `ValidationPipe` com `whitelist` + `forbidNonWhitelisted`: campos desconhecidos (ex.: `role` no registro) são rejeitados com 400. Os DTOs também normalizam a entrada (trim, email em minúsculas).
- **Senhas.** O hash é feito com bcrypt. A entidade marca `passwordHash` com `@Exclude()` e o `ClassSerializerInterceptor` garante que ele nunca sai na resposta. O login devolve a mesma mensagem para email inexistente e senha errada, o que evita enumeração de usuários.
- **Schema só via migrations.** `synchronize: false` sempre. As migrations são geradas a partir das entidades e listadas explicitamente em `src/database/migrations/index.ts`, o que funciona igual em ESM, no build e nos testes. O CI roda `migration:check`, que falha se uma entidade mudou sem migration.
- **Config fail-fast.** As variáveis de ambiente são validadas com class-validator no boot. Um `JWT_SECRET` curto ou um `DATABASE_URL` ausente impedem a API de subir.
- **OAuth2 plugável.** A `GoogleStrategy` só é registrada quando há credenciais. O callback emite o JWT e redireciona para o front com o token no fragmento (`#token=`), que não vai para logs de servidor. Outros provedores seguem o mesmo formato.
- **ESM + Vitest.** O NestJS 12 é ESM-only, e por isso os testes usam Vitest, cuja API é compatível com a do Jest (`describe`/`it`/`expect`, `vi.fn()` no lugar de `jest.fn()`). O lint usa oxlint com regras type-aware.
- **Imagem Docker enxuta.** Build multi-stage, só dependências de produção, usuário não-root e `HEALTHCHECK`.

## Scripts

| Script                                                       | O que faz                                          |
| ------------------------------------------------------------ | -------------------------------------------------- |
| `npm run start:dev`                                          | API em modo watch, lendo `.env`                    |
| `npm test` / `npm run test:cov`                              | Testes unitários (Vitest) / com cobertura          |
| `npm run test:e2e`                                           | Testes e2e com Supertest contra Postgres real      |
| `npm run lint` / `npm run typecheck`                         | oxlint type-aware / `tsc --noEmit`                 |
| `npm run migration:generate -- src/database/migrations/Nome` | Gera migration a partir das entidades              |
| `npm run migration:run` / `migration:revert`                 | Aplica / desfaz migrations                         |
| `npm run migration:check`                                    | Falha se houver diferença entre entidades e schema |

Depois de gerar uma migration, adicione a classe dela em `src/database/migrations/index.ts`.

### Promover um usuário a admin

```bash
docker compose exec db psql -U postgres -d app -c "UPDATE users SET role = 'admin' WHERE email = 'voce@exemplo.com';"
```

Faça login de novo para receber um token com o papel atualizado.

## OAuth2 com Google (opcional)

1. Crie um OAuth Client ID (tipo "Web application") no [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Cadastre a URI de redirecionamento `http://localhost:3001/api/auth/google/callback`.
3. Preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env` (ou exporte as variáveis antes do `docker compose up`).

## Qualidade e fluxo de trabalho

- **CI (GitHub Actions):** lint, formatação, typecheck, testes unitários com cobertura, build; e2e com Postgres em service container, mais `migration:check`; build da imagem Docker; e validação de Conventional Commits nos PRs.
- **Husky + lint-staged:** oxlint e Prettier nos arquivos staged a cada commit.
- **Commitlint:** mensagens no padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/) (`feat:`, `fix:`, `docs:`...).

## Stack

NestJS 12 · TypeScript · TypeORM 1 · PostgreSQL 17 · Passport (JWT, Google OAuth2) · class-validator · Swagger · Vitest · Supertest · oxlint · Prettier · Docker · GitHub Actions · Husky · Commitlint

## Licença

[MIT](LICENSE) © Lucas Rinaldi Medeiros Silva
