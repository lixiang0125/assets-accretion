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
