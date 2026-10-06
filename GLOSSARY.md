# bunsie

A static site generator for Bun that turns a directory of JSX pages and Markdown content into plain HTML files.

## Language

### Pages and routes

**Page**:
A source module in the pages directory whose default export renders HTML.
_Avoid_: Template, view, rendered page (for the output)

**Static page**:
A page with no params in its file path; it produces exactly one route.

**Dynamic page**:
A page whose file path contains `[param]` segments and that declares its static paths; it produces one route per static path.
_Avoid_: Dynamic route

**Route pattern**:
The URL shape derived from a page's file path, possibly containing params, e.g. `/blog/[slug]`.
_Avoid_: Route (for the pattern), URL pattern

**Param**:
A named segment of a route pattern, filled in with a concrete value for each route.

**Static path**:
One set of param values (and optional props) that a dynamic page declares, yielding one route.

**Route**:
A single concrete URL the site will serve, produced from a page and, for dynamic pages, one static path.
_Avoid_: Path, URL (as a domain term), resolved route

**Output file**:
The HTML file written to the output directory for a route.
_Avoid_: Page (for the output)
