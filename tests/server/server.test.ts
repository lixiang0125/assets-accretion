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

test("serves health endpoint", async () => {
  const response = await app.request("/api/health");

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
});

test("serves React application shell", async () => {
  const response = await app.request("/");
  const html = await response.text();

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/html");
  expect(html).toContain('<div id="root"></div>');
  expect(html).toContain('/assets/app.js');
});

test("serves bundled React client", async () => {
  const response = await app.request("/assets/app.js");
  const script = await response.text();

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/javascript");
  expect(script).toContain("createRoot");
});

test("updates, deletes, and lists asset history through API", async () => {
  const assetResponse = await app.request("/api/asset-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: `现金-${crypto.randomUUID()}` }),
  });
  const assetPayload = await assetResponse.json();
  const assetTypeId = assetPayload.item.id as number;

  await app.request("/api/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetTypeId, month: "2026-04", value: 10000 }),
  });
  const recordResponse = await app.request("/api/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetTypeId, month: "2026-05", value: 12000 }),
  });
  const recordPayload = await recordResponse.json();
  const recordId = recordPayload.item.id as number;

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

  expect(updateResponse.status).toBe(200);
  expect(updatePayload.item.value).toBe(12500);
  expect(updatePayload.item.note).toBe("更新后");
  expect(historyPayload.items.map((item: { month: string }) => item.month)).toEqual([
    "2026-04",
    "2026-05",
  ]);
  expect(historyPayload.items[1].changeValue).toBe(2500);
  expect(deleteResponse.status).toBe(200);

  const deletedAgainResponse = await app.request(`/api/records/${recordId}`, {
    method: "DELETE",
  });
  expect(deletedAgainResponse.status).toBe(404);
});
