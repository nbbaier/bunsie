import { join, resolve } from "node:path";
import type { ResolvedConfig, SsgConfig } from "./types";

const defaults: Omit<SsgConfig, "root"> = {
	pagesDir: "pages",
	contentDir: "content",
	layoutsDir: "layouts",
	publicDir: "public",
	outDir: "dist",
};

export async function loadConfig(root: string): Promise<ResolvedConfig> {
	const absRoot = resolve(root);
	let userConfig: Partial<SsgConfig> = {};

	const configPath = join(absRoot, "ssg.config.ts");
	const file = Bun.file(configPath);
	if (await file.exists()) {
		const mod = await import(configPath);
		userConfig = mod.default ?? mod;
	}

	const merged = { ...defaults, ...userConfig, root: absRoot };
	return resolvePaths(merged);
}

function resolvePaths(config: SsgConfig): ResolvedConfig {
	return {
		root: config.root,
		pagesDir: resolve(config.root, config.pagesDir),
		contentDir: resolve(config.root, config.contentDir),
		layoutsDir: resolve(config.root, config.layoutsDir),
		publicDir: resolve(config.root, config.publicDir),
		outDir: resolve(config.root, config.outDir),
	};
}
