# bunsie

`bunsie` is a convention-first static site generator for Bun. It renders TSX pages with `@kitajs/html`, reads Markdown content collections with YAML frontmatter, and writes a fully static site to disk.

## Features

- File-based routing from `pages/**/*.tsx`
- Dynamic routes with `[param]` segments and `getStaticPaths()`
- Markdown collections from `content/<collection>/*.md`
- Layout components from `layouts/*.tsx`
- Route metadata via `getRoutes()`
- Route helper exports: `isIndexRoute` and `isTopLevelRoute`
- Live reload dev server over WebSocket
- Optional `ssg.config.ts` with sensible defaults

## Requirements

- [Bun](https://bun.sh) v1.0+

## Installation

```bash
bun add bunsie @kitajs/html
```

## Quick Start

```bash
mkdir my-site && cd my-site
bun init -y
bun add bunsie @kitajs/html
mkdir -p pages/blog content/blog layouts public
```

Create or update `tsconfig.json`:

```json
{
   "compilerOptions": {
      "jsx": "react-jsx",
      "jsxImportSource": "@kitajs/html",
      "moduleResolution": "bundler",
      "target": "esnext",
      "module": "esnext"
   }
}
```

Create `pages/index.tsx`:

```tsx
export default function HomePage() {
   return (
      <div>
         <h1>Hello from bunsie</h1>
         <p>Static pages rendered from TSX.</p>
      </div>
   );
}
```

Create `pages/blog/[slug].tsx`:

```tsx
import { getCollection, type StaticPath } from "bunsie";

export async function getStaticPaths(): Promise<StaticPath[]> {
   const posts = await getCollection("blog");
   return posts.map((post) => ({
      params: { slug: post.slug },
      props: { frontmatter: post.frontmatter, html: post.html },
   }));
}

export default function BlogPost(props: {
   params: { slug: string };
   frontmatter: Record<string, unknown>;
   html: string;
}) {
   return (
      <article>
         <h1>{String(props.frontmatter.title ?? props.params.slug)}</h1>
         <div>{props.html}</div>
      </article>
   );
}
```

Create `content/blog/hello.md`:

```markdown
---
title: Hello World
date: 2026-03-01
---

This post is rendered from Markdown.
```

Run the development server:

```bash
bunx bunsie dev
```

Create a production build:

```bash
bunx bunsie build
```

## CLI

```text
Usage: bunsie <build|dev> [--root <path>] [--port <number>]
```

| Command        | Description                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| `bunsie build` | Builds the static site into `outDir` (`dist` by default).                                                             |
| `bunsie dev`   | Runs an initial build, serves output on port `3000`, watches source directories, and triggers live reload on rebuild. |

| Option            | Description                                                                     |
| ----------------- | ------------------------------------------------------------------------------- |
| `--root <path>`   | Sets the project root used to load `ssg.config.ts` and resolve all directories. |
| `--port <number>` | Sets the dev server port (only valid with `bunsie dev`). Defaults to `3000`.    |
| `--help`, `-h`    | Prints CLI usage.                                                               |

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

`bunsie` exports runtime helpers for content and route metadata:

- `getCollection(name, contentDir?)`
- `getEntry(name, slug, contentDir?)`
- `getRoutes()`
- `isIndexRoute(route)`
- `isTopLevelRoute(route)`

Example layout navigation:

```tsx
import {
  getRoutes,
  isIndexRoute,
  isTopLevelRoute,
  type RouteInfo,
} from "bunsie";

function routeToLabel(route: RouteInfo): string {
  if (isIndexRoute(route)) {
    return "Home";
  }

  const label = route.url.slice(1);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function DefaultLayout({ children }: { children: string }) {
   const routes = getRoutes().filter(isTopLevelRoute);

   return (
      <html lang="en">
         <body>
            <nav>
               {routes.map((route) => (
                  <a href={route.url}>{routeToLabel(route)}</a>
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
bun run build:cli
bun run build:example
```

Run the example app:

```bash
bun run --filter=example dev
bun run --filter=example build
```

## Documentation

Full CLI and API reference: [`docs/cli.md`](docs/cli.md)

## License

[MIT](LICENSE)
