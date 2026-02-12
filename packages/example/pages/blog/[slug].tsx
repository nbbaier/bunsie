import type { StaticPath } from "bunsie";
import { getCollection } from "bunsie";

export async function getStaticPaths(): Promise<StaticPath[]> {
	const posts = await getCollection("blog");
	return posts.map((post) => ({
		params: { slug: post.slug },
		props: { frontmatter: post.frontmatter, html: post.html },
	}));
}

export default function BlogPost(props: {
	params: { slug: string };
	frontmatter: Record<string, unknown>;
	html: string;
}) {
	return (
		<article>
			<h1>{String(props.frontmatter.title ?? props.params.slug)}</h1>
			{props.frontmatter.date && <time>{String(props.frontmatter.date)}</time>}
			<div>{props.html}</div>
		</article>
	);
}
