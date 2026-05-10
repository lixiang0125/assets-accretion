import { expect, test } from "bun:test";
import { createTempStore, expectEastEightTimestamp } from "./helpers";

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
