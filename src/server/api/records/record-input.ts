import { HTTPException } from "hono/http-exception";
import { isMonth, parseId } from "../http";

export function parseRecordInput(body: {
  assetTypeId?: unknown;
  month?: unknown;
  value?: unknown;
  note?: unknown;
}) {
  const assetTypeId = parseId(body.assetTypeId);
  const value = Number(body.value);
  if (assetTypeId === null) {
    throw new HTTPException(400, { message: "assetTypeId 必须是正整数" });
  }
  if (!isMonth(body.month)) {
    throw new HTTPException(400, { message: "月份格式必须是 YYYY-MM" });
  }
  if (!Number.isFinite(value) || value < 0) {
    throw new HTTPException(400, { message: "资产价值必须是非负数字" });
  }

  return {
    assetTypeId,
    month: body.month,
    value,
    note: typeof body.note === "string" ? body.note : undefined,
  };
}
