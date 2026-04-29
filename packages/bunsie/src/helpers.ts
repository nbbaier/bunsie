import type { RouteInfo } from "./types";

export const isIndexRoute = (route: RouteInfo): boolean => route.url === "/";

export const isTopLevelRoute = (route: RouteInfo): boolean =>
  route.url === "/" || route.url.split("/").filter(Boolean).length === 1;
