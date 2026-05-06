import { Hono } from "hono";
import type { AssetStore } from "../../db/store";
import { registerCreateAssetTypeRoute } from "./create-asset-type";
import { registerGetAssetTypeHistoryRoute } from "./get-asset-type-history";
import { registerListAssetTypesRoute } from "./list-asset-types";
import { registerUpdateAssetTypeRoute } from "./update-asset-type";

export function createAssetTypeRoutes(store: AssetStore) {
  const routes = new Hono();

  registerListAssetTypesRoute(routes, store);
  registerCreateAssetTypeRoute(routes, store);
  registerUpdateAssetTypeRoute(routes, store);
  registerGetAssetTypeHistoryRoute(routes, store);

  return routes;
}
