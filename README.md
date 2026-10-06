# bunsie

`bunsie` is a convention-first static site generator for Bun. It renders TSX pages with `@kitajs/html`, reads Markdown content collections with YAML frontmatter, and writes a fully static site to disk.

## Features

- File-based routing from `pages/**/*.tsx`
- Dynamic paths with `[param]` segments and `getStaticPaths()`
- Markdown collections from `content/<collection>/*.md`
- Layout components from `layouts/*.tsx`
- Path metadata via `getPaths()`
- Path helper exports: `isIndexPath` and `isTopLevelPath`
- Live reload dev server over WebSocket
- Optional `ssg.config.ts` with sensible defaults

## Requirements

- [Bun](https://bun.sh) v1.0+

## Installation

```bash
bun add bunsie @kitajs/html
```

## Quick Start

Scaffold a new site:

```bash
bunx bunsie init my-site
cd my-site
bun run dev
```

Or initialize in the current directory:

```bash
mkdir my-site && cd my-site
bunx bunsie init
bun run dev
```

Create a production build:

```bash
bun run build
```

## CLI

`init` scaffolds a site, `build` writes it to `outDir` (`dist/` by default), and `dev` serves it with live reload. Options and behavior are in [`docs/cli.md`](docs/cli.md).

## Project Structure

```text
your-site/
├── ssg.config.ts
├── pages/
│   ├── index.tsx
│   └── blog/[slug].tsx
├── content/
│   └── blog/hello.md
├── layouts/
│   └── default.tsx
├── public/
│   └── style.css
└── dist/
```

## Configuration

`bunsie` reads `ssg.config.ts` from the project root and merges it with defaults.

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

## Content And Route APIs

`bunsie` exports runtime helpers for content and path metadata:

- `getCollection(name, contentDir?)`
- `getEntry(name, slug, contentDir?)`
- `getPaths()`
- `isIndexPath(path)`
- `isTopLevelPath(path)`

Example layout navigation:

```tsx
import {
   getPaths,
   isIndexPath,
   isTopLevelPath,
   type PathInfo,
} from "bunsie";

function pathToLabel(path: PathInfo): string {
   if (isIndexPath(path)) {
      return "Home";
   }

   const label = path.url.slice(1);
   return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function DefaultLayout({ children }: { children: string }) {
   const paths = getPaths().filter(isTopLevelPath);

   return (
      <html lang="en">
         <body>
            <nav>
               {paths.map((path) => (
                  <a href={path.url}>{pathToLabel(path)}</a>
               ))}
            </nav>
            <main>{children}</main>
         </body>
      </html>
   );
}
```

## Monorepo Development

This repository is a Bun workspace with:

- `packages/bunsie` (the CLI and library)
- `example` (example site)

Run from repository root:

```bash
bun install
bun run check
bun run fix
bun run typecheck
bun run test
bun run build:cli
bun run build:example
```

Run the example app:

```bash
bun run --filter=example dev
bun run --filter=example build
```

## Documentation

- CLI and API reference: [`docs/cli.md`](docs/cli.md)
- How the source fits together: [`docs/architecture.md`](docs/architecture.md)

## License

[MIT](LICENSE)
