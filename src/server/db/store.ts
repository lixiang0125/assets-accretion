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

export type OperationLogAction =
  | "asset_type_created"
  | "asset_type_updated"
  | "record_created"
  | "record_updated"
  | "record_deleted"
  | "record_restored";

export type OperationLog = {
  id: number;
  action: OperationLogAction;
  entityType: string;
  entityId: number | null;
  entityLabel: string;
  summary: string;
  beforePayload: unknown | null;
  afterPayload: unknown | null;
  reversible: boolean;
  restoredAt: string | null;
  sourceLogId: number | null;
  createdAt: string;
};

export type RestoreOperationResult =
  | { ok: true; item: AssetRecord; log: OperationLog }
  | {
      ok: false;
      reason:
        | "not_found"
        | "not_reversible"
        | "already_restored"
        | "unsupported_action"
        | "missing_asset_type"
        | "conflict";
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

type OperationLogRow = {
  id: number;
  action: OperationLogAction;
  entity_type: string;
  entity_id: number | null;
  entity_label: string;
  summary: string;
  before_payload: string | null;
  after_payload: string | null;
  reversible: number;
  restored_at: string | null;
  source_log_id: number | null;
  created_at: string;
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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
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

  const parsePayload = (payload: string | null) =>
    payload === null ? null : (JSON.parse(payload) as unknown);

  const mapOperationLog = (row: OperationLogRow): OperationLog => ({
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityLabel: row.entity_label,
    summary: row.summary,
    beforePayload: parsePayload(row.before_payload),
    afterPayload: parsePayload(row.after_payload),
    reversible: row.reversible === 1,
    restoredAt: row.restored_at,
    sourceLogId: row.source_log_id,
    createdAt: row.created_at,
  });

  const insertOperationLog = (input: {
    action: OperationLogAction;
    entityType: string;
    entityId?: number | null;
    entityLabel: string;
    summary: string;
    beforePayload?: unknown | null;
    afterPayload?: unknown | null;
    reversible?: boolean;
    sourceLogId?: number | null;
  }) => {
    const beforePayload =
      input.beforePayload === undefined || input.beforePayload === null
        ? null
        : JSON.stringify(input.beforePayload);
    const afterPayload =
      input.afterPayload === undefined || input.afterPayload === null
        ? null
        : JSON.stringify(input.afterPayload);

    const result = db
      .query<
        never,
        [
          {
            $action: string;
            $entityType: string;
            $entityId: number | null;
            $entityLabel: string;
            $summary: string;
            $beforePayload: string | null;
            $afterPayload: string | null;
            $reversible: number;
            $sourceLogId: number | null;
          },
        ]
      >(
        `
        INSERT INTO operation_logs (
          action,
          entity_type,
          entity_id,
          entity_label,
          summary,
          before_payload,
          after_payload,
          reversible,
          source_log_id
        )
        VALUES (
          $action,
          $entityType,
          $entityId,
          $entityLabel,
          $summary,
          $beforePayload,
          $afterPayload,
          $reversible,
          $sourceLogId
        )
      `
      )
      .run({
        $action: input.action,
        $entityType: input.entityType,
        $entityId: input.entityId ?? null,
        $entityLabel: input.entityLabel,
        $summary: input.summary,
        $beforePayload: beforePayload,
        $afterPayload: afterPayload,
        $reversible: input.reversible ? 1 : 0,
        $sourceLogId: input.sourceLogId ?? null,
      });

    const row = db
      .query<OperationLogRow, [number]>(
        `
        SELECT
          id,
          action,
          entity_type,
          entity_id,
          entity_label,
          summary,
          before_payload,
          after_payload,
          reversible,
          restored_at,
          source_log_id,
          created_at
        FROM operation_logs
        WHERE id = ?
      `
      )
      .get(Number(result.lastInsertRowid));

    return row ? mapOperationLog(row) : null;
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
      const assetType = row ? mapAssetType(row) : null;
      if (assetType) {
        insertOperationLog({
          action: "asset_type_created",
          entityType: "asset_type",
          entityId: assetType.id,
          entityLabel: assetType.name,
          summary: `创建资产类型「${assetType.name}」`,
          afterPayload: assetType,
        });
      }
      return assetType;
    },

    updateAssetType(
      assetTypeId: number,
      input: { name: string; description?: string | null }
    ) {
      const beforeRow = db
        .query<AssetTypeRow, [number]>(
          "SELECT id, name, description, created_at FROM asset_types WHERE id = ?"
        )
        .get(assetTypeId);
      const before = beforeRow ? mapAssetType(beforeRow) : null;
      const name = input.name.trim();
      const description = input.description?.trim() || null;
      db.query(
        `
        UPDATE asset_types
        SET name = $name,
            description = $description
        WHERE id = $assetTypeId
      `
      ).run({
        $assetTypeId: assetTypeId,
        $name: name,
        $description: description,
      });

      const row = db
        .query<AssetTypeRow, [number]>(
          "SELECT id, name, description, created_at FROM asset_types WHERE id = ?"
        )
        .get(assetTypeId);
      const assetType = row ? mapAssetType(row) : null;
      if (before && assetType) {
        insertOperationLog({
          action: "asset_type_updated",
          entityType: "asset_type",
          entityId: assetType.id,
          entityLabel: assetType.name,
          summary: `更新资产类型「${before.name}」为「${assetType.name}」`,
          beforePayload: before,
          afterPayload: assetType,
        });
      }
      return assetType;
    },

    upsertRecord(input: {
      assetTypeId: number;
      month: string;
      value: number;
      note?: string | null;
    }) {
      const before = this.getRecord(input.assetTypeId, input.month);
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

      const record = this.getRecord(input.assetTypeId, input.month);
      if (record) {
        insertOperationLog({
          action: before ? "record_updated" : "record_created",
          entityType: "asset_record",
          entityId: record.id,
          entityLabel: `${record.assetTypeName} ${record.month}`,
          summary: `${before ? "更新" : "创建"}「${record.assetTypeName}」${record.month} 月度价值为 ${record.value}`,
          beforePayload: before,
          afterPayload: record,
        });
      }
      return record;
    },

    updateRecord(
      recordId: number,
      input: {
        assetTypeId: number;
        month: string;
        value: number;
        note?: string | null;
      }
    ) {
      const before = this.getRecordById(recordId);
      const note = input.note?.trim() || null;
      db.query(
        `
        UPDATE asset_records
        SET asset_type_id = $assetTypeId,
            month = $month,
            value = $value,
            note = $note,
            updated_at = datetime('now')
        WHERE id = $recordId
      `
      ).run({
        $recordId: recordId,
        $assetTypeId: input.assetTypeId,
        $month: input.month,
        $value: input.value,
        $note: note,
      });

      const record = this.getRecordById(recordId);
      if (before && record) {
        insertOperationLog({
          action: "record_updated",
          entityType: "asset_record",
          entityId: record.id,
          entityLabel: `${record.assetTypeName} ${record.month}`,
          summary: `更新「${record.assetTypeName}」${record.month} 月度价值为 ${record.value}`,
          beforePayload: before,
          afterPayload: record,
        });
      }
      return record;
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

    getRecordById(recordId: number) {
      const row = db
        .query<AssetRecordRow, [number]>(
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
          WHERE r.id = ?
        `
        )
        .get(recordId);

      return row ? mapRecord(row) : null;
    },

    deleteRecord(recordId: number) {
      const before = this.getRecordById(recordId);
      if (!before) {
        return false;
      }
      return db.transaction(() => {
        const result = db
          .query<never, [number]>("DELETE FROM asset_records WHERE id = ?")
          .run(recordId);
        if (result.changes > 0) {
          insertOperationLog({
            action: "record_deleted",
            entityType: "asset_record",
            entityId: before.id,
            entityLabel: `${before.assetTypeName} ${before.month}`,
            summary: `删除「${before.assetTypeName}」${before.month} 月度记录`,
            beforePayload: before,
            reversible: true,
          });
        }
        return result.changes > 0;
      })();
    },

    listOperationLogs(input?: { action?: OperationLogAction; limit?: number }) {
      const limit = input?.limit ?? 100;
      const sql = `
        SELECT
          id,
          action,
          entity_type,
          entity_id,
          entity_label,
          summary,
          before_payload,
          after_payload,
          reversible,
          restored_at,
          source_log_id,
          created_at
        FROM operation_logs
        ${input?.action ? "WHERE action = $action" : ""}
        ORDER BY id DESC
        LIMIT $limit
      `;

      const rows = input?.action
        ? db
            .query<OperationLogRow, [{ $action: string; $limit: number }]>(sql)
            .all({ $action: input.action, $limit: limit })
        : db.query<OperationLogRow, [{ $limit: number }]>(sql).all({ $limit: limit });

      return rows.map(mapOperationLog);
    },

    getOperationLogById(logId: number) {
      const row = db
        .query<OperationLogRow, [number]>(
          `
          SELECT
            id,
            action,
            entity_type,
            entity_id,
            entity_label,
            summary,
            before_payload,
            after_payload,
            reversible,
            restored_at,
            source_log_id,
            created_at
          FROM operation_logs
          WHERE id = ?
        `
        )
        .get(logId);

      return row ? mapOperationLog(row) : null;
    },

    restoreOperationLog(logId: number): RestoreOperationResult {
      const log = this.getOperationLogById(logId);
      if (!log) return { ok: false, reason: "not_found" };
      if (!log.reversible) return { ok: false, reason: "not_reversible" };
      if (log.restoredAt) return { ok: false, reason: "already_restored" };
      if (log.action !== "record_deleted" || log.entityType !== "asset_record") {
        return { ok: false, reason: "unsupported_action" };
      }

      const payload = log.beforePayload as AssetRecord | null;
      if (!payload) return { ok: false, reason: "unsupported_action" };

      const assetType = db
        .query<AssetTypeRow, [number]>(
          "SELECT id, name, description, created_at FROM asset_types WHERE id = ?"
        )
        .get(payload.assetTypeId);
      if (!assetType) return { ok: false, reason: "missing_asset_type" };

      if (this.getRecordById(payload.id) || this.getRecord(payload.assetTypeId, payload.month)) {
        return { ok: false, reason: "conflict" };
      }

      let restored: AssetRecord | null = null;
      let restoreLog: OperationLog | null = null;

      db.transaction(() => {
        db.query(
          `
          INSERT INTO asset_records (
            id,
            asset_type_id,
            month,
            value,
            note,
            created_at,
            updated_at
          )
          VALUES (
            $id,
            $assetTypeId,
            $month,
            $value,
            $note,
            $createdAt,
            datetime('now')
          )
        `
        ).run({
          $id: payload.id,
          $assetTypeId: payload.assetTypeId,
          $month: payload.month,
          $value: payload.value,
          $note: payload.note,
          $createdAt: payload.createdAt,
        });

        db.query("UPDATE operation_logs SET restored_at = datetime('now') WHERE id = ?").run(
          log.id
        );

        const restoredRow = db
          .query<AssetRecordRow, [number]>(
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
            WHERE r.id = ?
          `
          )
          .get(payload.id);

        if (restoredRow) {
          restored = mapRecord(restoredRow);
          restoreLog = insertOperationLog({
            action: "record_restored",
            entityType: "asset_record",
            entityId: restored.id,
            entityLabel: `${restored.assetTypeName} ${restored.month}`,
            summary: `恢复「${restored.assetTypeName}」${restored.month} 月度记录`,
            afterPayload: restored,
            sourceLogId: log.id,
          });
        }
      })();

      if (!restored || !restoreLog) return { ok: false, reason: "not_found" };

      return {
        ok: true,
        item: restored,
        log: restoreLog,
      };
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

    listAssetHistory(assetTypeId: number) {
      const rows = db
        .query<AssetSummaryRow, [number]>(
          `
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
          WHERE r.asset_type_id = ?
          ORDER BY r.month ASC
        `
        )
        .all(assetTypeId);

      return rows.map(mapSummary);
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
