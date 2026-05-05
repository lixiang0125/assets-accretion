import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type AssetType = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
};

export type AssetRecord = {
  id: number;
  assetTypeId: number;
  assetTypeName: string;
  month: string;
  value: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssetSummary = AssetRecord & {
  previousMonth: string | null;
  previousValue: number | null;
  changeValue: number | null;
  changeRate: number | null;
};

type AssetTypeRow = {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
};

type AssetRecordRow = {
  id: number;
  asset_type_id: number;
  asset_type_name: string;
  month: string;
  value: number;
  note: string | null;
  created_at: string;
  updated_at: string;
};

type AssetSummaryRow = AssetRecordRow & {
  previous_month: string | null;
  previous_value: number | null;
};

export function createAssetStore(filename = "data/assets.sqlite") {
  mkdirSync(dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS asset_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS asset_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_type_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      value REAL NOT NULL CHECK (value >= 0),
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (asset_type_id, month),
      FOREIGN KEY (asset_type_id) REFERENCES asset_types(id) ON DELETE CASCADE
    );
  `);

  const mapAssetType = (row: AssetTypeRow): AssetType => ({
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
  });

  const mapRecord = (row: AssetRecordRow): AssetRecord => ({
    id: row.id,
    assetTypeId: row.asset_type_id,
    assetTypeName: row.asset_type_name,
    month: row.month,
    value: row.value,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

  const mapSummary = (row: AssetSummaryRow): AssetSummary => {
    const record = mapRecord(row);
    const changeValue =
      row.previous_value === null ? null : record.value - row.previous_value;
    const changeRate =
      row.previous_value === null || row.previous_value === 0
        ? null
        : changeValue! / row.previous_value;

    return {
      ...record,
      previousMonth: row.previous_month,
      previousValue: row.previous_value,
      changeValue,
      changeRate,
    };
  };

  return {
    listAssetTypes() {
      return db
        .query<AssetTypeRow, []>(
          "SELECT id, name, description, created_at FROM asset_types ORDER BY name"
        )
        .all()
        .map(mapAssetType);
    },

    createAssetType(input: { name: string; description?: string | null }) {
      const name = input.name.trim();
      const description = input.description?.trim() || null;
      db.query(
        "INSERT INTO asset_types (name, description) VALUES ($name, $description)"
      ).run({ $name: name, $description: description });

      const row = db
        .query<AssetTypeRow, [string]>(
          "SELECT id, name, description, created_at FROM asset_types WHERE name = ?"
        )
        .get(name);
      return row ? mapAssetType(row) : null;
    },

    upsertRecord(input: {
      assetTypeId: number;
      month: string;
      value: number;
      note?: string | null;
    }) {
      const note = input.note?.trim() || null;
      db.query(
        `
        INSERT INTO asset_records (asset_type_id, month, value, note)
        VALUES ($assetTypeId, $month, $value, $note)
        ON CONFLICT(asset_type_id, month) DO UPDATE SET
          value = excluded.value,
          note = excluded.note,
          updated_at = datetime('now')
      `
      ).run({
        $assetTypeId: input.assetTypeId,
        $month: input.month,
        $value: input.value,
        $note: note,
      });

      return this.getRecord(input.assetTypeId, input.month);
    },

    getRecord(assetTypeId: number, month: string) {
      const row = db
        .query<AssetRecordRow, [number, string]>(
          `
          SELECT
            r.id,
            r.asset_type_id,
            t.name AS asset_type_name,
            r.month,
            r.value,
            r.note,
            r.created_at,
            r.updated_at
          FROM asset_records r
          JOIN asset_types t ON t.id = r.asset_type_id
          WHERE r.asset_type_id = ? AND r.month = ?
        `
        )
        .get(assetTypeId, month);

      return row ? mapRecord(row) : null;
    },

    listRecords(month?: string) {
      const sql = `
        SELECT
          r.id,
          r.asset_type_id,
          t.name AS asset_type_name,
          r.month,
          r.value,
          r.note,
          r.created_at,
          r.updated_at
        FROM asset_records r
        JOIN asset_types t ON t.id = r.asset_type_id
        ${month ? "WHERE r.month = $month" : ""}
        ORDER BY r.month DESC, t.name
      `;

      const rows = month
        ? db.query<AssetRecordRow, [{ $month: string }]>(sql).all({ $month: month })
        : db.query<AssetRecordRow, []>(sql).all();

      return rows.map(mapRecord);
    },

    listSummary(month?: string) {
      const sql = `
        SELECT
          r.id,
          r.asset_type_id,
          t.name AS asset_type_name,
          r.month,
          r.value,
          r.note,
          r.created_at,
          r.updated_at,
          prev.month AS previous_month,
          prev.value AS previous_value
        FROM asset_records r
        JOIN asset_types t ON t.id = r.asset_type_id
        LEFT JOIN asset_records prev ON prev.id = (
          SELECT p.id
          FROM asset_records p
          WHERE p.asset_type_id = r.asset_type_id
            AND p.month < r.month
          ORDER BY p.month DESC
          LIMIT 1
        )
        ${month ? "WHERE r.month = $month" : ""}
        ORDER BY r.month DESC, t.name
      `;

      const rows = month
        ? db.query<AssetSummaryRow, [{ $month: string }]>(sql).all({ $month: month })
        : db.query<AssetSummaryRow, []>(sql).all();

      return rows.map(mapSummary);
    },

    getPortfolioSummary(month?: string) {
      const rows = this.listSummary(month);
      const totalValue = rows.reduce((sum, row) => sum + row.value, 0);
      const totalPreviousValue = rows.reduce(
        (sum, row) => sum + (row.previousValue ?? 0),
        0
      );
      const totalChangeValue = rows.reduce(
        (sum, row) => sum + (row.changeValue ?? 0),
        0
      );

      return {
        month: month ?? null,
        totalValue,
        totalPreviousValue,
        totalChangeValue,
        totalChangeRate:
          totalPreviousValue === 0 ? null : totalChangeValue / totalPreviousValue,
        items: rows,
      };
    },

    close() {
      db.close();
    },
  };
}

export type AssetStore = ReturnType<typeof createAssetStore>;
