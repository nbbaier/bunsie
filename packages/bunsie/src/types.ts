export interface SsgConfig {
	root: string;
	pagesDir: string;
	contentDir: string;
	layoutsDir: string;
	publicDir: string;
	outDir: string;
}

export interface ResolvedConfig extends SsgConfig {
	// All paths resolved to absolute
}

export interface ContentEntry {
	slug: string;
	frontmatter: Record<string, unknown>;
	html: string;
}

export interface StaticPath {
	params: Record<string, string>;
	props?: Record<string, unknown>;
}

export interface PageModule {
	default: (props: Record<string, unknown>) => string;
	getStaticPaths?: () => StaticPath[] | Promise<StaticPath[]>;
	layout?: string;
}

export interface Route {
	filePath: string;
	urlPattern: string;
	isDynamic: boolean;
	paramNames: string[];
}

export interface ResolvedRoute {
	route: Route;
	params: Record<string, string>;
	props: Record<string, unknown>;
	outputPath: string;
}

export interface LayoutModule {
	default: (props: { children: string }) => string;
}
