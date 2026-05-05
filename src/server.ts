import { Hono } from "hono";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { createAssetStore } from "./db";

export const app = new Hono();
const store = createAssetStore(process.env.ASSETS_DB_PATH ?? "data/assets.sqlite");

function isMonth(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function parseId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function parseJson<T>(c: Context) {
  try {
    return (await c.req.json()) as T;
  } catch {
    throw new HTTPException(400, { message: "请求体必须是合法 JSON" });
  }
}

function serveFile(path: string, contentType: string) {
  return new Response(Bun.file(path), {
    headers: { "Content-Type": contentType },
  });
}

app.get("/", () => serveFile("public/index.html", "text/html; charset=utf-8"));
app.get("/styles.css", () => serveFile("public/styles.css", "text/css; charset=utf-8"));
app.get("/app.js", () => serveFile("public/app.js", "text/javascript; charset=utf-8"));

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/asset-types", (c) => c.json({ items: store.listAssetTypes() }));

app.post("/api/asset-types", async (c) => {
  const body = await parseJson<{ name?: unknown; description?: unknown }>(c);
  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    throw new HTTPException(400, { message: "资产类型名称不能为空" });
  }

  try {
    const assetType = store.createAssetType({
      name: body.name,
      description:
        typeof body.description === "string" ? body.description : undefined,
    });
    return c.json({ item: assetType }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("UNIQUE")) {
      throw new HTTPException(409, { message: "资产类型已存在" });
    }
    throw error;
  }
});

app.get("/api/records", (c) => {
  const month = c.req.query("month");
  if (month !== undefined && !isMonth(month)) {
    throw new HTTPException(400, { message: "月份格式必须是 YYYY-MM" });
  }
  return c.json({ items: store.listRecords(month) });
});

app.post("/api/records", async (c) => {
  const body = await parseJson<{
    assetTypeId?: unknown;
    month?: unknown;
    value?: unknown;
    note?: unknown;
  }>(c);

  const assetTypeId = parseId(body.assetTypeId);
  const value = Number(body.value);
  if (assetTypeId === null) {
    throw new HTTPException(400, { message: "assetTypeId 必须是正整数" });
  }
  if (!isMonth(body.month)) {
    throw new HTTPException(400, { message: "月份格式必须是 YYYY-MM" });
  }
  if (!Number.isFinite(value) || value < 0) {
    throw new HTTPException(400, { message: "资产价值必须是非负数字" });
  }

  try {
    const record = store.upsertRecord({
      assetTypeId,
      month: body.month,
      value,
      note: typeof body.note === "string" ? body.note : undefined,
    });
    return c.json({ item: record }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("FOREIGN KEY")) {
      throw new HTTPException(404, { message: "资产类型不存在" });
    }
    throw error;
  }
});

app.get("/api/summary", (c) => {
  const month = c.req.query("month");
  if (month !== undefined && !isMonth(month)) {
    throw new HTTPException(400, { message: "月份格式必须是 YYYY-MM" });
  }
  return c.json(store.getPortfolioSummary(month));
});

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status);
  }

  console.error(error);
  return c.json({ error: "服务器内部错误" }, 500);
});

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3000);
  Bun.serve({
    port,
    fetch: app.fetch,
  });
  console.log(`Server running at http://localhost:${port}`);
}
