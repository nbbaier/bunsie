# bunsie

A static site generator for Bun that turns a directory of JSX pages and Markdown content into plain HTML files.

## Language

### Pages and routes

**Page**:
A source module in the pages directory whose default export renders HTML.
_Avoid_: Template, view, page (for the output)

**Route**:
The URL shape a page defines through its file path, possibly containing params, e.g. `/blog/[slug]`.
_Avoid_: Route pattern, URL pattern, route (for a concrete URL)

**Static route**:
A route with no params; it yields exactly one path.

**Dynamic route**:
A route with one or more params, whose page declares static paths; it yields one path per static path.
_Avoid_: Dynamic page

**Param**:
A named segment of a route, filled in with a concrete value for each path.

**Static path**:
One set of param values (and optional props) that a dynamic route's page declares.

**Path**:
A single concrete URL the site serves, yielded by a route, e.g. `/blog/hello`.
_Avoid_: Route, resolved route, URL (as a domain term)

**Output file**:
The HTML file written to the output directory for a path.
_Avoid_: Page (for the output)
