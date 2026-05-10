import type { Database } from "bun:sqlite";
import { EAST_EIGHT_SQL_TIMESTAMP } from "./constants";
import { mapAssetType, mapRecord } from "./mappers";
import type {
  AssetRecordRow,
  AssetTypeDeleteSnapshot,
  AssetTypeRow,
  InsertOperationLog,
} from "./types";

export function createAssetTypeQueries(
  db: Database,
  insertOperationLog: InsertOperationLog,
) {
  function getAssetTypeById(assetTypeId: number) {
    const row = db
      .query<AssetTypeRow, [number]>(
        `
          SELECT
            t.id,
            t.name,
            t.description,
            t.group_id,
            g.name AS group_name,
            t.created_at
          FROM asset_types t
          LEFT JOIN asset_groups g ON g.id = t.group_id
          WHERE t.id = ?
        `,
      )
      .get(assetTypeId);

    return row ? mapAssetType(row) : null;
  }

  function listAssetTypes() {
    return db
      .query<AssetTypeRow, []>(
        `
          SELECT
            t.id,
            t.name,
            t.description,
            t.group_id,
            g.name AS group_name,
            t.created_at
          FROM asset_types t
          LEFT JOIN asset_groups g ON g.id = t.group_id
          ORDER BY t.name
        `,
      )
      .all()
      .map(mapAssetType);
  }

  function createAssetType(input: {
    name: string;
    description?: string | null;
    groupId?: number | null;
  }) {
    const name = input.name.trim();
    const description = input.description?.trim() || null;
    const groupId = input.groupId ?? null;
    db.query(
      `
        INSERT INTO asset_types (name, description, group_id, created_at)
        VALUES ($name, $description, $groupId, ${EAST_EIGHT_SQL_TIMESTAMP})
      `,
    ).run({ $name: name, $description: description, $groupId: groupId });

    const row = db
      .query<AssetTypeRow, [string]>(
        `
          SELECT
            t.id,
            t.name,
            t.description,
            t.group_id,
            g.name AS group_name,
            t.created_at
          FROM asset_types t
          LEFT JOIN asset_groups g ON g.id = t.group_id
          WHERE t.name = ?
        `,
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
  }

  function updateAssetType(
    assetTypeId: number,
    input: {
      name: string;
      description?: string | null;
      groupId?: number | null;
    },
  ) {
    const before = getAssetTypeById(assetTypeId);
    const name = input.name.trim();
    const description = input.description?.trim() || null;
    const groupId = input.groupId ?? null;
    db.query(
      `
        UPDATE asset_types
        SET name = $name,
            description = $description,
            group_id = $groupId
        WHERE id = $assetTypeId
      `,
    ).run({
      $assetTypeId: assetTypeId,
      $name: name,
      $description: description,
      $groupId: groupId,
    });

    const assetType = getAssetTypeById(assetTypeId);
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
  }

  function deleteAssetType(assetTypeId: number) {
    const before = getAssetTypeById(assetTypeId);
    if (!before) {
      return false;
    }

    const recordRows = db
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
        WHERE r.asset_type_id = ?
        ORDER BY r.month
      `,
      )
      .all(assetTypeId);
    const snapshot: AssetTypeDeleteSnapshot = {
      ...before,
      records: recordRows.map(mapRecord),
    };

    return db.transaction(() => {
      const result = db
        .query<never, [number]>("DELETE FROM asset_types WHERE id = ?")
        .run(assetTypeId);
      if (result.changes > 0) {
        insertOperationLog({
          action: "asset_type_deleted",
          entityType: "asset_type",
          entityId: before.id,
          entityLabel: before.name,
          summary: `删除资产类型「${before.name}」及 ${snapshot.records.length} 条月度记录`,
          beforePayload: snapshot,
          reversible: false,
        });
      }
      return result.changes > 0;
    })();
  }

  return {
    createAssetType,
    deleteAssetType,
    getAssetTypeById,
    listAssetTypes,
    updateAssetType,
  };
}
