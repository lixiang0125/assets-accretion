import { existsSync, readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { renderDocument } from "../client/document";
import { createApiRoutes } from "./api";
import { createAssetStore, type AssetStore } from "./db/store";

const clientRoot = resolve("src/client");

function readClientCss(assetPath: string) {
  if (!assetPath.endsWith(".css") || assetPath.includes("\0")) {
    return null;
  }

  const filePath = resolve(clientRoot, assetPath);
  if (!filePath.startsWith(`${clientRoot}${sep}`) || !existsSync(filePath)) {
    return null;
  }

  return readFileSync(filePath);
}

function cssResponse(assetPath: string) {
  const css = readClientCss(assetPath);
  if (!css) {
    return new Response(null, { status: 404 });
  }

  return new Response(css, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/css; charset=utf-8",
    },
  });
}

export function createApp(store: AssetStore) {
  const app = new Hono();

  app.get("/", () =>
    new Response(renderDocument(), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8",
      },
    })
  );

  app.get("/assets/app.js", async () => {
    const build = await Bun.build({
      entrypoints: ["src/client/main.tsx"],
      minify: process.env.NODE_ENV === "production",
      sourcemap: "none",
      target: "browser",
    });

    if (!build.success) {
      return new Response("前端构建失败", { status: 500 });
    }

    return new Response(build.outputs[0], {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/javascript; charset=utf-8",
      },
    });
  });

  app.get("/assets/styles.css", () => cssResponse("styles.css"));
  app.get("/assets/*", (c) => cssResponse(c.req.path.replace(/^\/assets\//, "")));

  app.get("/favicon.ico", () => new Response(null, { status: 204 }));

  app.route("/api", createApiRoutes(store));

  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      return c.json({ error: error.message }, error.status);
    }

    console.error(error);
    return c.json({ error: "服务器内部错误" }, 500);
  });

  return app;
}

export function createDefaultApp() {
  return createApp(
    createAssetStore(process.env.ASSETS_DB_PATH ?? "data/assets.sqlite")
  );
}
