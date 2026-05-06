import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AssetStore } from "../db/store";
import { errorMessage, isMonth, parseId, parseJson } from "./http";

export function createRecordRoutes(store: AssetStore) {
  const routes = new Hono();

  routes.get("/", (c) => {
    const month = c.req.query("month");
    if (month !== undefined && !isMonth(month)) {
      throw new HTTPException(400, { message: "月份格式必须是 YYYY-MM" });
    }
    return c.json({ items: store.listRecords(month) });
  });

  routes.post("/", async (c) => {
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
      if (errorMessage(error).includes("FOREIGN KEY")) {
        throw new HTTPException(404, { message: "资产类型不存在" });
      }
      throw error;
    }
  });

  routes.put("/:id", async (c) => {
    const recordId = parseId(c.req.param("id"));
    const body = await parseJson<{
      assetTypeId?: unknown;
      month?: unknown;
      value?: unknown;
      note?: unknown;
    }>(c);

    const assetTypeId = parseId(body.assetTypeId);
    const value = Number(body.value);
    if (recordId === null) {
      throw new HTTPException(400, { message: "记录 id 必须是正整数" });
    }
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
      const record = store.updateRecord(recordId, {
        assetTypeId,
        month: body.month,
        value,
        note: typeof body.note === "string" ? body.note : undefined,
      });
      if (!record) {
        throw new HTTPException(404, { message: "月度记录不存在" });
      }
      return c.json({ item: record });
    } catch (error) {
      const message = errorMessage(error);
      if (message.includes("FOREIGN KEY")) {
        throw new HTTPException(404, { message: "资产类型不存在" });
      }
      if (message.includes("UNIQUE")) {
        throw new HTTPException(409, { message: "该资产类型和月份已存在记录" });
      }
      throw error;
    }
  });

  routes.delete("/:id", (c) => {
    const recordId = parseId(c.req.param("id"));
    if (recordId === null) {
      throw new HTTPException(400, { message: "记录 id 必须是正整数" });
    }

    if (!store.deleteRecord(recordId)) {
      throw new HTTPException(404, { message: "月度记录不存在" });
    }
    return c.json({ ok: true });
  });

  return routes;
}
