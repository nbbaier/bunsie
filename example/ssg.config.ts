import type { SsgConfig } from "bunsie";

const config: Partial<SsgConfig> = {
  pagesDir: "pages",
  contentDir: "content",
  layoutsDir: "layouts",
  publicDir: "public",
  outDir: "dist",
};

export default config;
