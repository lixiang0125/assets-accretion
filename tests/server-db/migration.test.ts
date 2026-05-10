import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { createTempStore, createTrackedDatabasePath } from "./helpers";

test("migrates legacy asset type tables without group columns", () => {
  const dbPath = createTrackedDatabasePath();
  const legacyDb = new Database(dbPath);
  legacyDb.exec(`
    CREATE TABLE asset_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
    );

    INSERT INTO asset_types (name, description) VALUES ('现金', '备用金');
  `);
  legacyDb.close();

  const store = createTempStore(dbPath);

  expect(store.listAssetGroups()).toEqual([]);
  expect(store.listAssetTypes()).toMatchObject([
    {
      name: "现金",
      description: "备用金",
      groupId: null,
      groupName: null,
    },
  ]);
});

test("migrates legacy text group names into asset groups", () => {
  const dbPath = createTrackedDatabasePath();
  const legacyDb = new Database(dbPath);
  legacyDb.exec(`
    CREATE TABLE asset_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      group_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
    );

    INSERT INTO asset_types (name, group_name) VALUES ('现金', '现金类');
    INSERT INTO asset_types (name, group_name) VALUES ('支付宝', '现金类');
  `);
  legacyDb.close();

  const store = createTempStore(dbPath);

  const groups = store.listAssetGroups();
  expect(groups).toMatchObject([{ name: "现金类" }]);
  expect(store.listAssetTypes()).toMatchObject([
    { name: "支付宝", groupId: groups[0]!.id, groupName: "现金类" },
    { name: "现金", groupId: groups[0]!.id, groupName: "现金类" },
  ]);
});
