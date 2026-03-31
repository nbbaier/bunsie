import { join } from "node:path";
import { Glob } from "bun";
import type { ContentEntry } from "./types";

const CONTENT_DIR_ENV_KEY = "BUNSIE_CONTENT_DIR";
let activeContentDir: string | undefined;

const MD_EXTENSION_REGEX = /\.md$/;
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const UTF8_BOM = "\uFEFF";

export function configureContentDir(dir: string) {
  activeContentDir = dir;
  process.env[CONTENT_DIR_ENV_KEY] = dir;
}

export function setContentDir(dir: string) {
  configureContentDir(dir);
}

function resolveContentDir(override?: string): string {
  if (override) {
    return override;
  }

  const configuredDir = activeContentDir;
  if (configuredDir) {
    return configuredDir;
  }

  const envConfiguredDir = process.env[CONTENT_DIR_ENV_KEY];
  if (envConfiguredDir) {
    return envConfiguredDir;
  }

  throw new Error(
    "Content directory is not configured. Call setContentDir(dir) or pass contentDir explicitly."
  );
}

function normalizeFrontmatter(
  value: unknown,
  filePath: string
): Record<string, unknown> {
  if (value === null || value === undefined) {
    return {};
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      `YAML frontmatter in ${filePath} must parse to an object, got ${typeof value}`
    );
  }
  return value as Record<string, unknown>;
}

function splitFrontmatter(
  raw: string,
  filePath: string
): { frontmatter: Record<string, unknown>; markdown: string } {
  const text = raw.startsWith(UTF8_BOM) ? raw.slice(1) : raw;
  const match = text.match(FRONTMATTER_REGEX);
  if (!match) {
    return { frontmatter: {}, markdown: text };
  }

  const yamlBlock = match[1];
  let parsed: unknown;
  try {
    parsed = Bun.YAML.parse(yamlBlock);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid YAML frontmatter in ${filePath}: ${message}`);
  }

  return {
    frontmatter: normalizeFrontmatter(parsed, filePath),
    markdown: text.slice(match[0].length),
  };
}

async function parseMarkdown(
  filePath: string
): Promise<{ frontmatter: Record<string, unknown>; html: string }> {
  const raw = await Bun.file(filePath).text();
  const { frontmatter, markdown } = splitFrontmatter(raw, filePath);
  return {
    frontmatter,
    html: Bun.markdown.html(markdown),
  };
}

export async function getCollection(
  name: string,
  contentDir?: string
): Promise<ContentEntry[]> {
  const dir = resolveContentDir(contentDir);
  const collectionDir = join(dir, name);
  const glob = new Glob("*.md");
  const entries: ContentEntry[] = [];

  for await (const file of glob.scan({ cwd: collectionDir })) {
    const slug = file.replace(MD_EXTENSION_REGEX, "");
    const filePath = join(collectionDir, file);
    const { frontmatter, html } = await parseMarkdown(filePath);
    entries.push({ slug, frontmatter, html });
  }

  entries.sort((a, b) => a.slug.localeCompare(b.slug));
  return entries;
}

export async function getEntry(
  name: string,
  slug: string,
  contentDir?: string
): Promise<ContentEntry> {
  const dir = resolveContentDir(contentDir);
  const filePath = join(dir, name, `${slug}.md`);
  const { frontmatter, html } = await parseMarkdown(filePath);
  return { slug, frontmatter, html };
}
