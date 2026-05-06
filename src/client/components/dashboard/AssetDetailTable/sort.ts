import type { SummaryItem } from "../../../types";

export type AssetDetailSortKey = "value" | "changeValue" | "changeRate";
export type SortDirection = "asc" | "desc";

export type AssetDetailSortState = {
  direction: SortDirection;
  key: AssetDetailSortKey;
};

export function nextSortState(
  current: AssetDetailSortState | null,
  key: AssetDetailSortKey
): AssetDetailSortState {
  if (current?.key === key) {
    return { key, direction: current.direction === "desc" ? "asc" : "desc" };
  }
  return { key, direction: "desc" };
}

export function sortSummaryItems(
  items: SummaryItem[],
  sortState: AssetDetailSortState | null
) {
  if (!sortState) return items;

  return [...items].sort((left, right) => {
    const leftValue = sortableValue(left[sortState.key], sortState.direction);
    const rightValue = sortableValue(right[sortState.key], sortState.direction);
    if (leftValue === rightValue) {
      return left.assetTypeName.localeCompare(right.assetTypeName, "zh-CN");
    }
    return sortState.direction === "asc"
      ? leftValue - rightValue
      : rightValue - leftValue;
  });
}

function sortableValue(value: number | null, direction: SortDirection) {
  if (value !== null) return value;
  return direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
}
