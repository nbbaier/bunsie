# bun-ssg: A Static Site Generator Built on Bun

## Context

Bun has bundling, JSX, fast file I/O, and a built-in HTTP server — but no true SSG pipeline (template + data → static pages). This project fills that gap: a minimal, convention-based static site generator that leverages what Bun already provides instead of reinventing it.

## Architecture

```
project/
├── pages/              # JSX/TSX templates → routes
│   ├── index.tsx       # → /index.html
│   ├── about.tsx       # → /about/index.html
│   └── blog/
│       └── [slug].tsx  # → /blog/:slug/index.html (one per .md)
├── content/
│   └── blog/           # Markdown + frontmatter
│       ├── hello.md
│       └── world.md
├── layouts/            # Wrapper components (optional)
│   └── default.tsx
├── public/             # Copied as-is to dist/
├── dist/               # Build output
├── ssg.config.ts       # Optional config
└── package.json
```

## Core Modules

### 1. Content Loader (`src/content.ts`)

- Scan `content/` directory recursively
- Parse `.md` files: extract YAML frontmatter with `gray-matter`, render body to HTML with `marked`
- Return typed content collections keyed by directory name:
   ```ts
   getCollection("blog") → [{ slug, frontmatter, html }]
   getEntry("blog", "hello") → { slug, frontmatter, html }
   ```

### 2. Router (`src/router.ts`)

- Scan `pages/` directory recursively
- Map files to routes:
   - `pages/index.tsx` → `/`
   - `pages/about.tsx` → `/about`
   - `pages/blog/[slug].tsx` → one route per content entry
- Each page module exports:

   ```tsx
   // Required: the page component
   export default function Page({ params, content }) { ... }

   // Optional: for dynamic routes like [slug].tsx
   export function getStaticPaths() {
     return getCollection("blog").map(post => ({
       params: { slug: post.slug },
       props: { post }
     }))
   }
   ```

### 3. Renderer (`src/render.ts`)

- Import each page's JSX component
- For dynamic routes, call `getStaticPaths()` to enumerate all pages
- Render JSX to HTML string using `react-dom/server` (`renderToStaticMarkup` — no hydration needed)
- Wrap in layout if page specifies one (via export or frontmatter)
- Write final HTML to `dist/`

### 4. Builder (`src/build.ts`)

Orchestrates the full build:

1. Clean `dist/`
2. Copy `public/` → `dist/`
3. Load all content collections
4. Discover all page routes
5. For each route: render JSX → HTML, write to `dist/`
6. Run `Bun.build()` on any client-side JS/CSS referenced in pages (optional asset bundling)

### 5. Dev Server (`src/dev.ts`)

- `Bun.serve()` to serve `dist/` with a fallback to rebuilding on request
- `fs.watch()` on `pages/`, `content/`, `layouts/` — trigger rebuild on changes
- Inject a tiny live-reload script (`<script>` with WebSocket) into served HTML
- WebSocket endpoint that sends `reload` message after rebuild completes

### 6. CLI (`src/cli.ts`)

Entry point using `Bun.argv`:

```bash
bun-ssg build          # Full production build → dist/
bun-ssg dev            # Dev server with watch + live reload
bun-ssg new <name>     # Scaffold a new project (stretch goal)
```

## Dependencies

Minimal — lean on Bun builtins where possible:

| Dep                   | Purpose                                |
| --------------------- | -------------------------------------- |
| `react` + `react-dom` | JSX rendering (`renderToStaticMarkup`) |
| `gray-matter`         | Frontmatter parsing                    |
| `marked`              | Markdown → HTML                        |

No bundler needed for the SSG itself — Bun runs TypeScript/JSX natively. `Bun.build()` is only used for optional client-side asset bundling.

## Config (`ssg.config.ts`, optional)

```ts
export default {
   contentDir: "content",
   pagesDir: "pages",
   layoutsDir: "layouts",
   outDir: "dist",
   publicDir: "public",
};
```

Sensible defaults for everything — config file is optional.

## Implementation Order

1. **Content loader** — parse markdown + frontmatter, return collections
2. **Router** — scan pages/, map to routes, handle `[slug]` patterns
3. **Renderer** — JSX → static HTML string with layout wrapping
4. **Builder** — wire it all together, write to dist/
5. **Dev server** — Bun.serve + fs.watch + WebSocket live reload
6. **CLI** — entry point with `build` and `dev` commands

## Verification

- Create a sample site with a homepage, an about page, and 2-3 blog posts
- Run `bun-ssg build` and verify `dist/` contains correct HTML files
- Run `bun-ssg dev`, edit a markdown file, confirm live reload works
- Check that layouts wrap pages correctly
- Check that `[slug].tsx` generates one HTML file per content entry
