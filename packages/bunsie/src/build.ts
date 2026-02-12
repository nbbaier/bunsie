import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { setContentDir } from "./content";
import { clearLayoutCache, renderRoute } from "./render";
import { resolveRoutes, scanRoutes } from "./router";
import type { ResolvedConfig } from "./types";

export async function build(config: ResolvedConfig) {
	const start = performance.now();

	// Clean dist
	await rm(config.outDir, { recursive: true, force: true });
	await mkdir(config.outDir, { recursive: true });

	// Copy public/ → dist/
	const _publicDir = Bun.file(config.publicDir);
	try {
		await cp(config.publicDir, config.outDir, { recursive: true });
	} catch {
		// public dir may not exist, that's fine
	}

	// Set content dir so page modules can use getCollection/getEntry
	setContentDir(config.contentDir);
	clearLayoutCache();

	// Scan and resolve routes
	const routes = await scanRoutes(config.pagesDir);
	const resolved = await resolveRoutes(routes);

	// Render each route and write output
	let count = 0;
	for (const route of resolved) {
		const html = await renderRoute(route, config.layoutsDir);
		const outPath = join(config.outDir, route.outputPath);
		await mkdir(join(outPath, ".."), { recursive: true });
		await Bun.write(outPath, html);
		count++;
	}

	const elapsed = (performance.now() - start).toFixed(0);
	console.log(`Built ${count} pages in ${elapsed}ms → ${config.outDir}`);
}
