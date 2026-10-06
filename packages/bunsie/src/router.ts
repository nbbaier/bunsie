import { join, posix } from "node:path";
import { Glob } from "bun";
import { loadModule } from "./module-loader";
import type { PageModule, PathInfo, Route, RoutePath } from "./types";

// Two copies of this package run during a build: the CLI executes the bundled
// dist/cli.mjs, while user pages and layouts import "bunsie" from src/. Each copy
// has its own module-level state, so anything the CLI sets for pages to read
// (paths here, the content dir in content.ts) must also be written to
// process.env and read back from it. test/example-build.test.ts covers this.
const PATHS_ENV_KEY = "BUNSIE_PATHS";
let _paths: PathInfo[] = [];
const TSX_EXTENSION_REGEX = /\.tsx$/;
const BACKSLASH_REGEX = /\\/g;
const LEADING_SLASH_REGEX = /^\/+/;
const CURRENT_DIR_REGEX = /^\.$/;
const TRAILING_SLASHES_REGEX = /\/+$/;
const PARENT_DIR_REGEX = /^\.\.(\/|$)/;
const PARAM_SEGMENT_REGEX = /\[(\w+)\]/g;

function toPathInfo(resolved: RoutePath[]): PathInfo[] {
  return resolved.map((r) => {
    const frontmatter = r.props.frontmatter as
      | Record<string, unknown>
      | undefined;
    return {
      frontmatter,
      params: r.params,
      url: interpolateRoutePattern(r.route.pattern, r.params),
    };
  });
}

export function setPaths(resolved: RoutePath[]) {
  _paths = toPathInfo(resolved);
  process.env[PATHS_ENV_KEY] = JSON.stringify(_paths);
}

export function getPaths(): PathInfo[] {
  if (_paths.length > 0) {
    return _paths;
  }

  const envPaths = process.env[PATHS_ENV_KEY];
  if (!envPaths) {
    return _paths;
  }

  try {
    const parsed: unknown = JSON.parse(envPaths);
    if (!Array.isArray(parsed)) {
      return _paths;
    }
    _paths = parsed as PathInfo[];
  } catch {
    return _paths;
  }

  return _paths;
}

export async function scanRoutes(pagesDir: string): Promise<Route[]> {
  const glob = new Glob("**/*.tsx");
  const routes: Route[] = [];

  for await (const file of glob.scan({ cwd: pagesDir })) {
    const pattern = fileToRoutePattern(file);
    const paramNames = extractParamNames(pattern);
    routes.push({
      filePath: join(pagesDir, file),
      isDynamic: paramNames.length > 0,
      paramNames,
      pattern,
    });
  }

  return routes.sort((a, b) => a.pattern.localeCompare(b.pattern));
}

function fileToRoutePattern(file: string): string {
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
        `Dynamic route ${route.pattern} returned invalid params: missing or empty "${paramName}"`
      );
    }
  }
}

async function resolveDynamicPaths(
  route: Route,
  mod: PageModule
): Promise<RoutePath[]> {
  if (!mod.getStaticPaths) {
    throw new Error(
      `Dynamic route ${route.pattern} must export getStaticPaths()`
    );
  }

  const paths = await mod.getStaticPaths();
  return paths.map(({ params, props }) => {
    validateDynamicParams(route, params);
    return {
      outputPath: routeToOutputPath(route.pattern, params),
      params,
      props: props ?? {},
      route,
    };
  });
}

export async function resolvePaths(routes: Route[]): Promise<RoutePath[]> {
  const perRoute = await Promise.all(
    routes.map(async (route): Promise<RoutePath[]> => {
      const mod = await loadModule<PageModule>(route.filePath);

      if (route.isDynamic) {
        return resolveDynamicPaths(route, mod);
      }

      return [
        {
          outputPath: routeToOutputPath(route.pattern),
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

function assertUniqueOutputPaths(resolved: RoutePath[]) {
  const seen = new Map<string, RoutePath>();
  for (const entry of resolved) {
    const previous = seen.get(entry.outputPath);
    if (previous) {
      throw new Error(
        `Output path collision: ${entry.outputPath} is produced by both ${previous.route.pattern} (${previous.route.filePath}) and ${entry.route.pattern} (${entry.route.filePath})`
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
