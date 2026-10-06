import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { prepareBuildContext } from "./build-context";
import { renderRoute } from "./render";
import { resolveRoutes, scanRoutes, setRoutes } from "./router";
import type { ResolvedConfig } from "./types";

export async function build(config: ResolvedConfig) {
  const start = performance.now();

  // Clean dist
  await rm(config.outDir, { force: true, recursive: true });
  await mkdir(config.outDir, { recursive: true });

  // Copy public/ → dist/
  try {
    await cp(config.publicDir, config.outDir, { recursive: true });
  } catch {
    // public dir may not exist, that's fine
  }

  // Set build context so page modules can resolve content and hot-reload cleanly.
  prepareBuildContext(config);

  // Scan and resolve routes
  const routes = await scanRoutes(config.pagesDir);
  const resolved = await resolveRoutes(routes);
  setRoutes(resolved);

  // Render each route and write output
  await Promise.all(
    resolved.map(async (route) => {
      const html = await renderRoute(route, config.layoutsDir);
      const outPath = join(config.outDir, route.outputPath);
      await mkdir(join(outPath, ".."), { recursive: true });
      await Bun.write(outPath, html);
    })
  );

  const elapsed = (performance.now() - start).toFixed(0);
  console.log(
    `Built ${resolved.length} pages in ${elapsed}ms → ${config.outDir}`
  );
}
