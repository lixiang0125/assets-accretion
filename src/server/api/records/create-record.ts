import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AssetStore } from "../../db/store";
import { errorMessage, parseJson } from "../http";
import { parseRecordInput } from "./record-input";

export function registerCreateRecordRoute(routes: Hono, store: AssetStore) {
  routes.post("/", async (c) => {
    const body = await parseJson<{
      assetTypeId?: unknown;
      month?: unknown;
      value?: unknown;
      note?: unknown;
    }>(c);
    const input = parseRecordInput(body);

    try {
      const record = store.upsertRecord(input);
      return c.json({ item: record }, 201);
    } catch (error) {
      if (errorMessage(error).includes("FOREIGN KEY")) {
        throw new HTTPException(404, { message: "资产类型不存在" });
      }
      throw error;
    }
  });
}
