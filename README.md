# Taskflow

Taskflow is a Next.js app with email/password authentication powered by Better Auth, Prisma, and PostgreSQL.

## Local setup

1. Copy `.env.example` to `.env` and set `BETTER_AUTH_SECRET` to a unique secret of at least 32 characters. For example:

   ```bash
   openssl rand -base64 32
   ```

2. Make sure PostgreSQL is running and the `taskflow` database exists. The example connection URL is:

   ```text
   postgres://postgres:password@localhost:5432/taskflow
   ```

3. Generate the Prisma client and create/update the database tables:

   ```bash
   pnpm db:generate
   pnpm db:push
   pnpm db:seed
   ```

   The seed creates the demo users, workspaces, projects, and random tasks. Re-running it replaces the memberships and projects in those four seeded workspaces with the seed data.

4. Start the app:

   ```bash
   pnpm dev
   ```

Visit [http://localhost:3000](http://localhost:3000), then use **Get started** to create an account. Sign-in and sign-up use Better Auth's email/password endpoints; sessions and user records are stored in PostgreSQL.

The `/sign-in` and `/sign-up` pages are grouped under `app/(auth)` and are only available while signed out. After authentication, users with workspace memberships are redirected to `/workspaces`; users without memberships remain on the home page to create their first workspace.

Projects in a workspace open a member-only details page with tasks grouped into To do, In progress, In review, and Done columns.

## Testing

Install the Playwright browser once, then run each test category or the full suite:

```bash
pnpm exec playwright install chromium
pnpm test
```

Tests are grouped under `tests/unit`, `tests/integration`, `tests/api`, and `tests/e2e`. Run one category with `pnpm test:unit`, `pnpm test:integration`, `pnpm test:api`, or `pnpm test:e2e`. The E2E suite uses Playwright in Chromium with API requests stubbed at the network boundary.
