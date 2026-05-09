import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Hono } from "hono";
import { createApp } from "../../src/server/app";
import { createAssetStore, type AssetStore } from "../../src/server/db/store";

let app: Hono;
let store: AssetStore;
let dbPath: string;

beforeEach(() => {
  dbPath = join(tmpdir(), `assets-accretion-api-${crypto.randomUUID()}.sqlite`);
  store = createAssetStore(dbPath);
  app = createApp(store);
});

afterEach(() => {
  store.close();
  for (const path of [dbPath, `${dbPath}-shm`, `${dbPath}-wal`]) {
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }
});

async function createAssetType(name = `资产-${crypto.randomUUID()}`) {
  const response = await app.request("/api/asset-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const payload = await response.json();
  expect(response.status).toBe(201);
  return payload.item as { id: number; name: string };
}

async function createRecord(input: {
  assetTypeId: number;
  month: string;
  value: number;
  note?: string;
}) {
  const response = await app.request("/api/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json();
  expect(response.status).toBe(201);
  return payload.item as { id: number; value: number; note: string | null };
}

test("serves health endpoint", async () => {
  const response = await app.request("/api/health");

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
});

test("serves React application shell", async () => {
  const response = await app.request("/");
  const html = await response.text();

  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("content-type")).toContain("text/html");
  expect(html).toContain('<div id="root"></div>');
  expect(html).toContain('/assets/styles.css?v=');
  expect(html).toContain('/assets/app.js?v=');
});

test("serves bundled React client", async () => {
  const response = await app.request("/assets/app.js");
  const script = await response.text();

  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("content-type")).toContain("text/javascript");
  expect(script).toContain("createRoot");
});

test("serves separated client stylesheet", async () => {
  const response = await app.request("/assets/styles.css");
  const stylesheet = await response.text();

  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("content-type")).toContain("text/css");
  expect(stylesheet).toContain('@import "./App/App.css"');
  expect(stylesheet).toContain(
    '@import "./components/dashboard/DeleteAssetTypeDialog/DeleteAssetTypeDialog.css"'
  );
  expect(stylesheet).toContain(
    '@import "./components/dashboard/PortfolioTrendChart/PortfolioTrendChart.css"'
  );
});

test("serves imported component stylesheets from the client tree only", async () => {
  const appStylesResponse = await app.request("/assets/App/App.css");
  const appStyles = await appStylesResponse.text();
  const componentStylesResponse = await app.request(
    "/assets/components/dashboard/AssetDetailTable/AssetDetailTable.css"
  );
  const drawerStylesResponse = await app.request(
    "/assets/components/dashboard/RecordDrawer/RecordDrawer.css"
  );
  const deleteAssetTypeStylesResponse = await app.request(
    "/assets/components/dashboard/DeleteAssetTypeDialog/DeleteAssetTypeDialog.css"
  );
  const outsideResponse = await app.request("/assets/../server/app.ts");

  expect(appStylesResponse.status).toBe(200);
  expect(appStyles).toContain(".app-shell");
  expect(componentStylesResponse.status).toBe(200);
  expect(await componentStylesResponse.text()).toContain(".detail-table");
  expect(drawerStylesResponse.status).toBe(200);
  expect(await drawerStylesResponse.text()).toContain(".record-drawer-body");
  expect(deleteAssetTypeStylesResponse.status).toBe(200);
  expect(await deleteAssetTypeStylesResponse.text()).toContain(
    ".delete-asset-type-summary"
  );
  expect(outsideResponse.status).toBe(404);
});

test("rejects malformed JSON and invalid asset type names", async () => {
  const malformedResponse = await app.request("/api/asset-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  const emptyNameResponse = await app.request("/api/asset-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "   " }),
  });

  expect(malformedResponse.status).toBe(400);
  expect(await malformedResponse.json()).toEqual({ error: "请求体必须是合法 JSON" });
  expect(emptyNameResponse.status).toBe(400);
  expect(await emptyNameResponse.json()).toEqual({ error: "资产类型名称不能为空" });
});

