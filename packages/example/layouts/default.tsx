import {
  getRoutes,
  isIndexRoute,
  isTopLevelRoute,
  LEADING_SLASH_REGEX,
  type RouteInfo,
} from "bunsie";

function routeToLabel(route: RouteInfo): string {
  return isIndexRoute(route)
    ? "Home"
    : route.url.replace(LEADING_SLASH_REGEX, "");
}

export default function DefaultLayout({ children }: { children: string }) {
  const routes = getRoutes()
    .filter(isTopLevelRoute)
    .sort((a, b) => {
      if (a.url === "/") {
        return -1;
      }
      if (b.url === "/") {
        return 1;
      }
      return a.url.localeCompare(b.url);
    });

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        <title>bunsie example</title>
        <link href="/style.css" rel="stylesheet" />
      </head>
      <body>
        <nav>
          {routes.map((r) => (
            <a href={r.url}>
              {routeToLabel(r).charAt(0).toUpperCase() +
                routeToLabel(r).slice(1)}
            </a>
          ))}
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
