import { join } from "node:path";
import { loadModule } from "./module-loader";
import type { LayoutModule, ResolvedRoute } from "./types";

const layoutCache = new Map<string, LayoutModule>();

async function loadLayout(
  layoutsDir: string,
  name: string
): Promise<LayoutModule | null> {
  const key = `${layoutsDir}:${name}`;
  const cached = layoutCache.get(key);
  if (cached) {
    return cached;
  }

  const layoutPath = join(layoutsDir, `${name}.tsx`);
  const file = Bun.file(layoutPath);
  if (!(await file.exists())) {
    return null;
  }

  const mod = await loadModule<LayoutModule>(layoutPath);
  layoutCache.set(key, mod);
  return mod;
}

function defaultLayout(children: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
${children}
</body>
</html>`;
}

export async function renderRoute(
  resolved: ResolvedRoute,
  layoutsDir: string
): Promise<string> {
  const pageHtml = resolved.module.default({
    params: resolved.params,
    ...resolved.props,
  });

  const layoutName = resolved.module.layout ?? "default";
  const layout = await loadLayout(layoutsDir, layoutName);

  if (layout) {
    return layout.default({ children: pageHtml });
  }
  return defaultLayout(pageHtml);
}

export function clearLayoutCache() {
  layoutCache.clear();
}
