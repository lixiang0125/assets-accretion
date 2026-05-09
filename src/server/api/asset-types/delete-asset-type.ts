import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AssetStore } from "../../db/store";
import { parseId } from "../http";

export function registerDeleteAssetTypeRoute(routes: Hono, store: AssetStore) {
  routes.delete("/:id", (c) => {
    const assetTypeId = parseId(c.req.param("id"));
    if (assetTypeId === null) {
      throw new HTTPException(400, { message: "资产类型 id 必须是正整数" });
    }

    if (!store.deleteAssetType(assetTypeId)) {
      throw new HTTPException(404, { message: "资产类型不存在" });
    }
    return c.json({ ok: true });
  });
}
