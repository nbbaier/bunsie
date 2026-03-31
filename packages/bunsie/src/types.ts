export interface SsgConfig {
  contentDir: string;
  layoutsDir: string;
  outDir: string;
  pagesDir: string;
  publicDir: string;
  root: string;
}

export interface ResolvedConfig extends SsgConfig {
  // All paths resolved to absolute
}

export interface ContentEntry {
  frontmatter: Record<string, unknown>;
  html: string;
  slug: string;
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
  isDynamic: boolean;
  paramNames: string[];
  urlPattern: string;
}

export interface ResolvedRoute {
  module: PageModule;
  outputPath: string;
  params: Record<string, string>;
  props: Record<string, unknown>;
  route: Route;
}

export interface RouteInfo {
  frontmatter?: Record<string, unknown>;
  params: Record<string, string>;
  url: string;
}

export interface LayoutModule {
  default: (props: { children: string }) => string;
}
