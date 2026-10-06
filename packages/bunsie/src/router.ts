import { join, posix } from "node:path";
import { Glob } from "bun";
import { loadModule } from "./module-loader";
import type { PageModule, ResolvedRoute, Route, RouteInfo } from "./types";

// Two copies of this package run during a build: the CLI executes the bundled
// dist/cli.mjs, while user pages and layouts import "bunsie" from src/. Each copy
// has its own module-level state, so anything the CLI sets for pages to read
// (routes here, the content dir in content.ts) must also be written to
// process.env and read back from it. test/example-build.test.ts covers this.
const ROUTES_ENV_KEY = "BUNSIE_ROUTES";
let _routes: RouteInfo[] = [];
const TSX_EXTENSION_REGEX = /\.tsx$/;
const BACKSLASH_REGEX = /\\/g;
const LEADING_SLASH_REGEX = /^\//;
const CURRENT_DIR_REGEX = /^\.$/;
const TRAILING_SLASHES_REGEX = /\/+$/;
const PARENT_DIR_REGEX = /^\.\.(\/|$)/;
const PARAM_SEGMENT_REGEX = /\[(\w+)\]/g;

function toRouteInfo(resolved: ResolvedRoute[]): RouteInfo[] {
  return resolved.map((r) => {
    const frontmatter = r.props.frontmatter as
      | Record<string, unknown>
      | undefined;
    return {
      frontmatter,
      params: r.params,
      url: interpolateRoutePattern(r.route.urlPattern, r.params),
    };
  });
}

export function setRoutes(resolved: ResolvedRoute[]) {
  _routes = toRouteInfo(resolved);
  process.env[ROUTES_ENV_KEY] = JSON.stringify(_routes);
}

export function getRoutes(): RouteInfo[] {
  if (_routes.length > 0) {
    return _routes;
  }

  const envRoutes = process.env[ROUTES_ENV_KEY];
  if (!envRoutes) {
    return _routes;
  }

  try {
    const parsed: unknown = JSON.parse(envRoutes);
    if (!Array.isArray(parsed)) {
      return _routes;
    }
    _routes = parsed as RouteInfo[];
  } catch {
    return _routes;
  }

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
      isDynamic: paramNames.length > 0,
      paramNames,
      urlPattern,
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
  mod: PageModule
): Promise<ResolvedRoute[]> {
  if (!mod.getStaticPaths) {
    throw new Error(
      `Dynamic route ${route.urlPattern} must export getStaticPaths()`
    );
  }

  const paths = await mod.getStaticPaths();
  return paths.map(({ params, props }) => {
    validateDynamicParams(route, params);
    return {
      outputPath: routeToOutputPath(route.urlPattern, params),
      params,
      props: props ?? {},
      route,
    };
  });
}

export async function resolveRoutes(routes: Route[]): Promise<ResolvedRoute[]> {
  const perRoute = await Promise.all(
    routes.map(async (route): Promise<ResolvedRoute[]> => {
      const mod = await loadModule<PageModule>(route.filePath);

      if (route.isDynamic) {
        return resolveDynamicRoute(route, mod);
      }

      return [
        {
          outputPath: routeToOutputPath(route.urlPattern),
          params: {},
          props: {},
          route,
        },
      ];
    })
  );

  const resolved = perRoute.flat();
  assertUniqueOutputPaths(resolved);
  return resolved;
}

function assertUniqueOutputPaths(resolved: ResolvedRoute[]) {
  const seen = new Map<string, ResolvedRoute>();
  for (const entry of resolved) {
    const previous = seen.get(entry.outputPath);
    if (previous) {
      throw new Error(
        `Output path collision: ${entry.outputPath} is produced by both ${previous.route.urlPattern} (${previous.route.filePath}) and ${entry.route.urlPattern} (${entry.route.filePath})`
      );
    }
    seen.set(entry.outputPath, entry);
  }
}

function routeToOutputPath(
  pattern: string,
  params?: Record<string, string>
): string {
  const path = posix
    .normalize(
      interpolateRoutePattern(pattern, params)
        .replace(BACKSLASH_REGEX, "/")
        .replace(LEADING_SLASH_REGEX, "")
    )
    .replace(TRAILING_SLASHES_REGEX, "")
    .replace(CURRENT_DIR_REGEX, "");

  if (PARENT_DIR_REGEX.test(path)) {
    throw new Error(
      `Route ${pattern} resolves to "${path}", outside the output directory`
    );
  }

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
