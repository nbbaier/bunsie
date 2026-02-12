import { join } from "node:path";
import { Glob } from "bun";
import rehypeStringify from "rehype-stringify";
import remarkExtractFrontmatter from "remark-extract-frontmatter";
import remarkFrontmatter from "remark-frontmatter";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { parse as parseYaml } from "yaml";
import type { ContentEntry } from "./types";

let _contentDir = "";

const MD_EXTENSION_REGEX = /\.md$/;

export function setContentDir(dir: string) {
  _contentDir = dir;
}

const processor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter, ["yaml"])
  .use(remarkExtractFrontmatter, { yaml: parseYaml })
  .use(remarkRehype)
  .use(rehypeStringify);

async function parseMarkdown(
  filePath: string
): Promise<{ frontmatter: Record<string, unknown>; html: string }> {
  const raw = await Bun.file(filePath).text();
  const result = await processor.process(raw);
  return {
    frontmatter: (result.data as Record<string, unknown>) ?? {},
    html: String(result),
  };
}

export async function getCollection(
  name: string,
  contentDir?: string
): Promise<ContentEntry[]> {
  const dir = contentDir ?? _contentDir;
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
  const dir = contentDir ?? _contentDir;
  const filePath = join(dir, name, `${slug}.md`);
  const { frontmatter, html } = await parseMarkdown(filePath);
  return { slug, frontmatter, html };
}
