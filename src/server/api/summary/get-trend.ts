import type { Hono } from "hono";
import type { AssetStore } from "../../db/store";

export function registerGetTrendRoute(routes: Hono, store: AssetStore) {
  routes.get("/trend", (c) => c.json({ items: store.listPortfolioTrend() }));
}
