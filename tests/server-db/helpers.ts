import { afterEach, expect } from "bun:test";
import { existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAssetStore, type AssetStore } from "../../src/server/db/store";

const stores: AssetStore[] = [];
const dbPaths = new Set<string>();
const testDatabasePrefix = "assets-accretion-";

afterEach(() => {
  for (const store of stores.splice(0)) {
    store.close();
  }
  for (const dbPath of dbPaths) {
    for (const path of [dbPath, `${dbPath}-shm`, `${dbPath}-wal`]) {
      if (existsSync(path)) {
        unlinkSync(path);
      }
    }
  }
  dbPaths.clear();
});

export function createTrackedDatabasePath() {
  const dbPath = join(
    tmpdir(),
    `${testDatabasePrefix}${crypto.randomUUID()}.sqlite`,
  );
  dbPaths.add(dbPath);
  return dbPath;
}

export function createTempStore(filename = createTrackedDatabasePath()) {
  expect(filename.startsWith(join(tmpdir(), testDatabasePrefix))).toBe(true);
  expect(filename.endsWith(".sqlite")).toBe(true);
  const store = createAssetStore(filename);
  dbPaths.add(filename);
  stores.push(store);
  return store;
}

function parseSqliteTimestamp(value: string) {
  return new Date(`${value.replace(" ", "T")}Z`);
}

export function expectEastEightTimestamp(value: string) {
  const actual = parseSqliteTimestamp(value).getTime();
  const expected = Date.now() + 8 * 60 * 60 * 1000;
  expect(Math.abs(actual - expected)).toBeLessThan(20_000);
}
