import {
  getRoutes,
  isIndexRoute,
  isTopLevelRoute,
  type RouteInfo,
} from "bunsie";

function routeToLabel(route: RouteInfo): string {
  if (isIndexRoute(route)) {
    return "Home";
  }

  const label = route.url.slice(1);
  return label.charAt(0).toUpperCase() + label.slice(1);
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
            <a href={r.url} key={r.url}>
              {routeToLabel(r)}
            </a>
          ))}
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
