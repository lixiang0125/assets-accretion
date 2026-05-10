import type { Database } from "bun:sqlite";
import { mapPortfolioTrendPoint, mapSummary } from "./mappers";
import type {
  AssetGroupSummary,
  AssetSummaryRow,
  PortfolioSummary,
  PortfolioTrendRow,
} from "./types";

export function createSummaryQueries(db: Database) {
  function listAssetHistory(assetTypeId: number) {
    const rows = db
      .query<AssetSummaryRow, [number]>(
        `
        SELECT
          r.id,
          r.asset_type_id,
          t.name AS asset_type_name,
          t.group_id AS asset_group_id,
          g.name AS asset_group_name,
          r.month,
          r.value,
          r.month AS effective_month,
          r.value AS effective_value,
          r.note,
          r.created_at,
          r.updated_at,
          prev.month AS previous_month,
          prev.value AS previous_value
        FROM asset_records r
        JOIN asset_types t ON t.id = r.asset_type_id
        LEFT JOIN asset_groups g ON g.id = t.group_id
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
      `,
      )
      .all(assetTypeId);

    return rows.map(mapSummary);
  }

  function listSummary(month?: string, compareMonth?: string) {
    if (month) {
      const comparisonJoin = compareMonth
        ? `
          LEFT JOIN asset_records prev ON prev.asset_type_id = t.id
            AND prev.month = $compareMonth
        `
        : `
          LEFT JOIN asset_records prev ON prev.id = (
            SELECT p.id
            FROM asset_records p
            WHERE p.asset_type_id = t.id
              AND p.month < $month
            ORDER BY p.month DESC
            LIMIT 1
          )
        `;
      const sql = `
        SELECT
          r.id,
          t.id AS asset_type_id,
          t.name AS asset_type_name,
          t.group_id AS asset_group_id,
          g.name AS asset_group_name,
          COALESCE(r.month, $month) AS month,
          r.value,
          effective.month AS effective_month,
          effective.value AS effective_value,
          r.note,
          r.created_at,
          r.updated_at,
          prev.month AS previous_month,
          prev.value AS previous_value
        FROM asset_types t
        LEFT JOIN asset_groups g ON g.id = t.group_id
        LEFT JOIN asset_records r ON r.asset_type_id = t.id
          AND r.month = $month
          LEFT JOIN asset_records effective ON effective.id = COALESCE(
            r.id,
            (
              SELECT e.id
              FROM asset_records e
              WHERE e.asset_type_id = t.id
                AND e.month < $month
              ORDER BY e.month DESC
              LIMIT 1
            )
          )
          ${comparisonJoin}
          ORDER BY t.name
        `;

      const rows = compareMonth
        ? db
            .query<AssetSummaryRow, [{ $month: string; $compareMonth: string }]>(
              sql,
            )
            .all({ $month: month, $compareMonth: compareMonth })
        : db
            .query<AssetSummaryRow, [{ $month: string }]>(sql)
            .all({ $month: month });

      return rows.map(mapSummary);
    }

    const sql = `
      SELECT
        r.id,
        r.asset_type_id,
        t.name AS asset_type_name,
        t.group_id AS asset_group_id,
        g.name AS asset_group_name,
        r.month,
        r.value,
        r.month AS effective_month,
        r.value AS effective_value,
        r.note,
        r.created_at,
        r.updated_at,
        prev.month AS previous_month,
        prev.value AS previous_value
      FROM asset_records r
      JOIN asset_types t ON t.id = r.asset_type_id
      LEFT JOIN asset_groups g ON g.id = t.group_id
      LEFT JOIN asset_records prev ON prev.id = (
        SELECT p.id
        FROM asset_records p
        WHERE p.asset_type_id = r.asset_type_id
          AND p.month < r.month
        ORDER BY p.month DESC
        LIMIT 1
      )
      ORDER BY r.month DESC, t.name
    `;

    const rows = db.query<AssetSummaryRow, []>(sql).all();

    return rows.map(mapSummary);
  }

  function getPortfolioSummary(
    month?: string,
    compareMonth?: string,
  ): PortfolioSummary {
    const rows = listSummary(month, compareMonth);
    const effectiveRows = rows.filter((row) => row.effectiveValue !== null);
    const totalValue = effectiveRows.reduce(
      (sum, row) => sum + row.effectiveValue!,
      0,
    );
    const totalPreviousValue = rows.reduce(
      (sum, row) =>
        sum + (row.effectiveValue === null ? 0 : (row.previousValue ?? 0)),
      0,
    );
    const totalChangeValue = rows.reduce(
      (sum, row) =>
        sum + (row.effectiveValue === null ? 0 : (row.changeValue ?? 0)),
      0,
    );
    const groupsByKey = new Map<string, AssetGroupSummary>();
    for (const row of rows) {
      const key =
        row.assetGroupId === null ? "__ungrouped__" : String(row.assetGroupId);
      const group = groupsByKey.get(key) ?? {
        groupId: row.assetGroupId,
        groupName: row.assetGroupName,
        assetTypeCount: 0,
        recordedAssetTypeCount: 0,
        totalValue: 0,
        totalPreviousValue: 0,
        totalChangeValue: 0,
        totalChangeRate: null,
      };
      group.assetTypeCount += 1;
      if (row.hasRecord) {
        group.recordedAssetTypeCount += 1;
      }
      if (row.effectiveValue !== null) {
        group.totalValue += row.effectiveValue;
        group.totalPreviousValue += row.previousValue ?? 0;
        group.totalChangeValue += row.changeValue ?? 0;
      }
      groupsByKey.set(key, group);
    }
    const groups = Array.from(groupsByKey.values())
      .map((group) => ({
        ...group,
        totalChangeRate:
          group.totalPreviousValue === 0
            ? null
            : group.totalChangeValue / group.totalPreviousValue,
      }))
      .sort((left, right) => {
        const valueOrder = right.totalValue - left.totalValue;
        if (valueOrder !== 0) return valueOrder;
        return (left.groupName ?? "未分组").localeCompare(
          right.groupName ?? "未分组",
          "zh-Hans-CN",
        );
      });

    return {
      month: month ?? null,
      compareMonth: compareMonth ?? null,
      totalValue,
      totalPreviousValue,
      totalChangeValue,
      totalChangeRate:
        totalPreviousValue === 0 ? null : totalChangeValue / totalPreviousValue,
      groups,
      items: rows,
    };
  }

  function listPortfolioTrend() {
    const rows = db
      .query<PortfolioTrendRow, []>(
        `
        SELECT
          m.month,
          COALESCE(
            SUM(
              (
                SELECT r.value
                FROM asset_records r
                WHERE r.asset_type_id = t.id
                  AND r.month <= m.month
                ORDER BY r.month DESC
                LIMIT 1
              )
            ),
            0
          ) AS total_value
        FROM (SELECT DISTINCT month FROM asset_records) m
        CROSS JOIN asset_types t
        GROUP BY m.month
        ORDER BY m.month ASC
      `,
      )
      .all();

    return rows.map(mapPortfolioTrendPoint);
  }

  return {
    getPortfolioSummary,
    listAssetHistory,
    listPortfolioTrend,
    listSummary,
  };
}
