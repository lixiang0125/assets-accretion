import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AssetStore } from "../../db/store";
import { errorMessage, parseJson } from "../http";

export function registerCreateAssetTypeRoute(routes: Hono, store: AssetStore) {
  routes.post("/", async (c) => {
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
      if (errorMessage(error).includes("UNIQUE")) {
        throw new HTTPException(409, { message: "资产类型已存在" });
      }
      throw error;
    }
  });
}
