import type { Database } from "bun:sqlite";
import { EAST_EIGHT_SQL_TIMESTAMP } from "./constants";
import { mapRecord } from "./mappers";
import type {
  AssetRecord,
  AssetRecordRow,
  AssetType,
  InsertOperationLog,
  OperationLog,
  RestoreOperationResult,
} from "./types";

type RecordQueryDependencies = {
  getAssetTypeById: (assetTypeId: number) => AssetType | null;
  getOperationLogById: (logId: number) => OperationLog | null;
  insertOperationLog: InsertOperationLog;
};

export function createRecordQueries(
  db: Database,
  {
    getAssetTypeById,
    getOperationLogById,
    insertOperationLog,
  }: RecordQueryDependencies,
) {
  function getRecord(assetTypeId: number, month: string) {
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
      `,
      )
      .get(assetTypeId, month);

    return row ? mapRecord(row) : null;
  }

  function getRecordById(recordId: number) {
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
      `,
      )
      .get(recordId);

    return row ? mapRecord(row) : null;
  }

  function upsertRecord(input: {
    assetTypeId: number;
    month: string;
    value: number;
    note?: string | null;
  }) {
    const before = getRecord(input.assetTypeId, input.month);
    const note = input.note?.trim() || null;
    db.query(
      `
      INSERT INTO asset_records (
        asset_type_id,
        month,
        value,
        note,
        created_at,
        updated_at
      )
      VALUES (
        $assetTypeId,
        $month,
        $value,
        $note,
        ${EAST_EIGHT_SQL_TIMESTAMP},
        ${EAST_EIGHT_SQL_TIMESTAMP}
      )
      ON CONFLICT(asset_type_id, month) DO UPDATE SET
        value = excluded.value,
        note = excluded.note,
        updated_at = ${EAST_EIGHT_SQL_TIMESTAMP}
    `,
    ).run({
      $assetTypeId: input.assetTypeId,
      $month: input.month,
      $value: input.value,
      $note: note,
    });

    const record = getRecord(input.assetTypeId, input.month);
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
  }

  function updateRecord(
    recordId: number,
    input: {
      assetTypeId: number;
      month: string;
      value: number;
      note?: string | null;
    },
  ) {
    const before = getRecordById(recordId);
    const note = input.note?.trim() || null;
    db.query(
      `
      UPDATE asset_records
      SET asset_type_id = $assetTypeId,
          month = $month,
          value = $value,
          note = $note,
          updated_at = ${EAST_EIGHT_SQL_TIMESTAMP}
      WHERE id = $recordId
    `,
    ).run({
      $recordId: recordId,
      $assetTypeId: input.assetTypeId,
      $month: input.month,
      $value: input.value,
      $note: note,
    });

    const record = getRecordById(recordId);
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
  }

  function deleteRecord(recordId: number) {
    const before = getRecordById(recordId);
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
  }

  function restoreOperationLog(logId: number): RestoreOperationResult {
    const log = getOperationLogById(logId);
    if (!log) return { ok: false, reason: "not_found" };
    if (!log.reversible) return { ok: false, reason: "not_reversible" };
    if (log.restoredAt) return { ok: false, reason: "already_restored" };
    if (log.action !== "record_deleted" || log.entityType !== "asset_record") {
      return { ok: false, reason: "unsupported_action" };
    }

    const payload = log.beforePayload as AssetRecord | null;
    if (!payload) return { ok: false, reason: "unsupported_action" };

    const assetType = getAssetTypeById(payload.assetTypeId);
    if (!assetType) return { ok: false, reason: "missing_asset_type" };

    if (
      getRecordById(payload.id) ||
      getRecord(payload.assetTypeId, payload.month)
    ) {
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
          ${EAST_EIGHT_SQL_TIMESTAMP}
        )
      `,
      ).run({
        $id: payload.id,
        $assetTypeId: payload.assetTypeId,
        $month: payload.month,
        $value: payload.value,
        $note: payload.note,
        $createdAt: payload.createdAt,
      });

      db.query(
        `UPDATE operation_logs SET restored_at = ${EAST_EIGHT_SQL_TIMESTAMP} WHERE id = ?`,
      ).run(log.id);

      restored = getRecordById(payload.id);
      if (restored) {
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
  }

  function listRecords(month?: string) {
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
      ? db
          .query<AssetRecordRow, [{ $month: string }]>(sql)
          .all({ $month: month })
      : db.query<AssetRecordRow, []>(sql).all();

    return rows.map(mapRecord);
  }

  return {
    deleteRecord,
    getRecord,
    getRecordById,
    listRecords,
    restoreOperationLog,
    updateRecord,
    upsertRecord,
  };
}
