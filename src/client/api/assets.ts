import type {
  AssetType,
  OperationLog,
  OperationLogAction,
  PortfolioSummary,
  RecordFormState,
  SummaryItem,
} from "../types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "请求失败");
  }
  return data as T;
}

export async function fetchAssetTypes() {
  return request<{ items: AssetType[] }>("/api/asset-types");
}

export async function createAssetType(input: {
  name: string;
  description: string;
}) {
  return request<{ item: AssetType }>("/api/asset-types", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchSummary(month: string, compareMonth?: string) {
  const params = new URLSearchParams({ month });
  if (compareMonth) params.set("compareMonth", compareMonth);
  return request<PortfolioSummary>(`/api/summary?${params.toString()}`);
}

export async function fetchAssetHistory(assetTypeId: number) {
  return request<{ items: SummaryItem[] }>(`/api/asset-types/${assetTypeId}/history`);
}

export async function saveRecord(input: RecordFormState, recordId?: number) {
  const payload = {
    assetTypeId: Number(input.assetTypeId),
    month: input.month,
    value: Number(input.value),
    note: input.note,
  };

  return request<{ item: SummaryItem }>(recordId ? `/api/records/${recordId}` : "/api/records", {
    method: recordId ? "PUT" : "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteRecord(recordId: number) {
  return request<{ ok: true }>(`/api/records/${recordId}`, { method: "DELETE" });
}

export async function fetchOperationLogs(input?: {
  action?: OperationLogAction;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (input?.action) params.set("action", input.action);
  if (input?.limit) params.set("limit", String(input.limit));
  const query = params.toString();

  return request<{ items: OperationLog[] }>(
    `/api/operation-logs${query ? `?${query}` : ""}`
  );
}

export async function restoreOperationLog(logId: number) {
  return request<{ item: SummaryItem; log: OperationLog }>(
    `/api/operation-logs/${logId}/restore`,
    { method: "POST" }
  );
}
