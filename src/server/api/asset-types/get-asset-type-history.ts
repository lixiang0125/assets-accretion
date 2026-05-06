import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AssetStore } from "../../db/store";
import { parseId } from "../http";

export function registerGetAssetTypeHistoryRoute(routes: Hono, store: AssetStore) {
  routes.get("/:id/history", (c) => {
    const assetTypeId = parseId(c.req.param("id"));
    if (assetTypeId === null) {
      throw new HTTPException(400, { message: "资产类型 id 必须是正整数" });
    }
    return c.json({ items: store.listAssetHistory(assetTypeId) });
  });
}
