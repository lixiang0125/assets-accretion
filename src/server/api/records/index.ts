import { Hono } from "hono";
import type { AssetStore } from "../../db/store";
import { registerCreateRecordRoute } from "./create-record";
import { registerDeleteRecordRoute } from "./delete-record";
import { registerListRecordsRoute } from "./list-records";
import { registerUpdateRecordRoute } from "./update-record";

export function createRecordRoutes(store: AssetStore) {
  const routes = new Hono();

  registerListRecordsRoute(routes, store);
  registerCreateRecordRoute(routes, store);
  registerUpdateRecordRoute(routes, store);
  registerDeleteRecordRoute(routes, store);

  return routes;
}
