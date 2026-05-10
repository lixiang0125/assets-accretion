export type AssetType = {
  id: number;
  name: string;
  description: string | null;
  groupId: number | null;
  groupName: string | null;
  createdAt: string;
};

export type AssetGroup = {
  id: number;
  name: string;
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

export type AssetSummary = {
  id: number | null;
  assetTypeId: number;
  assetTypeName: string;
  assetGroupId: number | null;
  assetGroupName: string | null;
  month: string;
  value: number | null;
  effectiveMonth: string | null;
  effectiveValue: number | null;
  note: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  previousMonth: string | null;
  previousValue: number | null;
  changeValue: number | null;
  changeRate: number | null;
  hasRecord: boolean;
};

export type AssetGroupSummary = {
  groupId: number | null;
  groupName: string | null;
  assetTypeCount: number;
  recordedAssetTypeCount: number;
  totalValue: number;
  totalPreviousValue: number;
  totalChangeValue: number;
  totalChangeRate: number | null;
};

export type PortfolioSummary = {
  month: string | null;
  compareMonth: string | null;
  totalValue: number;
  totalPreviousValue: number;
  totalChangeValue: number;
  totalChangeRate: number | null;
  groups: AssetGroupSummary[];
  items: AssetSummary[];
};

export type PortfolioTrendPoint = {
  month: string;
  totalValue: number;
};

export type PortfolioTrendFilter = {
  groupId?: number | null;
};

export type OperationLogAction =
  | "asset_group_created"
  | "asset_type_created"
  | "asset_type_updated"
  | "asset_type_deleted"
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

export type AssetTypeRow = {
  id: number;
  name: string;
  description: string | null;
  group_id: number | null;
  group_name: string | null;
  created_at: string;
};

export type AssetGroupRow = {
  id: number;
  name: string;
  created_at: string;
};

export type AssetRecordRow = {
  id: number;
  asset_type_id: number;
  asset_type_name: string;
  month: string;
  value: number;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type AssetTypeDeleteSnapshot = AssetType & {
  records: AssetRecord[];
};

export type AssetSummaryRow = {
  id: number | null;
  asset_type_id: number;
  asset_type_name: string;
  asset_group_id: number | null;
  asset_group_name: string | null;
  month: string;
  value: number | null;
  effective_month: string | null;
  effective_value: number | null;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
  previous_month: string | null;
  previous_value: number | null;
};

export type PortfolioTrendRow = {
  month: string;
  total_value: number;
};

export type TableColumnRow = {
  name: string;
};

export type OperationLogRow = {
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

export type InsertOperationLogInput = {
  action: OperationLogAction;
  entityType: string;
  entityId?: number | null;
  entityLabel: string;
  summary: string;
  beforePayload?: unknown | null;
  afterPayload?: unknown | null;
  reversible?: boolean;
  sourceLogId?: number | null;
};

export type InsertOperationLog = (
  input: InsertOperationLogInput,
) => OperationLog | null;
