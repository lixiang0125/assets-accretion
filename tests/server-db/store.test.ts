import { afterEach, expect, test } from "bun:test";
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
  expect(assetStore.listAssetHistory(cash!.id).map((item) => item.month)).toEqual([
    "2026-04",
  ]);
});

test("history comparison falls back after deleting an intermediate month", () => {
  const assetStore = createTempStore();
  const cash = assetStore.createAssetType({ name: "现金" });

  expect(cash?.createdAt).toBeString();
  assetStore.upsertRecord({ assetTypeId: cash!.id, month: "2026-03", value: 80 });
  const april = assetStore.upsertRecord({
    assetTypeId: cash!.id,
    month: "2026-04",
    value: 100,
  });
  assetStore.upsertRecord({ assetTypeId: cash!.id, month: "2026-05", value: 150 });

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
  assetStore.upsertRecord({ assetTypeId: stock!.id, month: "2026-04", value: 0 });
  assetStore.upsertRecord({ assetTypeId: stock!.id, month: "2026-05", value: 100 });

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
  assetStore.upsertRecord({ assetTypeId: fund!.id, month: "2026-05", value: 5000 });

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
  assetStore.upsertRecord({ assetTypeId: cash!.id, month: "2026-04", value: 100 });
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
  expect(assetStore.getOperationLogById(deleteLog!.id)?.restoredAt).toBeString();
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
