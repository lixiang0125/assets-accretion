import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createAssetType,
  deleteRecord,
  fetchAssetHistory,
  fetchAssetTypes,
  fetchSummary,
  saveRecord,
} from "../api/assets";
import type { AssetType, PortfolioSummary, RecordFormState, StatusType, SummaryItem } from "../types";
import { currentMonth } from "../lib/format";

const initialMonth = currentMonth();

const emptyRecordForm: RecordFormState = {
  assetTypeId: "",
  month: initialMonth,
  value: "",
  note: "",
};

export function useAssetDashboard() {
  const [month, setMonth] = useState(initialMonth);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [assetTypeName, setAssetTypeName] = useState("");
  const [assetTypeDescription, setAssetTypeDescription] = useState("");
  const [recordForm, setRecordForm] = useState<RecordFormState>(emptyRecordForm);
  const [editingRecord, setEditingRecord] = useState<SummaryItem | null>(null);
  const [drawerAsset, setDrawerAsset] = useState<AssetType | null>(null);
  const [drawerHistory, setDrawerHistory] = useState<SummaryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [status, setStatus] = useState("准备就绪");
  const [statusType, setStatusType] = useState<StatusType>("idle");

  const selectedAssetTypeId = useMemo(() => {
    if (recordForm.assetTypeId) return recordForm.assetTypeId;
    return assetTypes[0]?.id.toString() ?? "";
  }, [assetTypes, recordForm.assetTypeId]);

  function showError(error: unknown) {
    setStatus(error instanceof Error ? error.message : "请求失败");
    setStatusType("error");
  }

  function updateRecordField(field: keyof RecordFormState, value: string) {
    setRecordForm((current) => ({ ...current, [field]: value }));
  }

  async function loadAssetTypes() {
    const data = await fetchAssetTypes();
    setAssetTypes(data.items);
    setRecordForm((current) => {
      if (current.assetTypeId || !data.items[0]) return current;
      return { ...current, assetTypeId: data.items[0].id.toString() };
    });
    return data.items;
  }

  async function loadSummary(nextMonth = month) {
    const data = await fetchSummary(nextMonth);
    setSummary(data);
    return data;
  }

  async function loadAssetHistory(assetType: AssetType) {
    setDrawerAsset(assetType);
    setIsHistoryLoading(true);
    try {
      const data = await fetchAssetHistory(assetType.id);
      setDrawerHistory(data.items);
    } catch (error) {
      showError(error);
    } finally {
      setIsHistoryLoading(false);
    }
  }

  async function refresh(message: string) {
    const [nextAssetTypes] = await Promise.all([loadAssetTypes(), loadSummary()]);
    if (drawerAsset) {
      const nextDrawerAsset =
        nextAssetTypes.find((assetType) => assetType.id === drawerAsset.id) ?? drawerAsset;
      await loadAssetHistory(nextDrawerAsset);
    }
    setStatus(message);
    setStatusType("idle");
  }

  function resetRecordForm() {
    setEditingRecord(null);
    setRecordForm({
      assetTypeId: selectedAssetTypeId,
      month,
      value: "",
      note: "",
    });
  }

  useEffect(() => {
    Promise.all([loadAssetTypes(), loadSummary()]).catch(showError);
  }, []);

  async function submitAssetType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createAssetType({
        name: assetTypeName,
        description: assetTypeDescription,
      });
      setAssetTypeName("");
      setAssetTypeDescription("");
      await refresh("资产类型已添加");
    } catch (error) {
      showError(error);
    }
  }

  async function submitRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await saveRecord(
        { ...recordForm, assetTypeId: selectedAssetTypeId },
        editingRecord?.id
      );
      resetRecordForm();
      await refresh(editingRecord ? "月度价值已更新" : "月度价值已保存");
    } catch (error) {
      showError(error);
    }
  }

  async function changeMonth(nextMonth: string) {
    setMonth(nextMonth);
    setRecordForm((current) =>
      editingRecord ? current : { ...current, month: nextMonth }
    );
    try {
      await loadSummary(nextMonth);
      setStatus("统计月份已切换");
      setStatusType("idle");
    } catch (error) {
      showError(error);
    }
  }

  function editRecord(item: SummaryItem) {
    setEditingRecord(item);
    setRecordForm({
      assetTypeId: item.assetTypeId.toString(),
      month: item.month,
      value: String(item.value),
      note: item.note ?? "",
    });
    setStatus("正在编辑月度记录");
    setStatusType("idle");
  }

  async function removeRecord(item: SummaryItem) {
    const confirmed = window.confirm(`删除 ${item.assetTypeName} ${item.month} 的月度记录？`);
    if (!confirmed) return;

    try {
      await deleteRecord(item.id);
      if (editingRecord?.id === item.id) {
        resetRecordForm();
      }
      await refresh("月度记录已删除");
    } catch (error) {
      showError(error);
    }
  }

  function findAssetType(item: SummaryItem) {
    return (
      assetTypes.find((assetType) => assetType.id === item.assetTypeId) ?? {
        id: item.assetTypeId,
        name: item.assetTypeName,
        description: null,
        createdAt: item.createdAt,
      }
    );
  }

  function openHistory(item: SummaryItem) {
    void loadAssetHistory(findAssetType(item));
  }

  function setDrawerOpen(open: boolean) {
    if (!open) {
      setDrawerAsset(null);
    }
  }

  return {
    assetTypeDescription,
    assetTypeName,
    assetTypes,
    drawerAsset,
    drawerHistory,
    editingRecord,
    isHistoryLoading,
    month,
    recordForm,
    selectedAssetTypeId,
    status,
    statusType,
    summary,
    changeMonth,
    editRecord,
    openHistory,
    removeRecord,
    resetRecordForm,
    setAssetTypeDescription,
    setAssetTypeName,
    setDrawerOpen,
    submitAssetType,
    submitRecord,
    updateRecordField,
  };
}
