import { expect, test } from "bun:test";
import { createTempStore } from "./helpers";

test("calculates month-over-month asset appreciation", () => {
  const assetStore = createTempStore();
  const cash = assetStore.createAssetType({ name: "现金" });

  expect(cash?.createdAt).toBeString();
  assetStore.upsertRecord({
    assetTypeId: cash!.id,
    month: "2026-04",
    value: 10000,
  });
  assetStore.upsertRecord({
    assetTypeId: cash!.id,
    month: "2026-05",
    value: 12500,
  });

  const summary = assetStore.getPortfolioSummary("2026-05");

  expect(summary.totalValue).toBe(12500);
  expect(summary.totalPreviousValue).toBe(10000);
  expect(summary.totalChangeValue).toBe(2500);
  expect(summary.totalChangeRate).toBe(0.25);
  expect(summary.items[0]?.previousMonth).toBe("2026-04");
  expect(summary.items[0]?.changeValue).toBe(2500);
});

test("monthly summary includes every asset type even before that month is recorded", () => {
  const assetStore = createTempStore();
  const cashGroup = assetStore.createAssetGroup({ name: "现金类" });
  const stockGroup = assetStore.createAssetGroup({ name: "证券" });
  const cash = assetStore.createAssetType({
    name: "现金",
    groupId: cashGroup!.id,
  });
  const stock = assetStore.createAssetType({
    name: "股票",
    groupId: stockGroup!.id,
  });

  expect(cash?.createdAt).toBeString();
  expect(stock?.createdAt).toBeString();
  assetStore.upsertRecord({
    assetTypeId: cash!.id,
    month: "2026-04",
    value: 10000,
  });

  const summary = assetStore.getPortfolioSummary("2026-05");

  expect(summary.items.map((item) => item.assetTypeName)).toEqual([
    "现金",
    "股票",
  ]);
  expect(summary.items[0]).toMatchObject({
    assetTypeId: cash!.id,
    assetGroupId: cashGroup!.id,
    assetGroupName: "现金类",
    month: "2026-05",
    value: null,
    effectiveMonth: "2026-04",
    effectiveValue: 10000,
    hasRecord: false,
    previousMonth: "2026-04",
    previousValue: 10000,
    changeValue: 0,
    changeRate: 0,
  });
  expect(summary.items[1]).toMatchObject({
    assetTypeId: stock!.id,
    assetGroupId: stockGroup!.id,
    assetGroupName: "证券",
    month: "2026-05",
    value: null,
    effectiveMonth: null,
    effectiveValue: null,
    hasRecord: false,
    previousMonth: null,
    previousValue: null,
  });
  expect(summary.totalValue).toBe(10000);
  expect(summary.totalPreviousValue).toBe(10000);
  expect(summary.totalChangeValue).toBe(0);
  expect(summary.totalChangeRate).toBe(0);
  expect(summary.groups).toEqual([
    {
      groupId: cashGroup!.id,
      groupName: "现金类",
      assetTypeCount: 1,
      recordedAssetTypeCount: 0,
      totalValue: 10000,
      totalPreviousValue: 10000,
      totalChangeValue: 0,
      totalChangeRate: 0,
    },
    {
      groupId: stockGroup!.id,
      groupName: "证券",
      assetTypeCount: 1,
      recordedAssetTypeCount: 0,
      totalValue: 0,
      totalPreviousValue: 0,
      totalChangeValue: 0,
      totalChangeRate: null,
    },
  ]);
});

test("monthly summary can compare against any selected month", () => {
  const assetStore = createTempStore();
  const cash = assetStore.createAssetType({ name: "现金" });

  expect(cash?.createdAt).toBeString();
  assetStore.upsertRecord({
    assetTypeId: cash!.id,
    month: "2026-01",
    value: 40,
  });
  assetStore.upsertRecord({
    assetTypeId: cash!.id,
    month: "2026-04",
    value: 100,
  });
  assetStore.upsertRecord({
    assetTypeId: cash!.id,
    month: "2026-05",
    value: 150,
  });

  const januaryComparison = assetStore.getPortfolioSummary(
    "2026-05",
    "2026-01",
  );
  const missingComparison = assetStore.getPortfolioSummary(
    "2026-05",
    "2026-02",
  );

  expect(januaryComparison.compareMonth).toBe("2026-01");
  expect(januaryComparison.totalPreviousValue).toBe(40);
  expect(januaryComparison.totalChangeValue).toBe(110);
  expect(januaryComparison.totalChangeRate).toBe(2.75);
  expect(januaryComparison.items[0]).toMatchObject({
    previousMonth: "2026-01",
    previousValue: 40,
    changeValue: 110,
    changeRate: 2.75,
  });

  expect(missingComparison.compareMonth).toBe("2026-02");
  expect(missingComparison.totalPreviousValue).toBe(0);
  expect(missingComparison.totalChangeValue).toBe(0);
  expect(missingComparison.totalChangeRate).toBeNull();
  expect(missingComparison.items[0]).toMatchObject({
    previousMonth: null,
    previousValue: null,
    changeValue: null,
    changeRate: null,
  });
});

