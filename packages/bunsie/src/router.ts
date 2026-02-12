import { join } from "node:path";
import { Glob } from "bun";
import type { PageModule, ResolvedRoute, Route } from "./types";

export async function scanRoutes(pagesDir: string): Promise<Route[]> {
	const glob = new Glob("**/*.tsx");
	const routes: Route[] = [];

	for await (const file of glob.scan({ cwd: pagesDir })) {
		const urlPattern = fileToUrlPattern(file);
		const paramNames = extractParamNames(urlPattern);
		routes.push({
			filePath: join(pagesDir, file),
			urlPattern,
			isDynamic: paramNames.length > 0,
			paramNames,
		});
	}

	return routes.sort((a, b) => a.urlPattern.localeCompare(b.urlPattern));
}

function fileToUrlPattern(file: string): string {
	let pattern = file.replace(/\.tsx$/, "").replace(/\\/g, "/");

	if (pattern.endsWith("/index")) {
		pattern = pattern.slice(0, -6) || "/";
	}
	if (pattern === "index") {
		return "/";
	}
	return `/${pattern}`;
}

function extractParamNames(pattern: string): string[] {
	const matches = pattern.match(/\[(\w+)\]/g);
	if (!matches) return [];
	return matches.map((m) => m.slice(1, -1));
}

export async function resolveRoutes(routes: Route[]): Promise<ResolvedRoute[]> {
	const resolved: ResolvedRoute[] = [];

	for (const route of routes) {
		const mod: PageModule = await import(route.filePath);

		if (route.isDynamic) {
			if (!mod.getStaticPaths) {
				throw new Error(
					`Dynamic route ${route.urlPattern} must export getStaticPaths()`,
				);
			}
			const paths = await mod.getStaticPaths();
			for (const { params, props } of paths) {
				const outputPath = routeToOutputPath(route.urlPattern, params);
				resolved.push({
					route,
					params,
					props: props ?? {},
					outputPath,
				});
			}
		} else {
			const outputPath = routeToOutputPath(route.urlPattern);
			resolved.push({
				route,
				params: {},
				props: {},
				outputPath,
			});
		}
	}

	return resolved;
}

export function routeToOutputPath(
	pattern: string,
	params?: Record<string, string>,
): string {
	let path = pattern;
	if (params) {
		for (const [key, value] of Object.entries(params)) {
			path = path.replace(`[${key}]`, value);
		}
	}

	// Remove leading slash
	path = path.replace(/^\//, "");

	if (path === "") {
		return "index.html";
	}
	return `${path}/index.html`;
}
