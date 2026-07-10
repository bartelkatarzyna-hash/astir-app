# Backend foundation and Docker migration

## Goal

Move Astir from a frontend-only prototype to a full local stack with:

- The current plain HTML, CSS, and JavaScript app preserved under `prototype/`.
- A new Next.js frontend under `frontend/`.
- A NestJS backend package with only the application skeleton.
- A Postgres database running through Docker Compose, usable from OrbStack.
- A local development workflow that starts the frontend, backend, and database together.

This spec only defines the foundation. Product modules, business logic, database tables, auth, scraping, and API routes for real Astir behavior will be added in later specs.

## Product Guardrails

The backend must preserve the product rules in `AGENTS.md`.

- Do not create reporting endpoints for outcome counts.
- Do not expose response rates, rejection totals, streaks, or hidden application totals outside the existing All applications exception.
- Pipeline data returned by future APIs must default to response-only records.
- Applied and closed jobs may exist in storage, but future frontend endpoints must keep them out of Pipeline views.
- The first backend pass must not change product copy or introduce new visible behavior.
- The Next.js frontend should recreate the current prototype screen by screen, with the prototype kept available for visual comparison until the migration is accepted.

## Stack Decision

This migration changes the current "no package.json" implementation into a small monorepo. That is an intentional system-level change required for NestJS, Docker scripts, and database tooling.

Frontend uses Next.js, React, and TypeScript. The existing plain HTML, CSS, and JavaScript app remains as `prototype/` and is treated as the visual and behavioral reference during migration.

Use CSS modules or plain CSS imported through Next.js. Do not introduce Tailwind or a component library in the foundation step unless there is a separate design-system decision.

The current `tokens.css` remains canonical. During the migration, copy it into the Next.js frontend and keep token names stable so prototype and Next.js screens can be compared directly.

Backend uses NestJS with TypeScript.

Database uses Postgres in Docker Compose. OrbStack is the recommended Docker runtime on macOS, but the compose file should stay standard Docker Compose.

## Target Structure

```text
.
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── applications/
│   │   │   │   └── page.tsx
│   │   │   ├── pipeline/
│   │   │   │   └── page.tsx
│   │   │   ├── watchlist/
│   │   │   │   └── page.tsx
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   ├── styles/
│   │   │   └── tokens.css
│   │   └── types/
│   ├── public/
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── Dockerfile
├── prototype/
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   ├── tokens.css
│   ├── sphere.js
│   ├── dev-agentation.js
│   └── assets/
├── backend/
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   ├── health/
│   │   │   ├── health.controller.ts
│   │   │   └── health.module.ts
│   │   ├── config/
│   │   │   ├── config.module.ts
│   │   │   └── env.ts
│   │   └── database/
│   │       ├── database.module.ts
│   │       └── prisma.service.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── test/
│   ├── package.json
│   ├── tsconfig.json
│   └── nest-cli.json
├── docs/
├── docker-compose.yml
├── package.json
├── .env.example
└── README.md
```

Domain folders are intentionally absent. Add them later when the data model and API contracts are specified.

## Backend Skeleton

The backend starts with only bootstrap, config, database connection, and health.

### `backend/src/main.ts`

```ts
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix('api')
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )

  const port = Number(process.env.PORT ?? 3000)
  await app.listen(port, '0.0.0.0')
}

void bootstrap()
```

### `backend/src/app.module.ts`

```ts
import { Module } from '@nestjs/common'
import { ConfigModule } from './config/config.module'
import { DatabaseModule } from './database/database.module'
import { HealthModule } from './health/health.module'

@Module({
  imports: [ConfigModule, DatabaseModule, HealthModule],
})
export class AppModule {}
```

### `backend/src/health/health.module.ts`

```ts
import { Module } from '@nestjs/common'
import { HealthController } from './health.controller'

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

### `backend/src/health/health.controller.ts`

```ts
import { Controller, Get } from '@nestjs/common'

type HealthResponse = {
  status: 'ok'
  service: 'astir-api'
}

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'astir-api',
    }
  }
}
```

### `backend/src/config/env.ts`

```ts
export type Env = {
  NODE_ENV: string
  PORT: string
  DATABASE_URL: string
  FRONTEND_ORIGIN: string
}
```

Use Nest config validation in the implementation. The exact validation library can be chosen during scaffolding.

### `backend/src/database/database.module.ts`

```ts
import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
```

### `backend/src/database/prisma.service.ts`

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
```

### `backend/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Do not add models in this foundation step. The first migration can be created when the application, watchlist, activity, and goal schemas are specified.

## Database Access Decision

Decision: use Prisma for the backend foundation and first production data model.

Why Prisma is the chosen path:

- It gives strong generated TypeScript types from the schema.
- The schema file is a clear single place to review the first Astir data model.
- Prisma Migrate and Prisma Studio are useful while the schema is still forming.
- Returned records are plain objects, which keeps NestJS services simple.
- It works well for a product where the first database work is schema design and CRUD.

Prisma tradeoffs:

