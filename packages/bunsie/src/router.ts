import { join } from "node:path";
import { Glob } from "bun";
import { loadModule } from "./module-loader";
import type { PageModule, ResolvedRoute, Route, RouteInfo } from "./types";

let _routes: RouteInfo[] = [];
const TSX_EXTENSION_REGEX = /\.tsx$/;
const BACKSLASH_REGEX = /\\/g;
const LEADING_SLASH_REGEX = /^\//;
const PARAM_SEGMENT_REGEX = /\[(\w+)\]/g;

export function setRoutes(resolved: ResolvedRoute[]) {
  _routes = resolved.map((r) => {
    const frontmatter = r.props.frontmatter as
      | Record<string, unknown>
      | undefined;
    return {
      url: interpolateRoutePattern(r.route.urlPattern, r.params),
      params: r.params,
      frontmatter,
    };
  });
}

export function getRoutes(): RouteInfo[] {
  return _routes;
}

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
  let pattern = file
    .replace(TSX_EXTENSION_REGEX, "")
    .replace(BACKSLASH_REGEX, "/");

  if (pattern.endsWith("/index")) {
    pattern = pattern.slice(0, -6) || "/";
  }
  if (pattern === "index") {
    return "/";
  }
  return `/${pattern}`;
}

function extractParamNames(pattern: string): string[] {
  const matches = pattern.match(PARAM_SEGMENT_REGEX);
  if (!matches) {
    return [];
  }
  return matches.map((m) => m.slice(1, -1));
}

function validateDynamicParams(route: Route, params: Record<string, string>) {
  for (const paramName of route.paramNames) {
    const value = params[paramName];
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(
        `Dynamic route ${route.urlPattern} returned invalid params: missing or empty "${paramName}"`
      );
    }
  }
}

async function resolveDynamicRoute(
  route: Route,
  mod: PageModule,
  resolved: ResolvedRoute[]
) {
  if (!mod.getStaticPaths) {
    throw new Error(
      `Dynamic route ${route.urlPattern} must export getStaticPaths()`
    );
  }

  const paths = await mod.getStaticPaths();
  for (const { params, props } of paths) {
    validateDynamicParams(route, params);
    const outputPath = routeToOutputPath(route.urlPattern, params);
    resolved.push({
      route,
      params,
      props: props ?? {},
      outputPath,
    });
  }
}

export async function resolveRoutes(routes: Route[]): Promise<ResolvedRoute[]> {
  const resolved: ResolvedRoute[] = [];

  for (const route of routes) {
    const mod = await loadModule<PageModule>(route.filePath);

    if (route.isDynamic) {
      await resolveDynamicRoute(route, mod, resolved);
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
  params?: Record<string, string>
): string {
  const path = interpolateRoutePattern(pattern, params).replace(
    LEADING_SLASH_REGEX,
    ""
  );

  if (path === "") {
    return "index.html";
  }
  return `${path}/index.html`;
}

function interpolateRoutePattern(
  pattern: string,
  params?: Record<string, string>
): string {
  if (!params) {
    return pattern;
  }

  let resolvedPattern = pattern;
  for (const [key, value] of Object.entries(params)) {
    resolvedPattern = resolvedPattern.replace(`[${key}]`, value);
  }
  return resolvedPattern;
}
