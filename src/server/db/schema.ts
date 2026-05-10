import type { Database } from "bun:sqlite";
import { EAST_EIGHT_SQL_TIMESTAMP } from "./constants";
import type { TableColumnRow } from "./types";

export function initializeDatabase(db: Database) {
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS asset_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (${EAST_EIGHT_SQL_TIMESTAMP})
    );

    CREATE TABLE IF NOT EXISTS asset_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      group_id INTEGER,
      group_name TEXT,
      created_at TEXT NOT NULL DEFAULT (${EAST_EIGHT_SQL_TIMESTAMP}),
      FOREIGN KEY (group_id) REFERENCES asset_groups(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS asset_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_type_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      value REAL NOT NULL CHECK (value >= 0),
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (${EAST_EIGHT_SQL_TIMESTAMP}),
      updated_at TEXT NOT NULL DEFAULT (${EAST_EIGHT_SQL_TIMESTAMP}),
      UNIQUE (asset_type_id, month),
      FOREIGN KEY (asset_type_id) REFERENCES asset_types(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      entity_label TEXT NOT NULL,
      summary TEXT NOT NULL,
      before_payload TEXT,
      after_payload TEXT,
      reversible INTEGER NOT NULL DEFAULT 0,
      restored_at TEXT,
      source_log_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (${EAST_EIGHT_SQL_TIMESTAMP})
    );
  `);

  migrateAssetTypeGroups(db);
}

function migrateAssetTypeGroups(db: Database) {
  const assetTypeColumns = db
    .query<TableColumnRow, []>("PRAGMA table_info(asset_types)")
    .all();
  if (!assetTypeColumns.some((column) => column.name === "group_name")) {
    db.exec("ALTER TABLE asset_types ADD COLUMN group_name TEXT");
  }
  if (!assetTypeColumns.some((column) => column.name === "group_id")) {
    db.exec(
      "ALTER TABLE asset_types ADD COLUMN group_id INTEGER REFERENCES asset_groups(id) ON DELETE SET NULL",
    );
  }

  db.exec(`
    INSERT OR IGNORE INTO asset_groups (name, created_at)
    SELECT DISTINCT TRIM(group_name), ${EAST_EIGHT_SQL_TIMESTAMP}
    FROM asset_types
    WHERE group_id IS NULL
      AND group_name IS NOT NULL
      AND TRIM(group_name) <> '';

    UPDATE asset_types
    SET group_id = (
      SELECT g.id
      FROM asset_groups g
      WHERE g.name = TRIM(asset_types.group_name)
    )
    WHERE group_id IS NULL
      AND group_name IS NOT NULL
      AND TRIM(group_name) <> '';
  `);
}
