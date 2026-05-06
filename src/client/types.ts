export type AssetType = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
};

export type SummaryItem = {
  id: number;
  assetTypeId: number;
  assetTypeName: string;
  month: string;
  value: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  previousMonth: string | null;
  previousValue: number | null;
  changeValue: number | null;
  changeRate: number | null;
};

export type PortfolioSummary = {
  month: string | null;
  totalValue: number;
  totalPreviousValue: number;
  totalChangeValue: number;
  totalChangeRate: number | null;
  items: SummaryItem[];
};

export type StatusType = "idle" | "error";

export type RecordFormState = {
  assetTypeId: string;
  month: string;
  value: string;
  note: string;
};
