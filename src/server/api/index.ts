import { Hono } from "hono";
import type { AssetStore } from "../db/store";
import { createAssetTypeRoutes } from "./asset-types";
import { createRecordRoutes } from "./records";
import { createSummaryRoutes } from "./summary";

export function createApiRoutes(store: AssetStore) {
  const api = new Hono();

  api.get("/health", (c) => c.json({ ok: true }));
  api.route("/asset-types", createAssetTypeRoutes(store));
  api.route("/records", createRecordRoutes(store));
  api.route("/summary", createSummaryRoutes(store));

  return api;
}
