import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

export function isMonth(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function parseId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function parseJson<T>(c: Context) {
  try {
    return (await c.req.json()) as T;
  } catch {
    throw new HTTPException(400, { message: "请求体必须是合法 JSON" });
  }
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
