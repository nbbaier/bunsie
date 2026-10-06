# A route is a pattern; a path is a concrete URL

A route is the URL shape a page defines (`/blog/[slug]`), and each concrete URL it yields is a path (`/blog/hello`). This follows Astro's dominant usage ("dynamic route", `getStaticPaths()`), which bunsie already mirrors and which its users are likely to bring with them. Pre-1.0, we renamed the public API to match rather than keep the old names as aliases: `getRoutes`/`RouteInfo`/`isIndexRoute`/`isTopLevelRoute`/`resolveRoutes`/`ResolvedRoute` became `getPaths`/`PathInfo`/`isIndexPath`/`isTopLevelPath`/`resolvePaths`/`RoutePath`.

## Considered Options

- **Route = concrete URL** (the old public API's meaning). Rejected because it clashes with Astro and with bunsie's own `Route` type and "dynamic route" errors, leaving "route pattern" as a clumsy extra term.
