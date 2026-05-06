import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AssetStore } from "../../db/store";
import { errorMessage, parseId, parseJson } from "../http";
import { parseRecordInput } from "./record-input";

export function registerUpdateRecordRoute(routes: Hono, store: AssetStore) {
  routes.put("/:id", async (c) => {
    const recordId = parseId(c.req.param("id"));
    if (recordId === null) {
      throw new HTTPException(400, { message: "记录 id 必须是正整数" });
    }

    const body = await parseJson<{
      assetTypeId?: unknown;
      month?: unknown;
      value?: unknown;
      note?: unknown;
    }>(c);
    const input = parseRecordInput(body);

    try {
      const record = store.updateRecord(recordId, input);
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
}
