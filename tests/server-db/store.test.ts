import { afterEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createAssetStore, type AssetStore } from "../../src/server/db/store";

let store: AssetStore | null = null;
let dbPath: string | null = null;

afterEach(() => {
  store?.close();
  store = null;
  if (dbPath) {
    for (const path of [dbPath, `${dbPath}-shm`, `${dbPath}-wal`]) {
      if (existsSync(path)) {
        unlinkSync(path);
      }
    }
    dbPath = null;
  }
});

function createTempStore() {
  dbPath = join(tmpdir(), `assets-accretion-${crypto.randomUUID()}.sqlite`);
  store = createAssetStore(dbPath);
  return store;
}

function parseSqliteTimestamp(value: string) {
  return new Date(`${value.replace(" ", "T")}Z`);
}

function expectEastEightTimestamp(value: string) {
  const actual = parseSqliteTimestamp(value).getTime();
  const expected = Date.now() + 8 * 60 * 60 * 1000;
  expect(Math.abs(actual - expected)).toBeLessThan(20_000);
}

test("migrates legacy asset type tables without group columns", () => {
  dbPath = join(tmpdir(), `assets-accretion-${crypto.randomUUID()}.sqlite`);
  const legacyDb = new Database(dbPath);
  legacyDb.exec(`
    CREATE TABLE asset_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
    );

    INSERT INTO asset_types (name, description) VALUES ('现金', '备用金');
  `);
  legacyDb.close();

  store = createAssetStore(dbPath);

  expect(store.listAssetGroups()).toEqual([]);
  expect(store.listAssetTypes()).toMatchObject([
    {
      name: "现金",
      description: "备用金",
      groupId: null,
      groupName: null,
    },
  ]);
});

test("migrates legacy text group names into asset groups", () => {
  dbPath = join(tmpdir(), `assets-accretion-${crypto.randomUUID()}.sqlite`);
  const legacyDb = new Database(dbPath);
  legacyDb.exec(`
    CREATE TABLE asset_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      group_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
    );

    INSERT INTO asset_types (name, group_name) VALUES ('现金', '现金类');
    INSERT INTO asset_types (name, group_name) VALUES ('支付宝', '现金类');
  `);
  legacyDb.close();

  store = createAssetStore(dbPath);

  const groups = store.listAssetGroups();
  expect(groups).toMatchObject([{ name: "现金类" }]);
  expect(store.listAssetTypes()).toMatchObject([
    { name: "支付宝", groupId: groups[0]!.id, groupName: "现金类" },
    { name: "现金", groupId: groups[0]!.id, groupName: "现金类" },
  ]);
});

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

test("upserts one value per asset type and month", () => {
  const assetStore = createTempStore();
  const fund = assetStore.createAssetType({ name: "基金" });

  expect(fund?.createdAt).toBeString();
  assetStore.upsertRecord({
    assetTypeId: fund!.id,
    month: "2026-05",
    value: 5000,
  });
  assetStore.upsertRecord({
    assetTypeId: fund!.id,
    month: "2026-05",
    value: 6500,
  });

  const records = assetStore.listRecords("2026-05");

  expect(records).toHaveLength(1);
  expect(records[0]?.value).toBe(6500);
});

test("writes asset and operation timestamps in GMT plus eight", () => {
  const assetStore = createTempStore();
  const cash = assetStore.createAssetType({ name: "现金" });

  expect(cash?.createdAt).toBeString();
  expectEastEightTimestamp(cash!.createdAt);

  const record = assetStore.upsertRecord({
    assetTypeId: cash!.id,
    month: "2026-05",
    value: 100,
  });
  expect(record).not.toBeNull();
  expectEastEightTimestamp(record!.createdAt);
  expectEastEightTimestamp(record!.updatedAt);

  const createLog = assetStore.listOperationLogs({ limit: 1 })[0];
  expect(createLog?.createdAt).toBeString();
  expectEastEightTimestamp(createLog!.createdAt);

  expect(assetStore.deleteRecord(record!.id)).toBe(true);
  const deleteLog = assetStore.listOperationLogs({
    action: "record_deleted",
    limit: 1,
  })[0];
  const restoreResult = assetStore.restoreOperationLog(deleteLog!.id);

  expect(restoreResult.ok).toBe(true);
  const restoredDeleteLog = assetStore.getOperationLogById(deleteLog!.id);
  expect(restoredDeleteLog?.restoredAt).toBeString();
  expectEastEightTimestamp(restoredDeleteLog!.restoredAt!);
});

