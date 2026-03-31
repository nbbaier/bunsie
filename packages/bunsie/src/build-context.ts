import { configureContentDir } from "./content";
import { setModuleLoadVersion } from "./module-loader";
import { clearLayoutCache } from "./render";
import type { ResolvedConfig } from "./types";

export function prepareBuildContext(config: ResolvedConfig) {
  configureContentDir(config.contentDir);
  setModuleLoadVersion(`${Date.now()}`);
  clearLayoutCache();
}
