import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { resolveRoutes, scanRoutes } from "../src/router";

const DUPLICATE_PARAMS_ERROR = /blog\/hello\/index\.html.*\/blog\/\[slug\]/s;
const STATIC_VS_DYNAMIC_ERROR =
  /blog\/hello\/index\.html.*(\/blog\/hello.*\/blog\/\[slug\]|\/blog\/\[slug\].*\/blog\/hello)/s;
const FILE_VS_INDEX_ERROR =
  /about\/index\.html.*(about\.tsx.*about\/index\.tsx|about\/index\.tsx.*about\.tsx)/s;
const MISSING_GET_STATIC_PATHS_ERROR =
  /\/blog\/\[slug\].*must export getStaticPaths\(\)/s;
const INVALID_PARAMS_ERROR =
  /\/blog\/\[slug\] returned invalid params: missing or empty "slug"/;
const NORMALIZED_COLLISION_ERROR = /blog\/b\/index\.html.*\/blog\/\[slug\]/s;
const ESCAPES_OUT_DIR_ERROR = /\/blog\/\[slug\].*outside the output directory/s;
const TRAILING_SLASH_COLLISION_ERROR =
  /blog\/foo\/index\.html.*\/blog\/\[slug\]/s;

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

  test("rejects pages/about.tsx clashing with pages/about/index.tsx", async () => {
    await writePage("about.tsx", `export default () => "";`);
    await writePage("about/index.tsx", `export default () => "";`);

    await expect(resolvePages()).rejects.toThrow(FILE_VS_INDEX_ERROR);
  });

  test("rejects params whose paths normalize to the same output", async () => {
    await writePage(
      "blog/[slug].tsx",
      `export const getStaticPaths = () => [
        { params: { slug: "a/../b" } },
        { params: { slug: "b" } },
      ];
      export default () => "";`
    );

    await expect(resolvePages()).rejects.toThrow(NORMALIZED_COLLISION_ERROR);
  });

  test("rejects params differing only by a trailing slash", async () => {
    await writePage(
      "blog/[slug].tsx",
      `export const getStaticPaths = () => [
        { params: { slug: "foo" } },
        { params: { slug: "foo/" } },
      ];
      export default () => "";`
    );

    await expect(resolvePages()).rejects.toThrow(
      TRAILING_SLASH_COLLISION_ERROR
    );
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

describe("resolveRoutes dynamic route validation", () => {
  test("rejects a dynamic route that does not export getStaticPaths()", async () => {
    await writePage("blog/[slug].tsx", `export default () => "";`);

    await expect(resolvePages()).rejects.toThrow(
      MISSING_GET_STATIC_PATHS_ERROR
    );
  });

  test.each([
    ["an empty string", `{ slug: "" }`],
    ["a non-string value", "{ slug: 42 }"],
    ["a missing key", "{}"],
  ])(
    "rejects getStaticPaths returning %s for a param",
    async (_label, params) => {
      await writePage(
        "blog/[slug].tsx",
        `export const getStaticPaths = () => [{ params: ${params} }];
      export default () => "";`
      );

      await expect(resolvePages()).rejects.toThrow(INVALID_PARAMS_ERROR);
    }
  );

  test.each([["../../escape"], ["../../.."], ["..\\..\\escape"]])(
    "rejects param %p resolving outside the output directory",
    async (slug) => {
      await writePage(
        "blog/[slug].tsx",
        `export const getStaticPaths = () => [{ params: { slug: ${JSON.stringify(slug)} } }];
      export default () => "";`
      );

      await expect(resolvePages()).rejects.toThrow(ESCAPES_OUT_DIR_ERROR);
    }
  );
});
