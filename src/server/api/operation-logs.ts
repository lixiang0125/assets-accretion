import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AssetStore, OperationLogAction } from "../db/store";
import { parseId } from "./http";

const operationLogActions = new Set<OperationLogAction>([
  "asset_type_created",
  "asset_type_updated",
  "record_created",
  "record_updated",
  "record_deleted",
  "record_restored",
]);

function isOperationLogAction(value: string): value is OperationLogAction {
  return operationLogActions.has(value as OperationLogAction);
}

function parseLimit(value: string | undefined) {
  if (value === undefined) return undefined;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new HTTPException(400, { message: "limit 必须是 1 到 500 的整数" });
  }
  return limit;
}

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

export function createOperationLogRoutes(store: AssetStore) {
  const routes = new Hono();

  routes.get("/", (c) => {
    const rawAction = c.req.query("action");
    if (rawAction !== undefined && !isOperationLogAction(rawAction)) {
      throw new HTTPException(400, { message: "操作类型不存在" });
    }

    return c.json({
      items: store.listOperationLogs({
        action: rawAction,
        limit: parseLimit(c.req.query("limit")),
      }),
    });
  });

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

  return routes;
}
