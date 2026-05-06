import { Hono } from "hono";
import type { AssetStore } from "../../db/store";
import { registerGetSummaryRoute } from "./get-summary";

export function createSummaryRoutes(store: AssetStore) {
  const routes = new Hono();

  registerGetSummaryRoute(routes, store);

  return routes;
}
