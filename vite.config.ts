// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin, ViteDevServer } from "vite";
import { handleApiRequest } from "./src/server/routes/index";

function apiDevPlugin(): Plugin {
  return {
    name: "api-dev-middleware",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith("/api")) {
          try {
            const host = req.headers.host || "localhost:5173";
            const protocol = req.headers["x-forwarded-proto"] || "http";
            const fullUrl = `${protocol}://${host}${req.url}`;

            const method = req.method || "GET";
            let body: string | undefined = undefined;
            if (method === "POST" || method === "PATCH" || method === "PUT") {
              const chunks: Buffer[] = [];
              for await (const chunk of req) {
                chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
              }
              body = Buffer.concat(chunks).toString("utf-8");
            }

            const headers = new Headers();
            for (const [key, value] of Object.entries(req.headers)) {
              if (value) {
                headers.set(key, Array.isArray(value) ? value.join(", ") : value);
              }
            }

            const standardReq = new Request(fullUrl, {
              method,
              headers,
              ...(body !== undefined && { body }),
            });

            const response = await handleApiRequest(standardReq);
            if (response) {
              res.statusCode = response.status;
              response.headers.forEach((val, key) => {
                res.setHeader(key, val);
              });
              const resBody = await response.text();
              res.end(resBody);
              return;
            }
          } catch (e) {
            console.error("API dev middleware error:", e);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Internal server error" }));
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [apiDevPlugin()],
    resolve: {
      alias: {
        "punycode/": "punycode",
      },
    },
  },
});
