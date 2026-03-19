# Repository Guidelines

## Project Structure & Module Organization
`src/app` contains the Next.js App Router entry points, grouped by route area such as `(admin)`, `(app)`, `(auth)`, and API handlers under `src/app/api`. Reusable UI lives in `src/components`, with domain-specific folders like `admin`, `event`, `schedule`, and `ui`. Shared logic belongs in `src/lib`, including `actions` and `services`, while shared TypeScript types live in `src/types`. Database schema, migrations, and seed logic are under `prisma`. Supporting product, UI, delivery, and manual test notes are in `docs`.

## Build, Test, and Development Commands
Use `pnpm` for all package tasks.

- `pnpm dev`: start the local Next.js dev server.
- `pnpm build`: run `prisma generate` and build the production app.
- `pnpm start`: serve the built app.
- `pnpm lint`: run the Next.js ESLint configuration.
- `pnpm db:push`: sync the Prisma schema to the configured database.
- `pnpm db:seed`: execute `prisma/seed.ts`.
- `pnpm db:studio`: open Prisma Studio for local data inspection.

## Sync Workflow
When asked to sync changes from `~/github/orqestra` into this repository, use `/Users/rafa/bin/ordenaia-sync`. This sync is one-way into `/Users/rafa/github/ordenaia`, excludes Git files, preserves local-only assistant files such as `.claude`, `.env`, `AGENTS.md`, and `CLAUDE.md`, and should preview deletions before applying them.

## Coding Style & Naming Conventions
The codebase uses TypeScript, React, and Next.js 16. Follow the existing style: double quotes, semicolons, and straightforward functional components. Use 2-space indentation in JSON and preserve the surrounding file style elsewhere. Name React components in `PascalCase`, utility functions in `camelCase`, and route folders with clear lowercase names. Run `pnpm lint` before opening a PR.

## Testing Guidelines
There is no automated test runner configured yet. Treat `pnpm lint` and a production build with `pnpm build` as the minimum verification for every change. When changing database flows, also validate with `pnpm db:seed` or `pnpm db:push` as appropriate. Document manual checks in the PR, especially for route behavior and admin workflows.

## Commit & Pull Request Guidelines
The visible history is minimal (`first commit`), so keep commit messages short, imperative, and specific, for example `Add participant schedule filters`. Avoid mixing unrelated changes in one commit. PRs should include a clear summary, note any schema or environment changes, link the relevant issue if one exists, and attach screenshots for UI work.

## Security & Configuration Tips
Keep secrets in `.env` and never commit real credentials. Review Prisma migration changes carefully before merging, and call out any new external integrations or auth changes in the PR description.
