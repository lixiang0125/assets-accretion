import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AssetStore } from "../db/store";
import { isMonth } from "./http";

export function createSummaryRoutes(store: AssetStore) {
  const routes = new Hono();

  routes.get("/", (c) => {
    const month = c.req.query("month");
    if (month !== undefined && !isMonth(month)) {
      throw new HTTPException(400, { message: "月份格式必须是 YYYY-MM" });
    }
    return c.json(store.getPortfolioSummary(month));
  });

  return routes;
}
