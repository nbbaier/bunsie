import { mkdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

export interface InitOptions {
  force: boolean;
  name?: string;
  targetDir: string;
}

interface ScaffoldFile {
  content: string;
  path: string;
}

const MARKER_FILES = ["package.json", "ssg.config.ts"] as const;

function packageJson(name: string): string {
  return `${JSON.stringify(
    {
      name,
      private: true,
      type: "module",
      scripts: {
        build: "bunsie build",
        dev: "bunsie dev",
      },
    },
    null,
    2
  )}\n`;
}

function tsconfigJson(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        esModuleInterop: true,
        forceConsistentCasingInFileNames: true,
        jsx: "react-jsx",
        jsxImportSource: "@kitajs/html",
        module: "ESNext",
        moduleResolution: "bundler",
        skipLibCheck: true,
        strict: true,
        target: "ESNext",
      },
      include: ["pages", "layouts", "ssg.config.ts"],
    },
    null,
    2
  )}\n`;
}

function ssgConfig(): string {
  return `import type { SsgConfig } from "bunsie";

export default {
  pagesDir: "pages",
  contentDir: "content",
  layoutsDir: "layouts",
  publicDir: "public",
  outDir: "dist",
} satisfies Partial<SsgConfig>;
`;
}

function gitignore(): string {
  return `node_modules/
