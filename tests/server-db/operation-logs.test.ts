import { expect, test } from "bun:test";
import { createTempStore, expectEastEightTimestamp } from "./helpers";

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
