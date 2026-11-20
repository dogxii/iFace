# Repository Guidelines

## Project Structure & Module Organization

iFace is a Vite React 19 + TypeScript app. Main code lives in `src/`:

- `src/pages/` contains route screens such as `Dashboard`, `Practice`, and `QuestionDetail`.
- `src/ui/` is the v1.5 component library (Radix primitives + Tailwind, variants via `cva`). Use it for all new UI; `src/components/ui/` holds legacy widgets that are being replaced.
- `src/styles/tokens.css` defines design tokens (`bg-canvas`, `text-fg-muted`, `border-line`, `bg-accent`, …) for light and dark themes. Prefer tokens over inline `style={{}}` and raw colors.
- `src/components/layout/` holds legacy shell UI.
- `src/store/` contains app stores, and `src/hooks/` contains React hooks.
- `src/lib/` contains IndexedDB, question loading, and sync helpers.
- `src/types/` and `src/data/` hold shared types and schemas.
- `public/questions/` stores bundled question JSON assets by category.
- `api/auth.js` is the Vercel auth endpoint.

Keep generated or temporary source material in `tmp/` unless it becomes product content.

## Build, Test, and Development Commands

Use Bun for package and script commands.

- `bun install` installs dependencies from `bun.lock`.
- `bun dev` starts the Vite dev server at `http://localhost:5173`.
- `bun run build` runs TypeScript checks and creates the production Vite build.
- `bun run preview` serves the built app.
- `bun run check` runs Biome without writing changes.
- `bun run lint` runs `biome check --write .` and may modify files.
- `bun run format` formats files with Biome.
- `bun run test` runs Vitest unit tests (`src/**/*.test.ts`); `bun run test:e2e` runs Playwright smoke tests in `e2e/`.
- In `bun dev`, open `/design` to see every component and token in light and dark mode (not included in production builds).

## Coding Style & Naming Conventions

Biome is the source of truth. Use 2-space indentation, 100-character lines, single quotes, no required semicolons, trailing commas in JavaScript/TypeScript, and no trailing commas in JSON. Name components and pages in `PascalCase`, hooks as `useSomething`, and stores as `useSomethingStore`. Keep route screens in `src/pages/` and reusable pieces in `src/components/`.

## Testing Guidelines

Before submitting changes, run `bun run check`, `bun run test` and `bun run build`; run `bun run test:e2e` for changes that touch pages or data flow. Place unit tests next to the code under test as `*.test.ts`. For UI changes, also manually verify importing bundled questions, practicing, viewing details, settings, and AI configuration paths in both themes.

The visual direction is documented in `docs/REFACTOR_PLAN.md` and `docs/design/mockup.html`.

## Commit & Pull Request Guidelines

Git history and README use Conventional Commits, for example `feat: update content and fix lint build issues`, `fix: fix synchronization issues`, and `chore: refactor gistSync`. Keep messages imperative and scoped to one concern.

Pull requests should include a short summary, validation commands run, linked issues when applicable, and screenshots for visible UI changes. Mention data migration, IndexedDB, localStorage, or bundled question JSON changes explicitly.

Pull request titles and descriptions should be written in Chinese.

## Security & Configuration Tips

Do not commit secrets. Use `.env.example` as the public template, and keep API keys in local browser settings or environment-specific configuration. Treat imported question JSON as untrusted input and validate changes against the existing schema before publishing.
