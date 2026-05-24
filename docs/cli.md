# bunsie CLI and Runtime Reference

`bunsie` is a convention-first static site generator for Bun. This reference documents the complete current command surface, runtime behavior, and exported APIs.

## Requirements

- [Bun](https://bun.sh) v1.0+
- `@kitajs/html` in the site project for TSX page and layout files

Install in a site project:

```bash
bun add bunsie @kitajs/html
```

## CLI Surface

```text
Usage: bunsie <build|dev|init> [--root <path>] [--port <number>] [--name <name>] [--force]
```

| Command | Description                                                                              |
| ------- | ---------------------------------------------------------------------------------------- |
| `init`  | Scaffold a new site, run `bun install`, and print next steps.                            |
| `build` | Build the site into the configured output directory.                                     |
| `dev`   | Build once, serve output, watch source directories, and live-reload browsers on rebuild. |

| Option            | Description                                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--root <path>`   | Project root directory for `build`/`dev`. For `init`, used when no positional directory argument is provided. Defaults to the current working directory. |
| `--port <number>` | Dev server port. Defaults to `3000`. This option is only valid with `dev`.                                                                               |
| `--name <name>`   | Package name for `init`. Defaults to a sanitized version of the target directory name.                                                                   |
| `--force`         | Overwrite existing scaffold files during `init`.                                                                                                         |
| `--help`, `-h`    | Print usage and exit with status code `0`.                                                                                                               |

Examples:

```bash
bunsie init my-site
bunsie init --root ./my-site --name my-site
bunsie init --force
bunsie build
bunsie dev
bunsie build --root ./example
bunsie dev --root /absolute/path/to/site
bunsie dev --port 8080
```

If no command (or an unknown command) is provided, `bunsie` prints:

```text
Usage: bunsie <build|dev|init> [--root <path>] [--port <number>] [--name <name>] [--force]
```

and exits with status code `1`.

## Init Command

`bunsie init [directory]` creates a ready-to-run site with:

- `package.json` with `bunsie` and `@kitajs/html` dependencies
- `tsconfig.json` configured for `@kitajs/html` JSX
- `ssg.config.ts` with default directory names
- Example pages, layout, blog route, sample Markdown post, and base CSS
- `.gitignore` for `node_modules/` and `dist/`

Behavior:

1. Creates the target directory if it does not exist.
2. Refuses to scaffold when `package.json` or `ssg.config.ts` already exists, unless `--force` is passed.
3. Skips individual files that already exist unless `--force` is passed.
4. Runs `bun add bunsie @kitajs/html` in the target directory. If install fails, prints manual install instructions instead of exiting with an error.
5. Prints next steps (`cd`, `bun run dev`, `bun run build`).

## Build Command

`bunsie build` runs the following pipeline:

1. Removes `outDir` recursively and recreates it.
2. Copies `publicDir` into `outDir` recursively. If `publicDir` is missing, this step is skipped.
3. Sets the active content directory for content APIs and clears layout module cache.
4. Scans `pagesDir` for `**/*.tsx` routes.
5. Resolves static and dynamic routes (dynamic routes call `getStaticPaths()`).
6. Stores resolved route metadata for `getRoutes()`.
7. Renders each route and writes HTML files into `outDir`.

Build output line format:

```text
Built <count> pages in <ms>ms → <absolute outDir path>
```

## Dev Command

`bunsie dev` starts with the same build pipeline and then starts a local server.

Default server behavior:

1. Serves from `outDir` on port `3000`.
2. Upgrades `GET /__ws` to a WebSocket endpoint for reload events.
3. Watches `pagesDir`, `contentDir`, `layoutsDir`, and `publicDir` recursively.
4. Debounces file-change rebuilds by `100ms`.
5. On successful rebuild, sends `"reload"` to every connected WebSocket client.

Live reload script injection:

- HTML responses are modified by replacing `</body>` with an inline script plus `</body>`.
- The script opens `ws://<host>/__ws`, reloads on `"reload"`, and reloads after 1 second if the socket closes.

File resolution and MIME behavior:

- Paths ending in `/` resolve to `<path>/index.html`.
- Paths with no extension resolve to `<path>/index.html`.
- Explicit file paths resolve directly.
- Paths that attempt directory traversal return `400 Bad Request`.
- Built-in MIME map includes `.html`, `.css`, `.js`, `.json`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`, `.ico`, `.txt`, `.woff`, and `.woff2`.
- Unknown extensions are served as `application/octet-stream`.
- Missing files return `404 Not Found`.

Shutdown behavior:

- `Ctrl+C` closes file watchers, stops the Bun server, and exits.

Port selection:

- CLI runs dev mode on `3000`.
- Programmatic usage supports a custom port via `dev(config, port)`.
- Passing `--port` to commands other than `dev` throws an error.

## Project Conventions

Default directory layout:

```text
your-site/
├── ssg.config.ts
├── pages/
├── content/
├── layouts/
├── public/
└── dist/
```

Directory meanings:

| Directory  | Purpose                                             |
| ---------- | --------------------------------------------------- |
| `pages/`   | TSX page modules; file paths become route patterns. |
| `content/` | Markdown collections under named subdirectories.    |
| `layouts/` | TSX layout modules used to wrap page HTML.          |
| `public/`  | Static files copied as-is to output.                |
| `dist/`    | Output directory (name configurable).               |

## Configuration

`bunsie` loads `ssg.config.ts` from the project root if it exists. Both `default` export and module-object exports are accepted.

```ts
import type { SsgConfig } from "bunsie";

export default {
   pagesDir: "pages",
   contentDir: "content",
   layoutsDir: "layouts",
   publicDir: "public",
   outDir: "dist",
} satisfies Partial<SsgConfig>;
```

Config defaults:

| Property     | Default     |
| ------------ | ----------- |
| `pagesDir`   | `"pages"`   |
| `contentDir` | `"content"` |
| `layoutsDir` | `"layouts"` |
| `publicDir`  | `"public"`  |
| `outDir`     | `"dist"`    |

Resolved config values are absolute paths rooted at `root`.

## Pages And Routes

Page modules are discovered from `pages/**/*.tsx` and converted to URL patterns:

- `pages/index.tsx` -> `/`
- `pages/about.tsx` -> `/about`
- `pages/blog/index.tsx` -> `/blog`
- `pages/blog/[slug].tsx` -> `/blog/[slug]`

Output paths are generated as:

- `/` -> `index.html`
- `/about` -> `about/index.html`
- `/blog/hello` -> `blog/hello/index.html`

Page module shape:

```ts
interface PageModule {
   default: (props: Record<string, unknown>) => string;
   getStaticPaths?: () => StaticPath[] | Promise<StaticPath[]>;
   layout?: string;
}
```

Dynamic route behavior:

- Route files containing `[param]` segments are dynamic.
- Every dynamic route must export `getStaticPaths()`.
- Missing `getStaticPaths()` throws `Dynamic route <pattern> must export getStaticPaths()`.
- Each returned entry defines `params` and optional `props`.
- Dynamic route params must include all segment keys as non-empty strings.

### Layout Resolution

- `layout` export on a page chooses `layouts/<layout>.tsx`.
- If no `layout` export exists, `layouts/default.tsx` is used when present.
- If the selected layout file does not exist, a built-in minimal HTML layout is used.
- Layout modules are cached per build and cache is cleared before each build/rebuild.

## Content And Markdown

Content APIs:

- `getCollection(name, contentDir?)`
- `getEntry(name, slug, contentDir?)`
- `setContentDir(dir)`

Collection behavior:

- A collection is a subdirectory of `contentDir`.
- `getCollection("blog")` reads `contentDir/blog/*.md`.
- Files are sorted by slug (`localeCompare`) before returning.
- Slug is file name without `.md`.

Frontmatter and Markdown behavior:

- A leading UTF-8 BOM is stripped.
- Frontmatter is parsed only when the file starts with a YAML block delimited by `---`.
- YAML is parsed via `Bun.YAML.parse`.
- Parsed frontmatter must be an object; otherwise an error is thrown.
- Invalid YAML throws an `Invalid YAML frontmatter in <file>` error.
- Markdown body is rendered with `Bun.markdown.html()`.

## Route Metadata And Helper Utilities

Route APIs:

- `getRoutes()` returns an array of `{ url, params, frontmatter? }`.
- Route metadata is populated during route resolution before page rendering.
- `frontmatter` is set when route props include a `frontmatter` object.

Helper exports:

- `isIndexRoute(route)` returns `true` for `/`.
- `isTopLevelRoute(route)` returns `true` for `/` and one-segment URLs like `/about`.
  Example:

```tsx
import { getRoutes, isIndexRoute, isTopLevelRoute } from "bunsie";

const links = getRoutes()
   .filter(isTopLevelRoute)
   .map((route) => ({
      href: route.url,
      label: isIndexRoute(route) ? "Home" : route.url.slice(1),
   }));
```

## Programmatic API

`bunsie` also exports internal build primitives:

- `loadConfig(root)`
- `build(resolvedConfig)`
- `dev(resolvedConfig, port?)`
- `scanRoutes(pagesDir)`
- `resolveRoutes(routes)`
- `renderRoute(resolvedRoute, layoutsDir)`

Programmatic dev server with a custom port:

```ts
import { dev, loadConfig } from "bunsie";

const config = await loadConfig(process.cwd());
await dev(config, 8080);
```

## Exported Types

`bunsie` exports these types:

- `SsgConfig`
- `ResolvedConfig`
- `ContentEntry`
- `StaticPath`
- `PageModule`
- `Route`
- `ResolvedRoute`
- `RouteInfo`
- `LayoutModule`

## Error Reference

| Error                                                                                          | Meaning                                                                    |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `Usage: bunsie <build\|dev\|init> [--root <path>] [--port <number>] [--name <name>] [--force]` | Invalid or missing command.                                                |
| `Project already exists in <path> (...)`                                                       | `init` found existing project markers and `--force` was not passed.        |
| `--name can only be used with the init command`                                                | `--name` was passed to a non-`init` command.                               |
| `--force can only be used with the init command`                                               | `--force` was passed to a non-`init` command.                              |
| `Unknown option: <option>`                                                                     | CLI received an unsupported flag.                                          |
| `Invalid port: <value>`                                                                        | `--port` value is not an integer in the range `1-65535`.                   |
| `--port can only be used with the dev command`                                                 | `--port` was passed to a non-`dev` command.                                |
| `Dynamic route <pattern> must export getStaticPaths()`                                         | Dynamic route file does not export `getStaticPaths()`.                     |
| `Dynamic route <pattern> returned invalid params: missing or empty "<name>"`                   | `getStaticPaths()` returned a path with missing/invalid dynamic params.    |
| `Invalid YAML frontmatter in <file>: <details>`                                                | YAML frontmatter parsing failed.                                           |
| `YAML frontmatter in <file> must parse to an object, got <type>`                               | YAML parsed successfully but produced a non-object value.                  |
| `Rebuild failed: ...`                                                                          | Dev mode rebuild encountered an error and logged it; server keeps running. |
