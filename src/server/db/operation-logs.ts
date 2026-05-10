import type { Database } from "bun:sqlite";
import { EAST_EIGHT_SQL_TIMESTAMP } from "./constants";
import { mapOperationLog } from "./mappers";
import type {
  InsertOperationLogInput,
  OperationLogAction,
  OperationLogRow,
} from "./types";

export function createOperationLogQueries(db: Database) {
  function insertOperationLog(input: InsertOperationLogInput) {
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
          source_log_id,
          created_at
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
          $sourceLogId,
          ${EAST_EIGHT_SQL_TIMESTAMP}
        )
      `,
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
      `,
      )
      .get(Number(result.lastInsertRowid));

    return row ? mapOperationLog(row) : null;
  }

  function listOperationLogs(input?: {
    action?: OperationLogAction;
    limit?: number;
  }) {
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
      : db
          .query<OperationLogRow, [{ $limit: number }]>(sql)
          .all({ $limit: limit });

    return rows.map(mapOperationLog);
  }

  function getOperationLogById(logId: number) {
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
      `,
      )
      .get(logId);

    return row ? mapOperationLog(row) : null;
  }

  return {
    getOperationLogById,
    insertOperationLog,
    listOperationLogs,
  };
}
