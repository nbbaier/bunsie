import type { SsgConfig } from "bunsie";

const config: Partial<SsgConfig> = {
  contentDir: "content",
  layoutsDir: "layouts",
  outDir: "dist",
  pagesDir: "pages",
  publicDir: "public",
};

export default config;
