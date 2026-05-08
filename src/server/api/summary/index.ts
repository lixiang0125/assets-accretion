import { Hono } from "hono";
import type { AssetStore } from "../../db/store";
import { registerGetSummaryRoute } from "./get-summary";
import { registerGetTrendRoute } from "./get-trend";

export function createSummaryRoutes(store: AssetStore) {
  const routes = new Hono();

  registerGetTrendRoute(routes, store);
  registerGetSummaryRoute(routes, store);

  return routes;
}