test("updates monthly record timestamps in GMT plus eight", () => {
  const assetStore = createTempStore();
  const cash = assetStore.createAssetType({ name: "现金" });
  const record = assetStore.upsertRecord({
    assetTypeId: cash!.id,
    month: "2026-05",
    value: 100,
  });

  expect(record).not.toBeNull();
  const updated = assetStore.updateRecord(record!.id, {
    assetTypeId: cash!.id,
    month: "2026-05",
    value: 150,
  });

  expect(updated?.updatedAt).toBeString();
  expectEastEightTimestamp(updated!.updatedAt);
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

test("updates and deletes monthly records without recreating asset types", () => {
  const assetStore = createTempStore();
  const cash = assetStore.createAssetType({ name: "现金" });

  expect(cash?.createdAt).toBeString();
  assetStore.upsertRecord({
    assetTypeId: cash!.id,
    month: "2026-04",
    value: 10000,
  });
  const mayRecord = assetStore.upsertRecord({
    assetTypeId: cash!.id,
    month: "2026-05",
    value: 12500,
  });

  expect(mayRecord).not.toBeNull();
  const updated = assetStore.updateRecord(mayRecord!.id, {
    assetTypeId: cash!.id,
    month: "2026-05",
    value: 13000,
    note: "更新估值",
  });
  const history = assetStore.listAssetHistory(cash!.id);

  expect(assetStore.listAssetTypes()).toHaveLength(1);
  expect(updated?.value).toBe(13000);
  expect(updated?.note).toBe("更新估值");
  expect(history.map((item) => item.month)).toEqual(["2026-04", "2026-05"]);
  expect(history[1]?.changeValue).toBe(3000);

  expect(assetStore.deleteRecord(mayRecord!.id)).toBe(true);
  expect(assetStore.deleteRecord(mayRecord!.id)).toBe(false);
  expect(
    assetStore.listAssetHistory(cash!.id).map((item) => item.month),
  ).toEqual(["2026-04"]);
});

test("creates asset groups and assigns them to asset types", () => {
  const assetStore = createTempStore();
  const cashGroup = assetStore.createAssetGroup({ name: "现金类" });
  const liquidGroup = assetStore.createAssetGroup({ name: "流动资金" });
  const cash = assetStore.createAssetType({
    name: "现金",
    description: "备用金",
    groupId: cashGroup!.id,
  });

  expect(cashGroup).toMatchObject({ name: "现金类" });
  expect(assetStore.listAssetGroups().map((item) => item.name)).toEqual([
    "流动资金",
    "现金类",
  ]);
  expect(cash).toMatchObject({
    name: "现金",
    description: "备用金",
    groupId: cashGroup!.id,
    groupName: "现金类",
  });

  const updated = assetStore.updateAssetType(cash!.id, {
    name: "现金账户",
    description: "活期",
    groupId: liquidGroup!.id,
  });

  expect(updated).toMatchObject({
    id: cash!.id,
    name: "现金账户",
    description: "活期",
    groupId: liquidGroup!.id,
    groupName: "流动资金",
  });
  expect(assetStore.listAssetTypes()[0]).toMatchObject({
    groupId: liquidGroup!.id,
    groupName: "流动资金",
  });

  const createGroupLog = assetStore.listOperationLogs({
    action: "asset_group_created",
    limit: 1,
  })[0];
  expect(createGroupLog).toMatchObject({
    action: "asset_group_created",
    entityLabel: "流动资金",
  });

  const updateLog = assetStore.listOperationLogs({
    action: "asset_type_updated",
    limit: 1,
  })[0];
  expect(updateLog?.beforePayload).toMatchObject({
    groupId: cashGroup!.id,
    groupName: "现金类",
  });
  expect(updateLog?.afterPayload).toMatchObject({
    groupId: liquidGroup!.id,
    groupName: "流动资金",
  });
});

test("deletes asset types with records and writes an audit snapshot", () => {
  const assetStore = createTempStore();
  const cash = assetStore.createAssetType({
    name: "现金",
    description: "备用金",
  });
  const stock = assetStore.createAssetType({ name: "股票" });

  expect(cash?.createdAt).toBeString();
  expect(stock?.createdAt).toBeString();
  const april = assetStore.upsertRecord({
    assetTypeId: cash!.id,
    month: "2026-04",
    value: 100,
    note: "四月",
  });
  const may = assetStore.upsertRecord({
    assetTypeId: cash!.id,
    month: "2026-05",
    value: 150,
    note: "五月",
  });
  assetStore.upsertRecord({
    assetTypeId: stock!.id,
    month: "2026-05",
    value: 300,
  });

  expect(april).not.toBeNull();
  expect(may).not.toBeNull();
  expect(assetStore.deleteAssetType(cash!.id)).toBe(true);
  expect(assetStore.deleteAssetType(cash!.id)).toBe(false);

  expect(assetStore.listAssetTypes().map((item) => item.name)).toEqual([
    "股票",
  ]);
  expect(assetStore.listAssetHistory(cash!.id)).toEqual([]);
  expect(assetStore.listRecords("2026-05")).toHaveLength(1);
  expect(assetStore.listRecords("2026-05")[0]?.assetTypeId).toBe(stock!.id);

  const deleteLog = assetStore.listOperationLogs({
    action: "asset_type_deleted",
    limit: 1,
  })[0];
  expect(deleteLog).toMatchObject({
    action: "asset_type_deleted",
    entityId: cash!.id,
    entityLabel: "现金",
    reversible: false,
    restoredAt: null,
  });
  expect(deleteLog?.beforePayload).toMatchObject({
    id: cash!.id,
    name: "现金",
    description: "备用金",
    records: [
      { id: april!.id, assetTypeId: cash!.id, month: "2026-04", value: 100 },
      { id: may!.id, assetTypeId: cash!.id, month: "2026-05", value: 150 },
    ],
  });
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

test("updating a missing monthly record returns null and leaves data untouched", () => {
  const assetStore = createTempStore();
  const fund = assetStore.createAssetType({ name: "基金" });

  expect(fund?.createdAt).toBeString();
  assetStore.upsertRecord({
    assetTypeId: fund!.id,
    month: "2026-05",
    value: 5000,
  });

  const updated = assetStore.updateRecord(999999, {
    assetTypeId: fund!.id,
    month: "2026-05",
    value: 6000,
  });

  expect(updated).toBeNull();
  expect(assetStore.listRecords("2026-05")).toHaveLength(1);
  expect(assetStore.listRecords("2026-05")[0]?.value).toBe(5000);
});

test("records operation logs and restores a deleted monthly snapshot", () => {
  const assetStore = createTempStore();
  const cash = assetStore.createAssetType({ name: "现金" });

  expect(cash?.createdAt).toBeString();
  assetStore.upsertRecord({
    assetTypeId: cash!.id,
    month: "2026-04",
    value: 100,
  });
  const mayRecord = assetStore.upsertRecord({
    assetTypeId: cash!.id,
    month: "2026-05",
    value: 150,
    note: "恢复用快照",
  });

  expect(mayRecord).not.toBeNull();
  expect(assetStore.deleteRecord(mayRecord!.id)).toBe(true);
  expect(assetStore.listRecords("2026-05")).toEqual([]);

  const deleteLog = assetStore.listOperationLogs({
    action: "record_deleted",
    limit: 1,
  })[0];
  expect(deleteLog).toMatchObject({
    action: "record_deleted",
    entityId: mayRecord!.id,
    reversible: true,
    restoredAt: null,
  });
  expect(deleteLog?.beforePayload).toMatchObject({
    id: mayRecord!.id,
    assetTypeId: cash!.id,
    month: "2026-05",
    value: 150,
    note: "恢复用快照",
  });

  const restoreResult = assetStore.restoreOperationLog(deleteLog!.id);

  expect(restoreResult.ok).toBe(true);
  if (restoreResult.ok) {
    expect(restoreResult.item).toMatchObject({
      id: mayRecord!.id,
      assetTypeId: cash!.id,
      month: "2026-05",
      value: 150,
      note: "恢复用快照",
    });
    expect(restoreResult.log).toMatchObject({
      action: "record_restored",
      sourceLogId: deleteLog!.id,
    });
  }
  expect(assetStore.listRecords("2026-05")[0]?.id).toBe(mayRecord!.id);
  expect(
    assetStore.getOperationLogById(deleteLog!.id)?.restoredAt,
  ).toBeString();
  expect(assetStore.restoreOperationLog(deleteLog!.id)).toEqual({
    ok: false,
    reason: "already_restored",
  });
});

test("refuses unsupported and conflicting operation restores", () => {
  const assetStore = createTempStore();
  const fund = assetStore.createAssetType({ name: "基金" });

  expect(fund?.createdAt).toBeString();
  const mayRecord = assetStore.upsertRecord({
    assetTypeId: fund!.id,
    month: "2026-05",
    value: 5000,
  });
  const createLog = assetStore.listOperationLogs({
    action: "record_created",
    limit: 1,
  })[0];

  expect(assetStore.restoreOperationLog(999999)).toEqual({
    ok: false,
    reason: "not_found",
  });
  expect(assetStore.restoreOperationLog(createLog!.id)).toEqual({
    ok: false,
    reason: "not_reversible",
  });

  expect(mayRecord).not.toBeNull();
  expect(assetStore.deleteRecord(mayRecord!.id)).toBe(true);
  const deleteLog = assetStore.listOperationLogs({
    action: "record_deleted",
    limit: 1,
  })[0];

  assetStore.upsertRecord({
    assetTypeId: fund!.id,
    month: "2026-05",
    value: 6500,
  });

  expect(assetStore.restoreOperationLog(deleteLog!.id)).toEqual({
    ok: false,
    reason: "conflict",
  });
  expect(assetStore.listRecords("2026-05")).toHaveLength(1);
  expect(assetStore.listRecords("2026-05")[0]?.value).toBe(6500);
  expect(assetStore.getOperationLogById(deleteLog!.id)?.restoredAt).toBeNull();
});
