export default function DefaultLayout({ children }: { children: string }) {
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
					<a href="/">Home</a>
					<a href="/about">About</a>
					<a href="/blog/hello">Blog: Hello</a>
					<a href="/blog/world">Blog: World</a>
				</nav>
				<main>{children}</main>
			</body>
		</html>
	);
}
