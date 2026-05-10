import type {
  AssetGroup,
  AssetGroupRow,
  AssetRecord,
  AssetRecordRow,
  AssetSummary,
  AssetSummaryRow,
  AssetType,
  AssetTypeRow,
  OperationLog,
  OperationLogRow,
  PortfolioTrendPoint,
  PortfolioTrendRow,
} from "./types";

export function mapAssetType(row: AssetTypeRow): AssetType {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    groupId: row.group_id,
    groupName: row.group_name,
    createdAt: row.created_at,
  };
}

export function mapAssetGroup(row: AssetGroupRow): AssetGroup {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export function mapRecord(row: AssetRecordRow): AssetRecord {
  return {
    id: row.id,
    assetTypeId: row.asset_type_id,
    assetTypeName: row.asset_type_name,
    month: row.month,
    value: row.value,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSummary(row: AssetSummaryRow): AssetSummary {
  const effectiveValue = row.effective_value;
  const changeValue =
    effectiveValue === null || row.previous_value === null
      ? null
      : effectiveValue - row.previous_value;
  const changeRate =
    changeValue === null || row.previous_value === null || row.previous_value === 0
      ? null
      : changeValue / row.previous_value;

  return {
    id: row.id,
    assetTypeId: row.asset_type_id,
    assetTypeName: row.asset_type_name,
    assetGroupId: row.asset_group_id,
    assetGroupName: row.asset_group_name,
    month: row.month,
    value: row.value,
    effectiveMonth: row.effective_month,
    effectiveValue,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    previousMonth: row.previous_month,
    previousValue: row.previous_value,
    changeValue,
    changeRate,
    hasRecord: row.id !== null,
  };
}

export function mapPortfolioTrendPoint(
  row: PortfolioTrendRow,
): PortfolioTrendPoint {
  return {
    month: row.month,
    totalValue: row.total_value,
  };
}

function parsePayload(payload: string | null) {
  return payload === null ? null : (JSON.parse(payload) as unknown);
}

export function mapOperationLog(row: OperationLogRow): OperationLog {
  return {
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
  };
}