test("portfolio summary aggregates asset groups with carried values", () => {
  const assetStore = createTempStore();
  const cashGroup = assetStore.createAssetGroup({ name: "现金类" });
  const stockGroup = assetStore.createAssetGroup({ name: "证券" });
  const cash = assetStore.createAssetType({
    name: "现金",
    groupId: cashGroup!.id,
  });
  const alipay = assetStore.createAssetType({
    name: "支付宝",
    groupId: cashGroup!.id,
  });
  const stock = assetStore.createAssetType({
    name: "股票",
    groupId: stockGroup!.id,
  });
  const house = assetStore.createAssetType({ name: "房产" });

  assetStore.upsertRecord({
    assetTypeId: cash!.id,
    month: "2026-04",
    value: 100,
  });
  assetStore.upsertRecord({
    assetTypeId: alipay!.id,
    month: "2026-05",
    value: 50,
  });
  assetStore.upsertRecord({
    assetTypeId: stock!.id,
    month: "2026-04",
    value: 200,
  });
  assetStore.upsertRecord({
    assetTypeId: stock!.id,
    month: "2026-05",
    value: 260,
  });
  assetStore.upsertRecord({
    assetTypeId: house!.id,
    month: "2026-05",
    value: 500,
  });

  const summary = assetStore.getPortfolioSummary("2026-05");

  expect(summary.totalValue).toBe(910);
  expect(summary.groups).toEqual([
    {
      groupId: null,
      groupName: null,
      assetTypeCount: 1,
      recordedAssetTypeCount: 1,
      totalValue: 500,
      totalPreviousValue: 0,
      totalChangeValue: 0,
      totalChangeRate: null,
    },
    {
      groupId: stockGroup!.id,
      groupName: "证券",
      assetTypeCount: 1,
      recordedAssetTypeCount: 1,
      totalValue: 260,
      totalPreviousValue: 200,
      totalChangeValue: 60,
      totalChangeRate: 0.3,
    },
    {
      groupId: cashGroup!.id,
      groupName: "现金类",
      assetTypeCount: 2,
      recordedAssetTypeCount: 1,
      totalValue: 150,
      totalPreviousValue: 100,
      totalChangeValue: 0,
      totalChangeRate: 0,
    },
  ]);
});

test("lists portfolio trend by month", () => {
  const assetStore = createTempStore();
  const cash = assetStore.createAssetType({ name: "现金" });
  const stock = assetStore.createAssetType({ name: "股票" });

  expect(cash?.createdAt).toBeString();
  expect(stock?.createdAt).toBeString();
  assetStore.upsertRecord({
    assetTypeId: cash!.id,
    month: "2026-04",
    value: 40,
  });
  assetStore.upsertRecord({
    assetTypeId: stock!.id,
    month: "2026-04",
    value: 60,
  });
  assetStore.upsertRecord({
    assetTypeId: cash!.id,
    month: "2026-05",
    value: 120,
  });

  expect(assetStore.listPortfolioTrend()).toEqual([
    { month: "2026-04", totalValue: 100 },
    { month: "2026-05", totalValue: 180 },
  ]);
});

test("history comparison falls back after deleting an intermediate month", () => {
  const assetStore = createTempStore();
  const cash = assetStore.createAssetType({ name: "现金" });

  expect(cash?.createdAt).toBeString();
  assetStore.upsertRecord({
    assetTypeId: cash!.id,
    month: "2026-03",
    value: 80,
  });
  const april = assetStore.upsertRecord({
    assetTypeId: cash!.id,
    month: "2026-04",
    value: 100,
  });
  assetStore.upsertRecord({
    assetTypeId: cash!.id,
    month: "2026-05",
    value: 150,
  });

  expect(april).not.toBeNull();
  expect(assetStore.deleteRecord(april!.id)).toBe(true);

  const history = assetStore.listAssetHistory(cash!.id);
  const may = history.find((item) => item.month === "2026-05");

  expect(history.map((item) => item.month)).toEqual(["2026-03", "2026-05"]);
  expect(may?.previousMonth).toBe("2026-03");
  expect(may?.previousValue).toBe(80);
  expect(may?.changeValue).toBe(70);
  expect(may?.changeRate).toBe(0.875);
});

test("zero previous value has no change rate but keeps change amount", () => {
  const assetStore = createTempStore();
  const stock = assetStore.createAssetType({ name: "股票" });

  expect(stock?.createdAt).toBeString();
  assetStore.upsertRecord({
    assetTypeId: stock!.id,
    month: "2026-04",
    value: 0,
  });
  assetStore.upsertRecord({
    assetTypeId: stock!.id,
    month: "2026-05",
    value: 100,
  });

  const summary = assetStore.getPortfolioSummary("2026-05");

  expect(summary.items[0]?.previousValue).toBe(0);
  expect(summary.items[0]?.changeValue).toBe(100);
  expect(summary.items[0]?.changeRate).toBeNull();
  expect(summary.totalPreviousValue).toBe(0);
  expect(summary.totalChangeRate).toBeNull();
});