- It adds a generated client step.
- Its query API is Prisma-specific rather than SQL-like or repository-based.
- Advanced SQL can require raw queries.
- Very complex domain behavior may need explicit service patterns around the client.

TypeORM advantages:

- Nest has tight first-party integration through `@nestjs/typeorm`.
- Entities can live near their domain modules.
- Repository injection fits NestJS module boundaries nicely.
- QueryBuilder is strong for complex joins and SQL-shaped queries.
- It supports both Data Mapper and Active Record patterns.

TypeORM tradeoffs:

- Decorator-based entities can scatter the schema across modules.
- Runtime entity configuration can be easier to misconfigure than a generated client.
- Type safety is good, but not as strict as Prisma's generated query types.
- The `synchronize` option is unsafe for production and must stay off outside throwaway local work.

Decision record:

- Prisma is the selected ORM for the foundation.
- TypeORM is not part of the planned backend setup.
- Revisit this only if Prisma blocks a concrete Astir requirement, not as an open default choice.

## Root Workspace

Add a root `package.json` with npm workspaces:

```json
{
  "private": true,
  "workspaces": ["frontend", "backend"],
  "scripts": {
    "dev": "docker compose up --build",
    "dev:frontend": "npm run dev --workspace frontend",
    "dev:backend": "npm run start:dev --workspace backend",
    "db:studio": "npm run prisma:studio --workspace backend",
    "db:migrate": "npm run prisma:migrate --workspace backend",
    "build": "npm run build --workspaces",
    "lint": "npm run lint --workspaces",
    "test": "npm run test --workspaces"
  }
}
```

## Prototype Preservation

Move the existing root frontend files into `prototype/`:

- `index.html`
- `app.js`
- `styles.css`
- `tokens.css`
- `sphere.js`
- `dev-agentation.js`
- `assets/`

Keep prototype hash routes unchanged:

- `#today`
- `#watchlist`
- `#pipeline`
- `#applications`

The prototype remains runnable as a static reference. It is not the production frontend after this migration, but it must stay available until each Next.js screen has been compared and accepted.

## Next.js Frontend

Create a new Next.js app in `frontend/`.

Use:

- Next.js App Router.
- React.
- TypeScript.
- Plain CSS or CSS modules.
- The existing Astir tokens copied to `frontend/src/styles/tokens.css`.

Do not use Tailwind in this step. Do not use shadcn/ui or another component library in this step. Astir's component recipes remain hand-rolled on tokens.

Initial routes:

- `/` for Home.
- `/watchlist` for Watchlist.
- `/pipeline` for Pipeline.
- `/applications` for All applications.

The route change from hash routes to path routes is allowed because the prototype keeps the old hash routes available for comparison.

Keep localStorage under `astir.v1` during the first Next.js pass. This avoids mixing UI migration with backend data migration.

Add `frontend/package.json`:

```json
{
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev -H 0.0.0.0 -p 5173",
    "build": "next build",
    "start": "next start -H 0.0.0.0 -p 5173",
    "lint": "eslint .",
    "test": "echo \"No frontend tests configured yet\""
  }
}
```

Install Next.js, React, React DOM, TypeScript, ESLint, and the needed type packages during scaffolding. Commit the generated lockfile. Do not leave dependencies on `latest`.

Add `frontend/next.config.ts`:

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_TARGET ?? 'http://localhost:3000'}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
```

This rewrite is required. In local development, the browser calls `http://localhost:5173/api/*`; Next.js forwards those requests to the NestJS backend. Frontend code must not call `http://localhost:3000` directly, which keeps API requests same-origin in the browser and avoids CORS work during normal development.

### Frontend Migration Rules

- Build Home first, then Watchlist, then Pipeline, then All applications.
- Port tokens before porting components.
- Port shared components before porting screens.
- Use real SVG icon components, not text glyphs.
- Keep all Astir copy rules from `AGENTS.md`.
- Do not add backend reads or writes to product state in the first UI migration.
- Keep the demo and populated states available for comparison.
- Do not delete `prototype/` until a separate cleanup decision.

### Style Comparison

For each migrated screen, compare:

- Layout width, rail behavior, and responsive behavior.
- Token usage.
- Type sizes and font families.
- Card, row, modal, select, date picker, tooltip, and snackbar recipes.
- Empty, populated, hover, focus, keyboard, and reduced-motion states.
- Copy and route behavior.

The migration is not accepted until the Next.js screen is close enough to the prototype that remaining differences are deliberate and documented.

### Frontend API Boundary

All frontend backend calls should go through `/api/*` on the Next.js origin.

Local browser URL:

```text
http://localhost:5173/api/*
```

Local backend target, used only by the Next.js rewrite:

```text
http://localhost:3000/api/*
```

Docker backend target, used only by the Next.js rewrite:

```text
http://backend:3000/api/*
```

For the foundation, only call:

```text
GET /api/health
```

Do not wire product data to the backend until the API contract and data model specs exist.

### Initial Next.js Files

