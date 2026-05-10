import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AssetStore } from "../../db/store";
import { errorMessage, parseJson } from "../http";

export function registerCreateAssetGroupRoute(routes: Hono, store: AssetStore) {
  routes.post("/", async (c) => {
    const body = await parseJson<{ name?: unknown }>(c);
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      throw new HTTPException(400, { message: "资产分组名称不能为空" });
    }

    try {
      const group = store.createAssetGroup({ name: body.name });
      return c.json({ item: group }, 201);
    } catch (error) {
      if (errorMessage(error).includes("UNIQUE")) {
        throw new HTTPException(409, { message: "资产分组已存在" });
      }
      throw error;
    }
  });
}
