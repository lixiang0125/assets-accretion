import { expect, test } from "bun:test";
import { createServerTestContext } from "./helpers";

const { app, createAssetType, createRecord } = createServerTestContext();

test("lists operation logs and restores a deleted monthly record", async () => {
  const asset = await createAssetType("现金");
  await createRecord({ assetTypeId: asset.id, month: "2026-04", value: 10000 });
  const mayRecord = await createRecord({
    assetTypeId: asset.id,
    month: "2026-05",
    value: 12500,
    note: "五月估值",
  });

  const deleteResponse = await app.request(`/api/records/${mayRecord.id}`, {
    method: "DELETE",
  });
  expect(deleteResponse.status).toBe(200);

  const logsResponse = await app.request(
    "/api/operation-logs?action=record_deleted&limit=10",
  );
  const logsPayload = await logsResponse.json();
  const deleteLog = logsPayload.items[0];

  expect(logsResponse.status).toBe(200);
  expect(logsPayload.items).toHaveLength(1);
  expect(deleteLog.reversible).toBe(true);
  expect(deleteLog.restoredAt).toBeNull();
  expect(deleteLog.beforePayload).toMatchObject({
    id: mayRecord.id,
    assetTypeId: asset.id,
    month: "2026-05",
    value: 12500,
    note: "五月估值",
  });

  const restoreResponse = await app.request(
    `/api/operation-logs/${deleteLog.id}/restore`,
    { method: "POST" },
  );
  const restorePayload = await restoreResponse.json();

  expect(restoreResponse.status).toBe(200);
  expect(restorePayload.item).toMatchObject({
    id: mayRecord.id,
    assetTypeId: asset.id,
    month: "2026-05",
    value: 12500,
    note: "五月估值",
  });
  expect(restorePayload.log.sourceLogId).toBe(deleteLog.id);

  const summaryResponse = await app.request("/api/summary?month=2026-05");
  const summaryPayload = await summaryResponse.json();
  expect(summaryPayload.items).toHaveLength(1);
  expect(summaryPayload.items[0].id).toBe(mayRecord.id);
  expect(summaryPayload.items[0].hasRecord).toBe(true);

  const refreshedLogsResponse = await app.request(
    "/api/operation-logs?action=record_deleted",
  );
  const refreshedLogsPayload = await refreshedLogsResponse.json();
  expect(refreshedLogsPayload.items[0].restoredAt).toBeString();

  const restoreAgainResponse = await app.request(
    `/api/operation-logs/${deleteLog.id}/restore`,
    { method: "POST" },
  );
  expect(restoreAgainResponse.status).toBe(409);
  expect(await restoreAgainResponse.json()).toEqual({
    error: "该删除操作已恢复",
  });
});

test("rejects invalid operation log queries and restore ids", async () => {
  const invalidActionResponse = await app.request(
    "/api/operation-logs?action=unknown",
  );
  const invalidLimitResponse = await app.request("/api/operation-logs?limit=0");
  const invalidRestoreIdResponse = await app.request(
    "/api/operation-logs/not-a-number/restore",
    { method: "POST" },
  );
  const missingRestoreResponse = await app.request(
    "/api/operation-logs/999999/restore",
    { method: "POST" },
  );

  expect(invalidActionResponse.status).toBe(400);
  expect(await invalidActionResponse.json()).toEqual({
    error: "操作类型不存在",
  });
  expect(invalidLimitResponse.status).toBe(400);
  expect(await invalidLimitResponse.json()).toEqual({
    error: "limit 必须是 1 到 500 的整数",
  });
  expect(invalidRestoreIdResponse.status).toBe(400);
  expect(await invalidRestoreIdResponse.json()).toEqual({
    error: "操作记录 id 必须是正整数",
  });
  expect(missingRestoreResponse.status).toBe(404);
  expect(await missingRestoreResponse.json()).toEqual({
    error: "操作记录不存在",
  });
});

test("rejects non-reversible and conflicting operation restores", async () => {
  const asset = await createAssetType("支付宝");
  const mayRecord = await createRecord({
    assetTypeId: asset.id,
    month: "2026-05",
    value: 100,
  });

  const createLogsResponse = await app.request(
    "/api/operation-logs?action=record_created",
  );
  const createLogsPayload = await createLogsResponse.json();
  const restoreCreateLogResponse = await app.request(
    `/api/operation-logs/${createLogsPayload.items[0].id}/restore`,
    { method: "POST" },
  );

  expect(restoreCreateLogResponse.status).toBe(409);
  expect(await restoreCreateLogResponse.json()).toEqual({
    error: "该操作不支持恢复",
  });

  const deleteResponse = await app.request(`/api/records/${mayRecord.id}`, {
    method: "DELETE",
  });
  expect(deleteResponse.status).toBe(200);

  const deleteLogsResponse = await app.request(
    "/api/operation-logs?action=record_deleted&limit=1",
  );
  const deleteLogsPayload = await deleteLogsResponse.json();
  const deleteLog = deleteLogsPayload.items[0];

  await createRecord({
    assetTypeId: asset.id,
    month: "2026-05",
    value: 200,
  });
  const conflictRestoreResponse = await app.request(
    `/api/operation-logs/${deleteLog.id}/restore`,
    { method: "POST" },
  );

  expect(conflictRestoreResponse.status).toBe(409);
  expect(await conflictRestoreResponse.json()).toEqual({
    error: "当前记录已存在，无法恢复",
  });

  const recordsResponse = await app.request("/api/records?month=2026-05");
  const recordsPayload = await recordsResponse.json();
  expect(recordsPayload.items).toHaveLength(1);
  expect(recordsPayload.items[0].value).toBe(200);
});
