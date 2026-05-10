import { HTTPException } from "hono/http-exception";
import type { OperationLogAction } from "../../db/store";

const operationLogActions = new Set<OperationLogAction>([
  "asset_group_created",
  "asset_type_created",
  "asset_type_updated",
  "asset_type_deleted",
  "record_created",
  "record_updated",
  "record_deleted",
  "record_restored",
]);

export function parseOperationLogAction(value: string | undefined) {
  if (value === undefined) return undefined;
  if (!operationLogActions.has(value as OperationLogAction)) {
    throw new HTTPException(400, { message: "操作类型不存在" });
  }
  return value as OperationLogAction;
}

export function parseOperationLogLimit(value: string | undefined) {
  if (value === undefined) return undefined;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new HTTPException(400, { message: "limit 必须是 1 到 500 的整数" });
  }
  return limit;
}
