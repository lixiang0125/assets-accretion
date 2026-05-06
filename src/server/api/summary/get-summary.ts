import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AssetStore } from "../../db/store";
import { isMonth } from "../http";

export function registerGetSummaryRoute(routes: Hono, store: AssetStore) {
  routes.get("/", (c) => {
    const month = c.req.query("month");
    const compareMonth = c.req.query("compareMonth");
    if (month !== undefined && !isMonth(month)) {
      throw new HTTPException(400, { message: "月份格式必须是 YYYY-MM" });
    }
    if (compareMonth !== undefined && !isMonth(compareMonth)) {
      throw new HTTPException(400, { message: "对比月份格式必须是 YYYY-MM" });
    }
    return c.json(store.getPortfolioSummary(month, compareMonth));
  });
}