`frontend/src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Astir',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

`frontend/src/app/globals.css`:

```css
@import '../styles/tokens.css';

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-body);
}
```

`frontend/src/app/page.tsx`:

```tsx
export default function HomePage() {
  return (
    <main>
      <h1>Welcome, Alex</h1>
    </main>
  )
}
```

The initial page is only a scaffold. Replace it with the migrated Home screen before considering the frontend foundation complete.

## Backend Package

Create `backend/package.json`:

```json
{
  "private": true,
  "scripts": {
    "start": "nest start",
    "start:dev": "nest start --watch",
    "build": "nest build",
    "lint": "eslint \"src/**/*.ts\"",
    "test": "jest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  }
}
```

Install dependencies during implementation through the Nest CLI or explicit package installs. Pin versions in the generated lockfile rather than leaving production dependencies floating.

Minimum dependency groups:

- Nest core packages.
- TypeScript and Nest CLI dev tooling.
- Config validation tooling.
- Prisma CLI and Prisma client.
- Test tooling created by the Nest scaffold.

## Docker Compose

Add `docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: astir
      POSTGRES_USER: astir
      POSTGRES_PASSWORD: astir
    ports:
      - "5432:5432"
    volumes:
      - astir_db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U astir -d astir"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    environment:
      NODE_ENV: development
      PORT: 3000
      DATABASE_URL: postgresql://astir:astir@db:5432/astir?schema=public
      FRONTEND_ORIGIN: http://localhost:5173
    ports:
      - "3000:3000"
    volumes:
      - ./backend:/app/backend
      - backend_node_modules:/app/backend/node_modules
    depends_on:
      db:
        condition: service_healthy
    command: npm run start:dev --workspace backend

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    working_dir: /app
    environment:
      API_TARGET: http://backend:3000
    ports:
      - "5173:5173"
    volumes:
      - .:/app
      - root_node_modules:/app/node_modules
      - frontend_node_modules:/app/frontend/node_modules
    command: npm run dev:frontend
    depends_on:
      - backend

volumes:
  astir_db:
  root_node_modules:
  frontend_node_modules:
  backend_node_modules:
```

Implementation may use separate Dockerfiles for frontend and backend if that makes dependency installation cleaner. Keep the compose interface stable.

## Frontend Dockerfile

Add `frontend/Dockerfile`:

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json

RUN npm install

COPY frontend frontend

EXPOSE 5173

CMD ["npm", "run", "dev:frontend"]
```

This is a development Dockerfile. It gives the Next.js frontend a repeatable dependency install.

## Backend Dockerfile

Add `backend/Dockerfile`:

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json

RUN npm install

COPY backend backend

EXPOSE 3000

CMD ["npm", "run", "start:dev", "--workspace", "backend"]
```

This is a development Dockerfile. A production Dockerfile should be specified later.

## Environment

Add `.env.example`:

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://astir:astir@localhost:5432/astir?schema=public
FRONTEND_ORIGIN=http://localhost:5173
API_TARGET=http://localhost:3000
```

Do not commit real secrets. Local development credentials may stay simple until auth and deployment exist.

## Migration Phases

1. Create workspace files.
2. Move the current plain app into `prototype/`.
3. Create the Next.js app in `frontend/` and confirm the scaffold page runs.
4. Port tokens and shared component recipes from the prototype into Next.js.
5. Migrate Home first, then Watchlist, Pipeline, and All applications.
6. Scaffold NestJS in `backend/` with the skeleton above.
7. Add Prisma with an empty schema and confirm it can connect to Postgres.
8. Add Docker Compose for `db`, `backend`, and `frontend`.
9. Update README with the new local setup.
10. Add a small frontend API health check only if it does not change visible product behavior.
11. Leave localStorage as the source for product data until the domain API spec is written.

## Later Specs

Write these separately after the foundation is running:

- Data model for applications, companies, watched roles, goal weeks, activity days, notes, and table preferences.
- API contract for Home, Watchlist, Pipeline, All applications, and goals.
- localStorage to database migration plan for existing `astir.v1` users.
- Auth and user ownership model.
- Role ingestion and company careers page monitoring.
- Background jobs, retry behavior, and job source freshness.
- Production deploy, backups, logging, and secrets.

## Acceptance Criteria

- `prototype/` contains the current plain app and preserves all existing screens.
- `frontend/` contains a Next.js app.
- The Next.js frontend ports Astir tokens before screen work begins.
- The migrated Home screen is visually compared against the prototype.
- `backend/` starts with NestJS and exposes `GET /api/health`.
- Postgres starts through Docker Compose.
- Prisma can connect to the database, even with no models.
- `http://localhost:5173` serves Astir.
- `http://localhost:5173/api/health` proxies to the backend.
- `http://localhost:3000/api/health` works directly.
- `docker compose up --build` starts the full local stack in OrbStack or Docker Desktop.
- No real product data has moved out of localStorage yet.
- No new visible UI copy or outcome counts are introduced.

## Verification

Run after implementation:

```bash
npm install
npm run build
npm run lint
docker compose up --build
```

Then check:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3000/api/health
Proxy:    http://localhost:5173/api/health
Database: localhost:5432
```

Expected health response:

```json
{
  "status": "ok",
  "service": "astir-api"
}
```
