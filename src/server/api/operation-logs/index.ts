import { Hono } from "hono";
import type { AssetStore } from "../../db/store";
import { registerListOperationLogsRoute } from "./list-operation-logs";
import { registerRestoreOperationLogRoute } from "./restore-operation-log";

export function createOperationLogRoutes(store: AssetStore) {
  const routes = new Hono();

  registerListOperationLogsRoute(routes, store);
  registerRestoreOperationLogRoute(routes, store);

  return routes;
}
