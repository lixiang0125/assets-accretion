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
  expect(stylesheet).toContain(".app-shell");
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

  expect(recordsResponse.status).toBe(400);
  expect(await recordsResponse.json()).toEqual({ error: "月份格式必须是 YYYY-MM" });
  expect(summaryResponse.status).toBe(400);
  expect(await summaryResponse.json()).toEqual({ error: "月份格式必须是 YYYY-MM" });
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
  expect(summaryAfterDelete.items).toEqual([]);
  expect(summaryAfterDelete.totalValue).toBe(0);

  const deletedAgainResponse = await app.request(`/api/records/${recordId}`, {
    method: "DELETE",
  });
  expect(deletedAgainResponse.status).toBe(404);
});
