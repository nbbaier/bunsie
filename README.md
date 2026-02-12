# bunsie

A minimal, convention-based static site generator powered by [Bun](https://bun.sh).

Uses [@kitajs/html](https://github.com/kitajs/html) for JSX-to-string rendering and [unified](https://unifiedjs.com)/remark/rehype for markdown processing.

## Features

- File-based routing with dynamic `[param]` segments
- Markdown content with YAML frontmatter
- JSX layouts and page components (no virtual DOM — compiles to strings)
- Dev server with WebSocket live reload
- Fast builds via Bun

## Project Structure

```
your-site/
├── ssg.config.ts          # Optional config overrides
├── layouts/
│   └── default.tsx        # HTML shell wrapping all pages
├── pages/
│   ├── index.tsx          # → /
│   ├── about.tsx          # → /about
│   └── blog/[slug].tsx    # → /blog/:slug (dynamic)
├── content/
│   └── blog/
│       ├── hello.md       # Markdown with frontmatter
│       └── world.md
└── public/
    └── style.css          # Copied to dist/ as-is
```

## Getting Started

```bash
# Install dependencies
bun install

# Build the example site
cd packages/example
bun run build

# Start the dev server with live reload
bun run dev
```

## Pages

Pages are `.tsx` files in the `pages/` directory. Export a default function that returns JSX:

```tsx
export default function About() {
  return (
    <div>
      <h1>About</h1>
      <p>This is a static page.</p>
    </div>
  );
}
```

## Dynamic Routes

Use `[param]` in filenames and export `getStaticPaths()`:

```tsx
import { getCollection } from "bunsie";
import type { StaticPath } from "bunsie";

export async function getStaticPaths(): Promise<StaticPath[]> {
  const posts = await getCollection("blog");
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { title: post.frontmatter.title, html: post.html },
  }));
}

export default function BlogPost(props: { params: { slug: string }; title: string; html: string }) {
  return (
    <article>
      <h1>{props.title}</h1>
      <div>{props.html}</div>
    </article>
  );
}
```

## Content

Markdown files in `content/` are parsed with frontmatter support:

```markdown
---
title: Hello World
date: 2024-01-01
---

# Hello World

This is a blog post.
```

Access content in pages via `getCollection(name)` or `getEntry(name, slug)`.

## Layouts

Layouts in `layouts/` wrap page content. The `default.tsx` layout is used automatically:

```tsx
export default function DefaultLayout({ children }: { children: string }) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>My Site</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## Config

Create `ssg.config.ts` in your project root to override defaults:

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

## CLI

```bash
bunsie build           # Build the site to dist/
bunsie dev             # Start dev server with live reload
bunsie build --root .  # Specify project root
```
