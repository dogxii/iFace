# Repository Guidelines

## Project Structure & Module Organization

iFace is a Vite React 19 + TypeScript app. Main code lives in `src/`:

- `src/pages/` contains route screens such as `Dashboard`, `Practice`, and `QuestionDetail`.
- `src/components/layout/` holds shell UI; `src/components/ui/` holds reusable widgets.
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

## Coding Style & Naming Conventions

Biome is the source of truth. Use 2-space indentation, 100-character lines, single quotes, no required semicolons, trailing commas in JavaScript/TypeScript, and no trailing commas in JSON. Name components and pages in `PascalCase`, hooks as `useSomething`, and stores as `useSomethingStore`. Keep route screens in `src/pages/` and reusable pieces in `src/components/`.

## Testing Guidelines

There is no dedicated test runner configured. Before submitting changes, run `bun run check` and `bun run build`. For UI changes, manually verify importing bundled questions, practicing, viewing details, settings, and AI configuration paths. If adding tests, place them near the code under test and add a package script.

## Commit & Pull Request Guidelines

Git history and README use Conventional Commits, for example `feat: update content and fix lint build issues`, `fix: fix synchronization issues`, and `chore: refactor gistSync`. Keep messages imperative and scoped to one concern.

Pull requests should include a short summary, validation commands run, linked issues when applicable, and screenshots for visible UI changes. Mention data migration, IndexedDB, localStorage, or bundled question JSON changes explicitly.

Pull request titles and descriptions should be written in Chinese.

## Security & Configuration Tips

Do not commit secrets. Use `.env.example` as the public template, and keep API keys in local browser settings or environment-specific configuration. Treat imported question JSON as untrusted input and validate changes against the existing schema before publishing.