test("rejects duplicate asset type creation and rename conflicts", async () => {
  const cash = await createAssetType("现金");
  const stock = await createAssetType("股票");

  const duplicateResponse = await app.request("/api/asset-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "现金" }),
  });
  const renameConflictResponse = await app.request(`/api/asset-types/${stock.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: cash.name }),
  });

  expect(duplicateResponse.status).toBe(409);
  expect(await duplicateResponse.json()).toEqual({ error: "资产类型已存在" });
  expect(renameConflictResponse.status).toBe(409);
  expect(await renameConflictResponse.json()).toEqual({ error: "资产类型已存在" });
});

test("deletes an asset type and cascades its monthly records through API", async () => {
  const cash = await createAssetType("现金");
  const stock = await createAssetType("股票");
  await createRecord({ assetTypeId: cash.id, month: "2026-04", value: 100 });
  await createRecord({ assetTypeId: cash.id, month: "2026-05", value: 150 });
  await createRecord({ assetTypeId: stock.id, month: "2026-05", value: 300 });

  const invalidResponse = await app.request("/api/asset-types/not-a-number", {
    method: "DELETE",
  });
  const deleteResponse = await app.request(`/api/asset-types/${cash.id}`, {
    method: "DELETE",
  });
  const deletedAgainResponse = await app.request(`/api/asset-types/${cash.id}`, {
    method: "DELETE",
  });
  const summaryResponse = await app.request("/api/summary?month=2026-05");
  const summaryPayload = await summaryResponse.json();
  const historyResponse = await app.request(`/api/asset-types/${cash.id}/history`);
  const historyPayload = await historyResponse.json();
  const logsResponse = await app.request(
    "/api/operation-logs?action=asset_type_deleted&limit=1"
  );
  const logsPayload = await logsResponse.json();

  expect(invalidResponse.status).toBe(400);
  expect(await invalidResponse.json()).toEqual({
    error: "资产类型 id 必须是正整数",
  });
  expect(deleteResponse.status).toBe(200);
  expect(await deleteResponse.json()).toEqual({ ok: true });
  expect(deletedAgainResponse.status).toBe(404);
  expect(await deletedAgainResponse.json()).toEqual({ error: "资产类型不存在" });
  expect(summaryPayload.items).toHaveLength(1);
  expect(summaryPayload.items[0]).toMatchObject({
    assetTypeId: stock.id,
    month: "2026-05",
    value: 300,
    hasRecord: true,
  });
  expect(summaryPayload.totalValue).toBe(300);
  expect(historyPayload.items).toEqual([]);
  expect(logsResponse.status).toBe(200);
  expect(logsPayload.items).toHaveLength(1);
  expect(logsPayload.items[0]).toMatchObject({
    action: "asset_type_deleted",
    entityId: cash.id,
    entityLabel: "现金",
    reversible: false,
  });
  expect(logsPayload.items[0].beforePayload.records).toHaveLength(2);
});

test("rejects invalid record inputs before touching the database", async () => {
  const asset = await createAssetType("现金");

  const cases = [
    {
      body: { assetTypeId: asset.id, month: "2026-13", value: 100 },
      error: "月份格式必须是 YYYY-MM",
    },
    {
      body: { assetTypeId: asset.id, month: "2026-05", value: -1 },
      error: "资产价值必须是非负数字",
    },
    {
      body: { assetTypeId: "0", month: "2026-05", value: 100 },
      error: "assetTypeId 必须是正整数",
    },
  ];

  for (const item of cases) {
    const response = await app.request("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item.body),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: item.error });
  }

  const recordsResponse = await app.request("/api/records?month=2026-05");
  const recordsPayload = await recordsResponse.json();
  expect(recordsPayload.items).toEqual([]);
});

test("rejects records for missing asset types", async () => {
  const createResponse = await app.request("/api/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetTypeId: 999999, month: "2026-05", value: 100 }),
  });
  const updateResponse = await app.request("/api/records/999999", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetTypeId: 999999, month: "2026-05", value: 100 }),
  });

  expect(createResponse.status).toBe(404);
  expect(await createResponse.json()).toEqual({ error: "资产类型不存在" });
  expect(updateResponse.status).toBe(404);
  expect(await updateResponse.json()).toEqual({ error: "月度记录不存在" });
});

test("rejects record updates that collide with another month", async () => {
  const asset = await createAssetType("现金");
  await createRecord({ assetTypeId: asset.id, month: "2026-04", value: 100 });
  const mayRecord = await createRecord({ assetTypeId: asset.id, month: "2026-05", value: 150 });

  const response = await app.request(`/api/records/${mayRecord.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetTypeId: asset.id, month: "2026-04", value: 180 }),
  });

  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ error: "该资产类型和月份已存在记录" });
});

test("rejects invalid month query parameters", async () => {
  const recordsResponse = await app.request("/api/records?month=not-a-month");
  const summaryResponse = await app.request("/api/summary?month=2026-00");
  const compareSummaryResponse = await app.request(
    "/api/summary?month=2026-05&compareMonth=2026-13"
  );

  expect(recordsResponse.status).toBe(400);
  expect(await recordsResponse.json()).toEqual({ error: "月份格式必须是 YYYY-MM" });
  expect(summaryResponse.status).toBe(400);
  expect(await summaryResponse.json()).toEqual({ error: "月份格式必须是 YYYY-MM" });
  expect(compareSummaryResponse.status).toBe(400);
  expect(await compareSummaryResponse.json()).toEqual({
    error: "对比月份格式必须是 YYYY-MM",
  });
});

test("summarizes changes against a selected comparison month", async () => {
  const asset = await createAssetType("现金");
  await createRecord({ assetTypeId: asset.id, month: "2026-01", value: 40 });
  await createRecord({ assetTypeId: asset.id, month: "2026-04", value: 100 });
  await createRecord({ assetTypeId: asset.id, month: "2026-05", value: 150 });

  const response = await app.request(
    "/api/summary?month=2026-05&compareMonth=2026-01"
  );
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(payload.compareMonth).toBe("2026-01");
  expect(payload.totalPreviousValue).toBe(40);
  expect(payload.totalChangeValue).toBe(110);
  expect(payload.totalChangeRate).toBe(2.75);
  expect(payload.items[0]).toMatchObject({
    previousMonth: "2026-01",
    previousValue: 40,
    changeValue: 110,
    changeRate: 2.75,
  });
});

