import type { Database } from "bun:sqlite";
import { EAST_EIGHT_SQL_TIMESTAMP } from "./constants";
import { mapAssetGroup } from "./mappers";
import type { AssetGroupRow, InsertOperationLog } from "./types";

export function createAssetGroupQueries(
  db: Database,
  insertOperationLog: InsertOperationLog,
) {
  function listAssetGroups() {
    return db
      .query<
        AssetGroupRow,
        []
      >("SELECT id, name, created_at FROM asset_groups ORDER BY name")
      .all()
      .map(mapAssetGroup);
  }

  function createAssetGroup(input: { name: string }) {
    const name = input.name.trim();
    db.query(
      `
        INSERT INTO asset_groups (name, created_at)
        VALUES ($name, ${EAST_EIGHT_SQL_TIMESTAMP})
      `,
    ).run({ $name: name });

    const row = db
      .query<
        AssetGroupRow,
        [string]
      >("SELECT id, name, created_at FROM asset_groups WHERE name = ?")
      .get(name);
    const group = row ? mapAssetGroup(row) : null;
    if (group) {
      insertOperationLog({
        action: "asset_group_created",
        entityType: "asset_group",
        entityId: group.id,
        entityLabel: group.name,
        summary: `创建资产分组「${group.name}」`,
        afterPayload: group,
      });
    }
    return group;
  }

  return {
    createAssetGroup,
    listAssetGroups,
  };
}
