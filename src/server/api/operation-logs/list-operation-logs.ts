import type { Hono } from "hono";
import type { AssetStore } from "../../db/store";
import {
  parseOperationLogAction,
  parseOperationLogLimit,
} from "./operation-log-input";

export function registerListOperationLogsRoute(routes: Hono, store: AssetStore) {
  routes.get("/", (c) =>
    c.json({
      items: store.listOperationLogs({
        action: parseOperationLogAction(c.req.query("action")),
        limit: parseOperationLogLimit(c.req.query("limit")),
      }),
    })
  );
}
