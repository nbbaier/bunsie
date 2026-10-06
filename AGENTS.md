# bunsie

## Working in this repo

- Verify changes with `bun run check && bun run typecheck && bun run test` (CI runs the same). `bun run fix` applies Biome's autofixes. `bun run test` builds `example/` through the bundled CLI.
- Module map and build pipeline: `docs/architecture.md`. Read it before exploring `packages/bunsie/src`.
- Before adding module-level state in `packages/bunsie/src` that pages or layouts read, see the comment on `ROUTES_ENV_KEY` in `router.ts`: the CLI and the pages load separate copies of the package.
- `@kitajs/html` leaves string children unescaped, which is how rendered Markdown passes through. Wrap text from frontmatter or user input with the `safe` attribute or `escapeHtml` from `@kitajs/html`.
- `console.*` calls in `packages/bunsie/src` are the CLI's user-facing output (build status, dev server, scaffolding); keep them.

## Agent skills

### Issue tracker

Issues live in GitHub Issues (nbbaier/bunsie), managed via the `gh` CLI; external PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `GLOSSARY.md` and `docs/adr/` at the repo root (`docs/adr/` not yet created). See `docs/agents/domain.md`.
