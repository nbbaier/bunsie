# Coding standards

Rules for code under `packages/bunsie/src`. For the module map and build pipeline see `docs/architecture.md`; the full doc index is in `AGENTS.md`.

## Validate

Run `bun run check && bun run typecheck && bun run test` for every code change.

## Module-level state

Before adding module-level state that pages or layouts read, see "Two copies of the package" in `docs/architecture.md` and the `PATHS_ENV_KEY` comment in `router.ts`: the CLI and the pages load separate copies of the package, so new state of that kind needs the same `process.env` treatment.

## Escaping HTML

`@kitajs/html` leaves string children unescaped, which is how rendered Markdown passes through. Wrap text from frontmatter or user input with the `safe` attribute or `escapeHtml` from `@kitajs/html`.

## Console output

`console.*` calls in `packages/bunsie/src` are the CLI's user-facing output (build status, dev server, scaffolding); keep them.
