import { beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";

// Builds example/ through the bundled CLI, the same path users run. This is the
// only setup where the CLI and the pages load separate copies of the package,
// so it catches build state that fails to reach pages (see router.ts).
const repoRoot = join(import.meta.dir, "../../..");
const distDir = join(repoRoot, "example/dist");
const NAV_REGEX = /<nav>(.*?)<\/nav>/;

function readPage(path: string): Promise<string> {
  return Bun.file(join(distDir, path, "index.html")).text();
}

beforeAll(() => {
  const result = Bun.spawnSync(["bun", "run", "build:example"], {
    cwd: repoRoot,
    stderr: "pipe",
    stdout: "pipe",
  });
  if (result.exitCode !== 0) {
    // "bunsie: command not found" means example/node_modules is missing: run `bun install`.
    throw new Error(
      `build:example failed:\n${result.stdout.toString()}${result.stderr.toString()}`
    );
  }
});

describe("example site build", () => {
  test("layout nav lists top-level routes from getRoutes()", async () => {
    const nav = (await readPage(".")).match(NAV_REGEX)?.[1] ?? "";
    expect(nav).toContain('href="/about"');
    expect(nav).toContain('href="/blog"');
  });

  test("blog index lists posts from getRoutes()", async () => {
    const html = await readPage("blog");
    expect(html).toContain('href="/blog/hello"');
  });

  test("blog post renders markdown from getCollection()", async () => {
    const html = await readPage("blog/hello");
    expect(html).toContain("<article>");
  });
});
