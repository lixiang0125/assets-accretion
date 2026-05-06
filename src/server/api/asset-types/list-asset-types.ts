import type { Hono } from "hono";
import type { AssetStore } from "../../db/store";

export function registerListAssetTypesRoute(routes: Hono, store: AssetStore) {
  routes.get("/", (c) => c.json({ items: store.listAssetTypes() }));
}
