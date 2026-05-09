import { expect, test } from "bun:test";
import {
  nextSortState,
  sortSummaryItems,
  type AssetDetailSortState,
} from "../../src/client/components/dashboard/AssetDetailTable/sort";
import type { SummaryItem } from "../../src/client/types";

function item(input: {
  assetTypeName: string;
  changeRate: number | null;
  changeValue: number | null;
  effectiveValue?: number | null;
  value: number | null;
}): SummaryItem {
  const effectiveValue = input.effectiveValue ?? input.value;
  return {
    assetTypeId: input.assetTypeName.length,
    assetTypeName: input.assetTypeName,
    changeRate: input.changeRate,
    changeValue: input.changeValue,
    createdAt: null,
    hasRecord: input.value !== null,
    id: input.value === null ? null : input.assetTypeName.length,
    effectiveMonth: effectiveValue === null ? null : "2026-05",
    effectiveValue,
    month: "2026-05",
    note: null,
    previousMonth: "2026-04",
    previousValue: null,
    updatedAt: null,
    value: input.value,
  };
}

function names(items: SummaryItem[]) {
  return items.map((entry) => entry.assetTypeName);
}

test("toggles sortable detail columns from descending to ascending", () => {
  let sortState: AssetDetailSortState | null = null;

  sortState = nextSortState(sortState, "value");
  expect(sortState).toEqual({ key: "value", direction: "desc" });

  sortState = nextSortState(sortState, "value");
  expect(sortState).toEqual({ key: "value", direction: "asc" });

  sortState = nextSortState(sortState, "changeRate");
  expect(sortState).toEqual({ key: "changeRate", direction: "desc" });
});

test("sorts current value high to low and low to high with empty values last", () => {
  const items = [
    item({ assetTypeName: "现金", value: 120, changeValue: 20, changeRate: 0.2 }),
    item({ assetTypeName: "基金", value: 240, changeValue: 40, changeRate: 0.4 }),
    item({ assetTypeName: "待记录", value: null, changeValue: null, changeRate: null }),
    item({
      assetTypeName: "沿用值",
      value: null,
      effectiveValue: 180,
      changeValue: 0,
      changeRate: 0,
    }),
  ];

  expect(names(sortSummaryItems(items, { key: "value", direction: "desc" }))).toEqual([
    "基金",
    "沿用值",
    "现金",
    "待记录",
  ]);
  expect(names(sortSummaryItems(items, { key: "value", direction: "asc" }))).toEqual([
    "现金",
    "沿用值",
    "基金",
    "待记录",
  ]);
});

test("sorts change amount and change rate including negative values", () => {
  const items = [
    item({ assetTypeName: "上涨", value: 200, changeValue: 80, changeRate: 0.8 }),
    item({ assetTypeName: "下跌", value: 90, changeValue: -10, changeRate: -0.1 }),
    item({ assetTypeName: "持平", value: 100, changeValue: 0, changeRate: 0 }),
  ];

  expect(names(sortSummaryItems(items, { key: "changeValue", direction: "desc" }))).toEqual([
    "上涨",
    "持平",
    "下跌",
  ]);
  expect(names(sortSummaryItems(items, { key: "changeRate", direction: "asc" }))).toEqual([
    "下跌",
    "持平",
    "上涨",
  ]);
});
