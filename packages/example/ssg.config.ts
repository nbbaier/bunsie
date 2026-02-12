import type { SsgConfig } from "bunsie";

export default {
	pagesDir: "pages",
	contentDir: "content",
	layoutsDir: "layouts",
	publicDir: "public",
	outDir: "dist",
} satisfies Partial<SsgConfig>;