dist/
.DS_Store
`;
}

function defaultLayout(title: string): string {
  return `import {
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
  const routes = getRoutes()
    .filter(isTopLevelRoute)
    .sort((a, b) => {
      if (a.url === "/") {
        return -1;
      }
      if (b.url === "/") {
        return 1;
      }
      return a.url.localeCompare(b.url);
    });

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        <title>${title}</title>
        <link href="/style.css" rel="stylesheet" />
      </head>
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
`;
}

function indexPage(): string {
  return `export default function HomePage() {
  return (
    <div>
      <h1>Welcome to bunsie</h1>
      <p>A minimal static site generator powered by Bun.</p>
    </div>
  );
}
`;
}

function aboutPage(): string {
  return `export default function AboutPage() {
  return (
    <div>
      <h1>About</h1>
      <p>
        This site was scaffolded with <code>bunsie init</code>. Edit{" "}
        <code>pages/about.tsx</code> to customize this page.
      </p>
    </div>
  );
}
`;
}

function blogIndexPage(): string {
  return `import { getRoutes, type RouteInfo } from "bunsie";

const BLOG_POST_PREFIX = "/blog/";

function getDateValue(date: unknown): number {
  if (typeof date !== "string") {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(date);
  if (Number.isNaN(parsed)) {
    return Number.NEGATIVE_INFINITY;
  }

  return parsed;
}

function isBlogPostRoute(route: RouteInfo): boolean {
  return (
    route.url.startsWith(BLOG_POST_PREFIX) &&
    typeof route.params.slug === "string"
  );
}

function getPostTitle(route: RouteInfo): string {
  const title = route.frontmatter?.title;
  if (typeof title === "string" && title.length > 0) {
    return title;
  }

  return route.params.slug;
}

export default function BlogIndexPage() {
  const posts = getRoutes()
    .filter(isBlogPostRoute)
    .sort((a, b) => {
      const byDate =
        getDateValue(b.frontmatter?.date) - getDateValue(a.frontmatter?.date);
      if (byDate !== 0) {
        return byDate;
      }

      return a.url.localeCompare(b.url);
    });

  return (
    <div>
      <h1>Blog</h1>
      <ul>
        {posts.map((post) => (
          <li>
            <a href={post.url}>{getPostTitle(post)}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
`;
}

function blogSlugPage(): string {
  return `import type { StaticPath } from "bunsie";
import { getCollection } from "bunsie";

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
      {props.frontmatter.date ? (
        <time>{String(props.frontmatter.date)}</time>
      ) : (
        ""
      )}
      <div>{props.html}</div>
    </article>
  );
}
`;
}

function helloPost(): string {
  return `---
title: Hello World
date: 2026-01-01
---

This is the **first** blog post built with bunsie.

- Fast builds with Bun
- JSX templates via @kitajs/html
- Markdown with frontmatter support
`;
}

function styleCss(): string {
  return `* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

body {
  max-width: 720px;
  padding: 2rem;
  margin: 0 auto;
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.6;
  color: #1a1a1a;
}

nav {
  display: flex;
  gap: 1rem;
  padding-bottom: 1rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid #e0e0e0;
}

nav a {
  color: #0066cc;
  text-decoration: none;
}

nav a:hover {
  text-decoration: underline;
}

h1 {
  margin-bottom: 0.5rem;
}

article time {
  display: block;
  margin-bottom: 1rem;
  color: #666;
}

code {
  padding: 0.15rem 0.3rem;
  font-size: 0.9em;
  background: #f4f4f4;
  border-radius: 3px;
}

p {
  margin-bottom: 0.75rem;
}

ul {
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}
`;
}

function getScaffoldFiles(name: string): ScaffoldFile[] {
  return [
    { path: "package.json", content: packageJson(name) },
    { path: "tsconfig.json", content: tsconfigJson() },
    { path: "ssg.config.ts", content: ssgConfig() },
    { path: ".gitignore", content: gitignore() },
    { path: "layouts/default.tsx", content: defaultLayout(name) },
    { path: "pages/index.tsx", content: indexPage() },
    { path: "pages/about.tsx", content: aboutPage() },
    { path: "pages/blog/index.tsx", content: blogIndexPage() },
    { path: "pages/blog/[slug].tsx", content: blogSlugPage() },
    { path: "content/blog/hello.md", content: helloPost() },
    { path: "public/style.css", content: styleCss() },
  ];
}

function fileExists(path: string): Promise<boolean> {
  return Bun.file(path).exists();
}

async function findExistingMarkers(targetDir: string): Promise<string[]> {
  const existing: string[] = [];

  for (const marker of MARKER_FILES) {
    if (await fileExists(join(targetDir, marker))) {
      existing.push(marker);
    }
  }

  return existing;
}

function sanitizePackageName(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? normalized : "bunsie-site";
}

export function resolveInitName(
  name: string | undefined,
  targetDir: string
): string {
  if (name) {
    return sanitizePackageName(name);
  }

  const directoryName = basename(resolve(targetDir));
  return sanitizePackageName(directoryName);
}

export async function init(options: InitOptions): Promise<void> {
  const targetDir = resolve(options.targetDir);
  const name = resolveInitName(options.name, targetDir);
  const existingMarkers = await findExistingMarkers(targetDir);

  if (existingMarkers.length > 0 && !options.force) {
    throw new Error(
      `Project already exists in ${targetDir} (${existingMarkers.join(", ")}). Pass --force to overwrite scaffold files.`
    );
  }

  await mkdir(targetDir, { recursive: true });

  const files = getScaffoldFiles(name);
  const written: string[] = [];

  for (const file of files) {
    const filePath = join(targetDir, file.path);

    if (!options.force && (await fileExists(filePath))) {
      continue;
    }

    await mkdir(join(filePath, ".."), { recursive: true });
    await writeFile(filePath, file.content, "utf8");
    written.push(file.path);
  }

  if (written.length === 0) {
    throw new Error(`No scaffold files were written to ${targetDir}`);
  }

  console.log(`Scaffolded ${written.length} files in ${targetDir}`);

  const install = Bun.spawn(["bun", "add", "bunsie", "@kitajs/html"], {
    cwd: targetDir,
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await install.exited;
  if (exitCode !== 0) {
    console.warn("");
    console.warn("Could not install dependencies automatically.");
    console.warn("Run: bun add bunsie @kitajs/html");
  }

  console.log("");
  console.log("Next steps:");
  if (targetDir !== process.cwd()) {
    console.log(`  cd ${targetDir}`);
  }
  if (exitCode !== 0) {
    console.log("  bun add bunsie @kitajs/html");
  }
  console.log("  bun run dev");
  console.log("  bun run build");
}
