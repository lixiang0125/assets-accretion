import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AssetStore } from "../../db/store";
import { parseId } from "../http";

export function registerDeleteRecordRoute(routes: Hono, store: AssetStore) {
  routes.delete("/:id", (c) => {
    const recordId = parseId(c.req.param("id"));
    if (recordId === null) {
      throw new HTTPException(400, { message: "记录 id 必须是正整数" });
    }

    if (!store.deleteRecord(recordId)) {
      throw new HTTPException(404, { message: "月度记录不存在" });
    }
    return c.json({ ok: true });
  });
}
