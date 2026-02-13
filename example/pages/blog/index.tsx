import { getRoutes, type RouteInfo } from "bunsie";

const BLOG_POST_PREFIX = "/blog/";

function getDateValue(date: unknown): number {
  if (typeof date !== "string") {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(date);
  if (Number.isNaN(parsed)) {
    return Number.NEGATIVE_INFINITY;
  }

  return parsed;
}

function isBlogPostRoute(route: RouteInfo): boolean {
  return (
    route.url.startsWith(BLOG_POST_PREFIX) &&
    typeof route.params.slug === "string"
  );
}

function getPostTitle(route: RouteInfo): string {
  const title = route.frontmatter?.title;
  if (typeof title === "string" && title.length > 0) {
    return title;
  }

  return route.params.slug;
}

export default function BlogIndexPage() {
  const posts = getRoutes()
    .filter(isBlogPostRoute)
    .sort((a, b) => {
      const byDate =
        getDateValue(b.frontmatter?.date) - getDateValue(a.frontmatter?.date);
      if (byDate !== 0) {
        return byDate;
      }

      return a.url.localeCompare(b.url);
    });

  return (
    <div>
      <h1>Blog</h1>
      <ul>
        {posts.map((post) => (
          <li>
            <a href={post.url}>{getPostTitle(post)}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
