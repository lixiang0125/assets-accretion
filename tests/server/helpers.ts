import { afterEach, beforeEach, expect } from "bun:test";
import { existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Hono } from "hono";
import { createApp } from "../../src/server/app";
import { createAssetStore, type AssetStore } from "../../src/server/db/store";

export function createServerTestContext() {
  let app: Hono;
  let store: AssetStore;
  let dbPath: string;
  const testDatabasePrefix = "assets-accretion-api-";

  beforeEach(() => {
    dbPath = join(
      tmpdir(),
      `${testDatabasePrefix}${crypto.randomUUID()}.sqlite`,
    );
    expect(dbPath.startsWith(join(tmpdir(), testDatabasePrefix))).toBe(true);
    expect(dbPath.endsWith(".sqlite")).toBe(true);
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

  async function createAssetGroup(name = `分组-${crypto.randomUUID()}`) {
    const response = await app.request("/api/asset-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const payload = await response.json();
    expect(response.status).toBe(201);
    return payload.item as { id: number; name: string };
  }

  async function createAssetType(
    name = `资产-${crypto.randomUUID()}`,
    groupId?: number,
  ) {
    const response = await app.request("/api/asset-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, groupId }),
    });
    const payload = await response.json();
    expect(response.status).toBe(201);
    return payload.item as {
      id: number;
      name: string;
      groupId: number | null;
      groupName: string | null;
    };
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

  return {
    app: {
      request(path: string, init?: RequestInit) {
        return app.request(path, init);
      },
    },
    createAssetGroup,
    createAssetType,
    createRecord,
  };
}
