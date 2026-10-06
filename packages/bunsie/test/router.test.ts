import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { resolveRoutes, scanRoutes } from "../src/router";

const DUPLICATE_PARAMS_ERROR = /blog\/hello\/index\.html.*\/blog\/\[slug\]/s;
const STATIC_VS_DYNAMIC_ERROR =
  /blog\/hello\/index\.html.*(\/blog\/hello.*\/blog\/\[slug\]|\/blog\/\[slug\].*\/blog\/hello)/s;

let pagesDir: string;

beforeEach(async () => {
  pagesDir = await mkdtemp(join(tmpdir(), "bunsie-router-"));
});

afterEach(async () => {
  await rm(pagesDir, { force: true, recursive: true });
});

async function writePage(file: string, source: string) {
  const path = join(pagesDir, file);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, source);
}

function resolvePages() {
  return scanRoutes(pagesDir).then(resolveRoutes);
}

describe("resolveRoutes output path collisions", () => {
  test("rejects getStaticPaths returning the same params twice", async () => {
    await writePage(
      "blog/[slug].tsx",
      `export const getStaticPaths = () => [
        { params: { slug: "hello" } },
        { params: { slug: "hello" } },
      ];
      export default () => "";`
    );

    await expect(resolvePages()).rejects.toThrow(DUPLICATE_PARAMS_ERROR);
  });

  test("rejects a static page clashing with a dynamic page's path", async () => {
    await writePage("blog/hello.tsx", `export default () => "";`);
    await writePage(
      "blog/[slug].tsx",
      `export const getStaticPaths = () => [{ params: { slug: "hello" } }];
      export default () => "";`
    );

    await expect(resolvePages()).rejects.toThrow(STATIC_VS_DYNAMIC_ERROR);
  });

  test("accepts distinct output paths", async () => {
    await writePage("index.tsx", `export default () => "";`);
    await writePage(
      "blog/[slug].tsx",
      `export const getStaticPaths = () => [
        { params: { slug: "a" } },
        { params: { slug: "b" } },
      ];
      export default () => "";`
    );

    const resolved = await resolvePages();
    expect(resolved.map((r) => r.outputPath).sort()).toEqual([
      "blog/a/index.html",
      "blog/b/index.html",
      "index.html",
    ]);
  });
});
