import type { Hono } from "hono";
import type { AssetStore } from "../../db/store";

export function registerListAssetGroupsRoute(routes: Hono, store: AssetStore) {
  routes.get("/", (c) => c.json({ items: store.listAssetGroups() }));
}
