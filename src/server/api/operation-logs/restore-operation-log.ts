import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AssetStore } from "../../db/store";
import { parseId } from "../http";

const restoreErrorMessages: Record<
  Exclude<ReturnType<AssetStore["restoreOperationLog"]>, { ok: true }>["reason"],
  string
> = {
  already_restored: "该删除操作已恢复",
  conflict: "当前记录已存在，无法恢复",
  missing_asset_type: "资产类型不存在，无法恢复",
  not_found: "操作记录不存在",
  not_reversible: "该操作不支持恢复",
  unsupported_action: "该操作不支持恢复",
};

export function registerRestoreOperationLogRoute(routes: Hono, store: AssetStore) {
  routes.post("/:id/restore", (c) => {
    const logId = parseId(c.req.param("id"));
    if (logId === null) {
      throw new HTTPException(400, { message: "操作记录 id 必须是正整数" });
    }

    const result = store.restoreOperationLog(logId);
    if (!result.ok) {
      const status = result.reason === "not_found" ? 404 : 409;
      throw new HTTPException(status, {
        message: restoreErrorMessages[result.reason],
      });
    }

    return c.json({ item: result.item, log: result.log });
  });
}
