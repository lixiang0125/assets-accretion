import { Hono } from "hono";
import type { AssetStore } from "../../db/store";
import { registerCreateAssetGroupRoute } from "./create-asset-group";
import { registerListAssetGroupsRoute } from "./list-asset-groups";

export function createAssetGroupRoutes(store: AssetStore) {
  const routes = new Hono();

  registerListAssetGroupsRoute(routes, store);
  registerCreateAssetGroupRoute(routes, store);

  return routes;
}
