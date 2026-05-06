import { readFileSync } from "node:fs";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { renderDocument } from "../client/document";
import { createApiRoutes } from "./api";
import { createAssetStore, type AssetStore } from "./db/store";

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

  app.get("/assets/styles.css", () =>
    new Response(readFileSync("src/client/styles.css"), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/css; charset=utf-8",
      },
    })
  );

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
