# bunsie

A minimal, convention-based static site generator powered by [Bun](https://bun.sh). Write pages as TSX components, author content in Markdown, and build blazing-fast static sites with zero configuration.

## Features

- 📄 **File-based routing** — `pages/` directory maps directly to URLs
- 🔀 **Dynamic routes** — `[param]` patterns with `getStaticPaths()`
- ✍️ **Markdown content** — YAML frontmatter + unified/remark/rehype pipeline
- 🧱 **Layouts** — Reusable HTML shells for consistent page structure
- 🔄 **Live reload** — Dev server with WebSocket-based hot refresh
- ⚡ **Fast builds** — Leverages Bun's native speed for builds and file I/O
- 🛠️ **Zero config** — Sensible defaults, optional `ssg.config.ts` for customization

## Installation

```bash
bun add bunsie
```

## Quick Start

```bash
# Start the dev server with live reload
bunsie dev

# Build for production
bunsie build
```

## Project Structure

```
your-site/
├── ssg.config.ts          # Optional configuration
├── layouts/
│   └── default.tsx        # HTML shell wrapping page content
├── pages/
│   ├── index.tsx          # → /
│   ├── about.tsx          # → /about
│   └── blog/[slug].tsx    # → /blog/:slug (dynamic route)
├── content/
│   └── blog/
│       ├── hello.md       # Markdown with frontmatter
│       └── world.md
└── public/
    └── style.css          # Static assets (copied to output as-is)
```

## Usage

### Static Pages

Create TSX components in the `pages/` directory. Each file becomes a route:

```tsx
// pages/index.tsx → /
export default function Home() {
  return (
    <div>
      <h1>Hello World</h1>
    </div>
  );
}
```

### Markdown Content

Add Markdown files with YAML frontmatter to the `content/` directory:

```markdown
---
title: Hello World
date: 2024-01-01
---

# Hello World

This is a blog post.
```

### Dynamic Routes

Use `[param]` syntax in filenames and export `getStaticPaths()` to generate pages from content:

```tsx
// pages/blog/[slug].tsx
import { getCollection } from "bunsie";
import type { StaticPath } from "bunsie";

export async function getStaticPaths(): Promise<StaticPath[]> {
  const posts = await getCollection("blog");
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { title: post.frontmatter.title, html: post.html },
  }));
}

export default function BlogPost(props: {
  params: { slug: string };
  title: string;
  html: string;
}) {
  return (
    <article>
      <h1>{props.title}</h1>
      <div>{props.html}</div>
    </article>
  );
}
```

### Layouts

Define reusable HTML shells in the `layouts/` directory. Pages are wrapped in the default layout automatically:

```tsx
// layouts/default.tsx
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

### Content API

Bunsie provides helpers to query your Markdown content:

```tsx
import { getCollection, getEntry } from "bunsie";

// Get all entries in a collection
const posts = await getCollection("blog");
// → ContentEntry[] with { slug, frontmatter, html }

// Get a single entry by slug
const post = await getEntry("blog", "hello");
```

## Configuration

Create `ssg.config.ts` in your project root to override defaults:

```ts
import type { SsgConfig } from "bunsie";

export default {
  pagesDir: "pages",     // Page components (default: "pages")
  contentDir: "content", // Markdown content (default: "content")
  layoutsDir: "layouts", // Layout templates (default: "layouts")
  publicDir: "public",   // Static assets (default: "public")
  outDir: "dist",        // Build output (default: "dist")
} satisfies Partial<SsgConfig>;
```

## CLI

```
Usage: bunsie <command> [options]

Commands:
  build              Build the site for production
  dev                Start the dev server with live reload (default: port 3000)

Options:
  --root <path>      Set the project root directory (default: cwd)
```

## License

[MIT](LICENSE)
