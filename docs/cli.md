# bunsie CLI and Runtime Reference

Behavior of the `bunsie` CLI and the APIs site code imports. Installation and a quick start are in the [README](../README.md); internals are in [`architecture.md`](architecture.md).

## Commands and options

```text
Usage: bunsie <build|dev|init> [--root <path>] [--port <number>] [--name <name>] [--force]
```

| Command | Description                                                                              |
| ------- | ---------------------------------------------------------------------------------------- |
| `init`  | Scaffold a new site, install dependencies, and print next steps.                         |
| `build` | Build the site into the configured output directory.                                     |
| `dev`   | Build once, serve output, watch source directories, and live-reload browsers on rebuild. |

| Option            | Description                                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--root <path>`   | Project root directory for `build`/`dev`. For `init`, used when no positional directory argument is provided. Defaults to the current working directory. |
| `--port <number>` | Dev server port, `1`–`65535`. Defaults to `3000`. Only valid with `dev`.                                                                                 |
| `--name <name>`   | Package name for `init`. Defaults to a sanitized version of the target directory name.                                                                   |
| `--force`         | Overwrite existing scaffold files during `init`.                                                                                                         |
| `--help`, `-h`    | Print usage and exit `0`.                                                                                                                                |

A missing or unknown command, an option used with the wrong command, or any other error prints the message and the usage line, then exits `1`.

## `init`

`bunsie init [directory]` scaffolds a site matching the conventions below: `package.json`, `tsconfig.json` set up for `@kitajs/html` JSX, `ssg.config.ts`, `.gitignore`, a default layout, example pages including a dynamic blog route, a sample post, and base CSS.

- Refuses to run if `package.json` or `ssg.config.ts` already exists in the target, unless `--force` is passed.
- Without `--force`, skips individual files that already exist.
- Runs `bun add bunsie @kitajs/html` in the target. If that fails, prints manual install steps instead of exiting with an error.

## `build`

Empties `outDir`, copies `publicDir` into it (skipped if missing), and writes one `index.html` per path: `/` → `index.html`, `/about` → `about/index.html`, `/blog/hello` → `blog/hello/index.html`.

## `dev`

Builds once, then serves `outDir` and rebuilds when anything in `pagesDir`, `contentDir`, `layoutsDir`, or `publicDir` changes (debounced 100 ms).

- HTML responses get a live-reload script injected before `</body>`. It connects to `/__ws`, reloads on each successful rebuild, and reloads again a second after the socket closes (e.g. after a server restart).
- A failed rebuild logs `Rebuild failed: ...` and the server keeps running.
- `/path` and `/path/` serve `path/index.html`; paths with an extension are served as-is. Path traversal returns `400`, missing files `404`.

## Project conventions

| Directory  | Purpose                                             |
| ---------- | --------------------------------------------------- |
| `pages/`   | TSX page modules; file paths become routes. |
| `content/` | Markdown collections, one subdirectory each.        |
| `layouts/` | TSX layout modules that wrap page HTML.             |
| `public/`  | Static files copied as-is to output.                |
| `dist/`    | Build output (`outDir`, default `dist/`).           |

## Configuration

`ssg.config.ts` in the project root is optional. Its default export (or the module object) is merged over the defaults shown here, and every path is resolved relative to the root.

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

## Pages and routes

Every `pages/**/*.tsx` file is a route: `pages/index.tsx` → `/`, `pages/about.tsx` → `/about`, `pages/blog/index.tsx` → `/blog`, `pages/blog/[slug].tsx` → `/blog/[slug]`.

A page module default-exports a function returning an HTML string. It receives `params` plus any `props` from `getStaticPaths()`. Two optional exports:

- `getStaticPaths()`: required for routes with `[param]` segments. Returns `{ params, props? }[]`; every segment must get a non-empty string param.
- `layout`: name of the layout file to use (`layouts/<layout>.tsx`). Defaults to `default`. If the file doesn't exist, a minimal built-in HTML shell is used.

## Content

- `getCollection(name)` reads `content/<name>/*.md` and returns entries sorted by slug (the file name without `.md`).
- `getEntry(name, slug)` reads a single file.
- Each entry has `slug`, `frontmatter`, and `html`.
- Frontmatter is an optional leading `---` YAML block (a UTF-8 BOM is ignored) and must parse to an object.
- The body is rendered with `Bun.markdown.html()`.

Both functions accept an optional trailing `contentDir` argument for use outside a build.

## Path metadata

`getPaths()` returns `{ url, params, frontmatter? }` for every built path, and is available while any page or layout renders. `frontmatter` is filled in when the path's props include one. `isIndexPath` and `isTopLevelPath` filter that list, e.g. for navigation; the [README](../README.md#content-and-route-apis) has a layout example.

## Programmatic use

`packages/bunsie/src/index.ts` is the full export list, including `loadConfig`, `build`, and `dev(config, port?)`:

```ts
import { dev, loadConfig } from "bunsie";

await dev(await loadConfig(process.cwd()), 8080);
```
