# Architecture

How `packages/bunsie/src` fits together. For user-facing behavior, see [`cli.md`](cli.md). For domain terms (page, route, path, static path), see [`GLOSSARY.md`](../GLOSSARY.md).

## Module map

| File               | Role                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `cli.ts`           | Entry point for `dist/cli.mjs`. Parses args, then calls `init`, or `loadConfig` + `build`/`dev`.      |
| `init.ts`          | `bunsie init`: scaffold templates (inline strings) and `bun add`. Independent of the build pipeline.  |
| `config.ts`        | Loads `ssg.config.ts`, merges defaults, resolves every directory to an absolute path.                 |
| `build.ts`         | The build pipeline (below).                                                                           |
| `build-context.ts` | Per-build setup: content dir, module cache-bust version, layout cache reset.                          |
| `module-loader.ts` | `loadModule()`: `import()` with a `?v=<build>` query so rebuilds see fresh page/layout modules.       |
| `router.ts`        | Scans `pages/`, resolves dynamic routes via `getStaticPaths()`, stores route metadata (`getRoutes`). |
| `render.ts`        | Renders a page, wraps it in its layout (cached per build), falls back to a built-in HTML shell.       |
| `content.ts`       | Markdown collections: frontmatter (`Bun.YAML`), body (`Bun.markdown`), `getCollection`/`getEntry`.    |
| `dev.ts`           | Dev server: initial build, static serving from `outDir`, file watching, WebSocket live reload.         |
| `helpers.ts`       | Small route predicates (`isIndexRoute`, `isTopLevelRoute`) re-exported for user layouts.              |
| `index.ts`         | Public API that site pages import as `bunsie`.                                                        |
| `types.ts`         | Shared types.                                                                                         |

## Build pipeline

`build(config)` in `build.ts`:

1. Recreate `outDir` and copy `publicDir` into it.
2. `prepareBuildContext`: set the content dir, bump the module load version, clear the layout cache.
3. `scanRoutes` → `resolveRoutes` (loads each page; dynamic pages run `getStaticPaths()`) → `setRoutes`.
4. Render every resolved route in parallel and write `<route>/index.html`.

Route metadata is stored in step 3, before any page renders, so pages and layouts can call `getRoutes()`.

`dev` runs the same `build` on startup and on every debounced file change, then tells connected browsers to reload.

## Two copies of the package

At build time the CLI runs the bundled `dist/cli.mjs`, but site pages and layouts import `bunsie` from `src/` through the workspace link. The two copies do not share module-level variables. Any state the CLI sets for pages to read (routes, the content dir) is also written to `process.env` and read back from there; see the comment on `ROUTES_ENV_KEY` in `router.ts`. New state of that kind needs the same treatment.

## Testing

`packages/bunsie/test/example-build.test.ts` builds `example/` through the bundled CLI and checks the HTML output. It is the only setup that exercises the two-copies path, so changes to routing, content, or rendering should keep it passing. `example/` doubles as its fixture.
