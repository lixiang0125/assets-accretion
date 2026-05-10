import type { Hono } from "hono";
import type { AssetStore } from "../../db/store";
import { parseId } from "../http";

export function registerGetTrendRoute(routes: Hono, store: AssetStore) {
  routes.get("/trend", (c) => {
    const groupId = c.req.query("groupId");
    if (groupId === undefined) {
      return c.json({ items: store.listPortfolioTrend() });
    }

    if (groupId === "ungrouped") {
      return c.json({ items: store.listPortfolioTrend({ groupId: null }) });
    }

    const parsedGroupId = parseId(groupId);
    if (parsedGroupId === null) {
      return c.json({ error: "资产分组 id 必须是正整数或 ungrouped" }, 400);
    }

    if (
      !store.listAssetGroups().some((group) => group.id === parsedGroupId)
    ) {
      return c.json({ error: "资产分组不存在" }, 404);
    }

    return c.json({
      items: store.listPortfolioTrend({ groupId: parsedGroupId }),
    });
  });
}
