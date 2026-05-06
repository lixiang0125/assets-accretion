import { Hono } from "hono";
import type { AssetStore } from "../db/store";
import { createAssetTypeRoutes } from "./asset-types/index";
import { registerGetHealthRoute } from "./health/get-health";
import { createOperationLogRoutes } from "./operation-logs/index";
import { createRecordRoutes } from "./records/index";
import { createSummaryRoutes } from "./summary/index";

export function createApiRoutes(store: AssetStore) {
  const api = new Hono();

  registerGetHealthRoute(api);
  api.route("/asset-types", createAssetTypeRoutes(store));
  api.route("/operation-logs", createOperationLogRoutes(store));
  api.route("/records", createRecordRoutes(store));
  api.route("/summary", createSummaryRoutes(store));

  return api;
}
