import type { PathInfo } from "./types";

export const isIndexPath = (path: PathInfo): boolean => path.url === "/";

export const isTopLevelPath = (path: PathInfo): boolean =>
  path.url === "/" || path.url.split("/").filter(Boolean).length === 1;
