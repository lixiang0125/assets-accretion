import type { AssetGroup } from "../types";

export const allTrendGroupsValue = "all";
export const ungroupedTrendGroupsValue = "ungrouped";

export type TrendGroupFilterValue =
  | typeof allTrendGroupsValue
  | typeof ungroupedTrendGroupsValue
  | `group:${number}`;

export function trendFilterForGroup(groupId: number): TrendGroupFilterValue {
  return `group:${groupId}`;
}

export function trendFilterToGroupId(value: TrendGroupFilterValue) {
  if (value === allTrendGroupsValue) return null;
  if (value === ungroupedTrendGroupsValue) return ungroupedTrendGroupsValue;
  return Number(value.replace("group:", ""));
}

export function trendFilterLabel(
  value: TrendGroupFilterValue,
  assetGroups: AssetGroup[],
) {
  if (value === allTrendGroupsValue) return "全部分组";
  if (value === ungroupedTrendGroupsValue) return "未分组";
  const groupId = trendFilterToGroupId(value);
  return (
    assetGroups.find((group) => group.id === groupId)?.name ?? "未知分组"
  );
}