test("lists portfolio trend through API", async () => {
  const cash = await createAssetType("现金");
  const stock = await createAssetType("股票");
  await createRecord({ assetTypeId: cash.id, month: "2026-04", value: 40 });
  await createRecord({ assetTypeId: stock.id, month: "2026-04", value: 60 });
  await createRecord({ assetTypeId: cash.id, month: "2026-05", value: 120 });

  const response = await app.request("/api/summary/trend");
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(payload.items).toEqual([
    { month: "2026-04", totalValue: 100 },
    { month: "2026-05", totalValue: 120 },
  ]);
});

test("updates, deletes, and lists asset history through API", async () => {
  const asset = await createAssetType(`现金-${crypto.randomUUID()}`);
  const assetTypeId = asset.id;

  await createRecord({ assetTypeId, month: "2026-04", value: 10000 });
  const mayRecord = await createRecord({ assetTypeId, month: "2026-05", value: 12000 });
  const recordId = mayRecord.id;

  const updateResponse = await app.request(`/api/records/${recordId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assetTypeId,
      month: "2026-05",
      value: 12500,
      note: "更新后",
    }),
  });
  const updatePayload = await updateResponse.json();
  const historyResponse = await app.request(
    `/api/asset-types/${assetTypeId}/history`
  );
  const historyPayload = await historyResponse.json();
  const deleteResponse = await app.request(`/api/records/${recordId}`, {
    method: "DELETE",
  });
  const summaryAfterDeleteResponse = await app.request("/api/summary?month=2026-05");
  const summaryAfterDelete = await summaryAfterDeleteResponse.json();

  expect(updateResponse.status).toBe(200);
  expect(updatePayload.item.value).toBe(12500);
  expect(updatePayload.item.note).toBe("更新后");
  expect(historyPayload.items.map((item: { month: string }) => item.month)).toEqual([
    "2026-04",
    "2026-05",
  ]);
  expect(historyPayload.items[1].changeValue).toBe(2500);
  expect(deleteResponse.status).toBe(200);
  expect(summaryAfterDelete.items).toHaveLength(1);
  expect(summaryAfterDelete.items[0]).toMatchObject({
    assetTypeId,
    month: "2026-05",
    value: null,
    hasRecord: false,
    previousMonth: "2026-04",
    previousValue: 10000,
  });
  expect(summaryAfterDelete.totalValue).toBe(0);

  const deletedAgainResponse = await app.request(`/api/records/${recordId}`, {
    method: "DELETE",
  });
  expect(deletedAgainResponse.status).toBe(404);
});

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
    "/api/operation-logs?action=record_deleted&limit=10"
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
    { method: "POST" }
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
    "/api/operation-logs?action=record_deleted"
  );
  const refreshedLogsPayload = await refreshedLogsResponse.json();
  expect(refreshedLogsPayload.items[0].restoredAt).toBeString();

  const restoreAgainResponse = await app.request(
    `/api/operation-logs/${deleteLog.id}/restore`,
    { method: "POST" }
  );
  expect(restoreAgainResponse.status).toBe(409);
  expect(await restoreAgainResponse.json()).toEqual({
    error: "该删除操作已恢复",
  });
});

test("rejects invalid operation log queries and restore ids", async () => {
  const invalidActionResponse = await app.request(
    "/api/operation-logs?action=unknown"
  );
  const invalidLimitResponse = await app.request("/api/operation-logs?limit=0");
  const invalidRestoreIdResponse = await app.request(
    "/api/operation-logs/not-a-number/restore",
    { method: "POST" }
  );
  const missingRestoreResponse = await app.request(
    "/api/operation-logs/999999/restore",
    { method: "POST" }
  );

  expect(invalidActionResponse.status).toBe(400);
  expect(await invalidActionResponse.json()).toEqual({ error: "操作类型不存在" });
  expect(invalidLimitResponse.status).toBe(400);
  expect(await invalidLimitResponse.json()).toEqual({
    error: "limit 必须是 1 到 500 的整数",
  });
  expect(invalidRestoreIdResponse.status).toBe(400);
  expect(await invalidRestoreIdResponse.json()).toEqual({
    error: "操作记录 id 必须是正整数",
  });
  expect(missingRestoreResponse.status).toBe(404);
  expect(await missingRestoreResponse.json()).toEqual({ error: "操作记录不存在" });
});

test("rejects non-reversible and conflicting operation restores", async () => {
  const asset = await createAssetType("支付宝");
  const mayRecord = await createRecord({
    assetTypeId: asset.id,
    month: "2026-05",
    value: 100,
  });

  const createLogsResponse = await app.request(
    "/api/operation-logs?action=record_created"
  );
  const createLogsPayload = await createLogsResponse.json();
  const restoreCreateLogResponse = await app.request(
    `/api/operation-logs/${createLogsPayload.items[0].id}/restore`,
    { method: "POST" }
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
    "/api/operation-logs?action=record_deleted&limit=1"
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
    { method: "POST" }
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
