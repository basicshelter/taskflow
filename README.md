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

The `/sign-in` and `/sign-up` pages are grouped under `app/(auth)` and are only available while signed out. Authenticated users are redirected to the home page.

## Testing

Run the auth validation and form tests with:

```bash
pnpm test
```

Sign-up and sign-in inputs are checked with shared Zod schemas before requests are sent to Better Auth. Better Auth continues to validate credentials on the server.
