import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AssetStore } from "../../db/store";
import { errorMessage, parseId, parseJson } from "../http";

export function registerUpdateAssetTypeRoute(routes: Hono, store: AssetStore) {
  routes.put("/:id", async (c) => {
    const assetTypeId = parseId(c.req.param("id"));
    const body = await parseJson<{
      name?: unknown;
      description?: unknown;
      groupId?: unknown;
    }>(c);
    if (assetTypeId === null) {
      throw new HTTPException(400, { message: "资产类型 id 必须是正整数" });
    }
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      throw new HTTPException(400, { message: "资产类型名称不能为空" });
    }
    const groupId = body.groupId;
    if (
      groupId !== undefined &&
      groupId !== null &&
      (typeof groupId !== "number" ||
        !Number.isInteger(groupId) ||
        groupId <= 0)
    ) {
      throw new HTTPException(400, { message: "资产分组 id 必须是正整数" });
    }

    try {
      const assetType = store.updateAssetType(assetTypeId, {
        name: body.name,
        description:
          typeof body.description === "string" ? body.description : undefined,
        groupId: typeof groupId === "number" ? groupId : null,
      });
      if (!assetType) {
        throw new HTTPException(404, { message: "资产类型不存在" });
      }
      return c.json({ item: assetType });
    } catch (error) {
      if (errorMessage(error).includes("FOREIGN KEY")) {
        throw new HTTPException(404, { message: "资产分组不存在" });
      }
      if (errorMessage(error).includes("UNIQUE")) {
        throw new HTTPException(409, { message: "资产类型已存在" });
      }
      throw error;
    }
  });
}
