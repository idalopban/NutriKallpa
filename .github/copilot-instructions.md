<!-- .github/copilot-instructions.md - Guidance for AI coding agents -->

# Copilot instructions — Proyecto ComVida

Purpose: give an AI coding agent just-enough, concrete knowledge to be productive in this repo.

- **Big picture**: This is a Next.js (App Router) TypeScript application. UI lives under `src/app` and `src/components`; domain logic lives under `src/lib`. The app is localized/implemented with Spanish domain names (e.g. `calculos-nutricionales.ts`) — expect Spanish identifiers.

- **Key directories & roles**:
  - `src/app`: Next.js routes and layouts (App Router). Example entry: `src/app/layout.tsx` and `(main)/layout.tsx` for the dashboard area.
  - `src/components`: React components and UI primitives. Reusable primitives are under `src/components/ui` (e.g. `button.tsx`, `input.tsx`, `toaster.tsx`). Follow existing naming/props patterns.
  - `src/lib`: Domain logic and utilities. Important files:
    - `src/lib/calculos-nutricionales.ts` — core anthropometry & formulas (primary business logic). Use these functions when changing calculation behavior.
    - `src/lib/diet-generator.ts` and `src/lib/csv-parser.ts` — diet generation and CSV food parsing. `public/alimentos.csv` contains the food DB sample.
    - `src/lib/api-client.ts`, `src/lib/postgrest.ts` — external integrations (Supabase/PostgREST style client wrappers).
  - `src/hooks` and `src/store`: client hooks and lightweight state (Zustand-like patterns). Inspect `useAuthStore.ts` and `useNotificationStore.ts` for usage patterns.
  - `scripts/`: verification scripts (`verify_calculations.ts`, `verify_profiles.ts`) used for domain validation — good reference tests for numerical behavior.

- **Build / dev / lint commands** (from `package.json`):
  - `npm run dev` — dev server using `next dev --turbopack`.
  - `npm run build` — production build (`next build`).
  - `npm run start` — serve (`next start --port 3000`).
  - `npm run lint` — runs `next lint`.
  Note: `dev:debug` sets `NODE_OPTIONS='--inspect'` in `package.json` using single quotes which is not compatible with Windows PowerShell; on PowerShell use `setx NODE_OPTIONS "--inspect"` or run `cmd /C "set NODE_OPTIONS=--inspect && npm run dev"` when debugging.

- **Project conventions & patterns**:
  - TypeScript with `strict: true` and path alias `@/*` -> `./src/*` (see `tsconfig.json`). Use `@/` imports for project files.
  - Filenames and identifiers often use Spanish domain terms (e.g. `calcularComposicionCorporal`, `medidas`, `pliegues`). When adding new functions mirror the existing naming style in the same file/language.
  - UI primitives live in `src/components/ui` and are used across pages — prefer these primitives over ad-hoc HTML when adding UI.
  - Domain logic is kept out of components: heavy calculations live in `src/lib/*`. Reuse those exported functions rather than re-implementing formulas in components.

- **Integration points & external dependencies**:
  - `@zoerai/integration` and `@zoerai/zoer-copilot` are included — these may wrap AI or product-specific integrations. Inspect `src/lib/api-client.ts` and any `@zoerai` usages before modifying integration flows.
  - `@supabase/postgrest-js` is present; `src/lib/postgrest.ts` wraps database calls.
  - Static data: `public/alimentos.csv` is parsed by `src/lib/csv-parser.ts` and consumed by `diet-generator.ts`.
  - `next.config.ts` adds custom headers (CORS + CSP tweaks) and `images.remotePatterns` — be careful when changing headers since they affect API access from external services.

- **Where to look for examples**:
  - Calculation pipeline: `src/lib/calculos-nutricionales.ts` — shows how inputs (`MedidasAntropometricas`) are validated and how multiple formula variants are selected.
  - Diet generation: `src/lib/diet-generator.ts` — shows deterministic categorization and a two-phase generation/optimization flow.
  - CSV ingestion: `src/lib/csv-parser.ts` + `public/alimentos.csv` — demonstrates parsing shape and expected `Alimento` fields.
  - UI usage: `src/components/antropometria/FormularioMedidas.tsx` and `src/components/antropometria/ComposicionResumen.tsx` show how forms submit data to calculation helpers and display results.

- **Immediate tasks an AI agent can do safely**:
  - Add unit-style verification by converting existing `scripts/verify_*.ts` logic into small test files (no global changes). Use `scripts/` as a spec reference.
  - Add a small Storybook-like demo of `src/components/ui` primitives (isolated pages under `src/app/(main)/example`) to document props — keep changes inside `src/components`.

- **What is NOT present / what to ask the human**:
  - There are no automated tests or CI scripts in the repo. Ask where tests should run (local only, GitHub Actions, etc.) before adding CI.
  - Secrets or DB connection information are not in the repo — ask whether to add environment variable docs when touching `src/lib/postgrest.ts`.

If anything is unclear or you want the instructions to emphasise a different area (API, tests, CI, or the `@zoerai` integration), tell me which area to expand and I'll update this file.
