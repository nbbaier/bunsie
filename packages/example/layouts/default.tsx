import { getRoutes, type RouteInfo } from "bunsie";

function routeToLabel(route: RouteInfo): string {
	if (route.url === "/") return "Home";
	if (!route.params.slug) return route.url.replace(/^\//, "");
	return route.params.slug;
}

export default function DefaultLayout({ children }: { children: string }) {
	const routes = getRoutes().sort((a, b) => {
		const aOrder = a.frontmatter ? a.frontmatter.navOrder : 0;
		const bOrder = b.frontmatter ? b.frontmatter.navOrder : 0;
		return (aOrder as number) - (bOrder as number);
	});

	console.log(routes);

	return (
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>bunsie example</title>
				<link rel="stylesheet" href="/style.css" />
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
