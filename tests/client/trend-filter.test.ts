import { expect, test } from "bun:test";
import {
  allTrendGroupsValue,
  trendFilterForGroup,
  trendFilterLabel,
  trendFilterToGroupId,
  ungroupedTrendGroupsValue,
} from "../../src/client/lib/trend-filter";

const assetGroups = [
  { id: 1, name: "现金类", createdAt: "2026-05-01 10:00:00" },
  { id: 2, name: "证券", createdAt: "2026-05-01 10:00:00" },
];

test("maps trend filter values to API group ids", () => {
  expect(trendFilterToGroupId(allTrendGroupsValue)).toBeNull();
  expect(trendFilterToGroupId(ungroupedTrendGroupsValue)).toBe("ungrouped");
  expect(trendFilterToGroupId(trendFilterForGroup(2))).toBe(2);
});

test("labels selected trend groups including missing group fallback", () => {
  expect(trendFilterLabel(allTrendGroupsValue, assetGroups)).toBe("全部分组");
  expect(trendFilterLabel(ungroupedTrendGroupsValue, assetGroups)).toBe(
    "未分组",
  );
  expect(trendFilterLabel(trendFilterForGroup(1), assetGroups)).toBe("现金类");
  expect(trendFilterLabel(trendFilterForGroup(999), assetGroups)).toBe(
    "未知分组",
  );
});
