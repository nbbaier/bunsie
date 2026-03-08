import { type FSWatcher, watch } from "node:fs";
import { extname, isAbsolute, join, normalize } from "node:path";
import type { ServerWebSocket } from "bun";
import { build } from "./build";
import type { ResolvedConfig } from "./types";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const LEADING_SLASHES_REGEX = /^\/+/;
const TRAILING_SLASH_REGEX = /\/+$/;
const PARENT_PATH_SEGMENT_REGEX = /(^|[\\/])\.\.([\\/]|$)/;

const WS_CLIENT_SCRIPT = `<script>
(function() {
  const ws = new WebSocket("ws://" + location.host + "/__ws");
  ws.onmessage = function(e) {
    if (e.data === "reload") location.reload();
  };
  ws.onclose = function() {
    setTimeout(function() { location.reload(); }, 1000);
  };
})();
</script>`;

function getSafeFilePath(outDir: string, pathname: string): string | null {
  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const cleanedPathname = decodedPathname
    .replace(LEADING_SLASHES_REGEX, "")
    .replace(TRAILING_SLASH_REGEX, "");
  const normalizedPath = normalize(cleanedPathname);

  if (
    PARENT_PATH_SEGMENT_REGEX.test(normalizedPath) ||
    isAbsolute(normalizedPath)
  ) {
    return null;
  }

  const relativePath =
    pathname.endsWith("/") || !extname(normalizedPath)
      ? join(normalizedPath, "index.html")
      : normalizedPath;

  return join(outDir, relativePath);
}

function injectLiveReloadScript(html: string): string {
  if (html.includes("</body>")) {
    return html.replace("</body>", `${WS_CLIENT_SCRIPT}</body>`);
  }
  return `${html}${WS_CLIENT_SCRIPT}`;
}

export async function dev(config: ResolvedConfig, port = 3000) {
  // Initial build
  await build(config);

  const clients = new Set<ServerWebSocket<unknown>>();

  const server = Bun.serve({
    port,
    fetch(req, server) {
      const url = new URL(req.url);

      // WebSocket upgrade
      if (url.pathname === "/__ws") {
        if (server.upgrade(req)) {
          return;
        }
        return new Response("WebSocket upgrade failed", { status: 400 });
      }

      // Serve static files from dist
      const filePath = getSafeFilePath(config.outDir, url.pathname);
      if (!filePath) {
        return new Response("Bad Request", { status: 400 });
      }

      const file = Bun.file(filePath);
      return file.exists().then((exists) => {
        if (!exists) {
          return new Response("Not Found", { status: 404 });
        }

        const ext = extname(filePath);
        const contentType = MIME_TYPES[ext] || "application/octet-stream";

        // Inject live reload script into HTML
        if (ext === ".html") {
          return file.text().then((html) => {
            const injected = injectLiveReloadScript(html);
            return new Response(injected, {
              headers: { "Content-Type": "text/html" },
            });
          });
        }

        return new Response(file, {
          headers: { "Content-Type": contentType },
        });
      });
    },
    websocket: {
      open(ws) {
        clients.add(ws);
      },
      message() {
        // Dev websocket only pushes server -> client reload events.
      },
      close(ws) {
        clients.delete(ws);
      },
    },
  });

  console.log(`Dev server running at http://localhost:${port}`);

  // Watch for changes
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const watchers: FSWatcher[] = [];

  const dirsToWatch = [
    config.pagesDir,
    config.contentDir,
    config.layoutsDir,
    config.publicDir,
  ];
  for (const dir of dirsToWatch) {
    try {
      const watcher = watch(dir, { recursive: true }, () => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(async () => {
          console.log("Change detected, rebuilding...");
          try {
            await build(config);
            for (const ws of clients) {
              ws.send("reload");
            }
          } catch (err) {
            console.error("Rebuild failed:", err);
          }
        }, 100);
      });
      watchers.push(watcher);
    } catch {
      // Directory may not exist
    }
  }

  // Clean shutdown
  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    for (const w of watchers) {
      w.close();
    }
    server.stop();
    process.exit(0);
  });
}
