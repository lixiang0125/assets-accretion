import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createAssetType,
  deleteRecord,
  fetchAssetHistory,
  fetchAssetTypes,
  fetchSummary,
  saveRecord,
} from "../api/assets";
import type {
  AssetType,
  PortfolioSummary,
  RecordFormState,
  StatusType,
  SummaryItem,
} from "../types";
import { currentMonth, nextMonth, previousMonth } from "../lib/format";

const initialMonth = currentMonth();
const initialCompareMonth = previousMonth(initialMonth);

const emptyRecordForm: RecordFormState = {
  assetTypeId: "",
  month: initialMonth,
  value: "",
  note: "",
};

export function useAssetDashboard() {
  const [month, setMonth] = useState(initialMonth);
  const [compareMonth, setCompareMonth] = useState(initialCompareMonth);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [assetTypeName, setAssetTypeName] = useState("");
  const [assetTypeDescription, setAssetTypeDescription] = useState("");
  const [recordForm, setRecordForm] = useState<RecordFormState>(emptyRecordForm);
  const [editingRecord, setEditingRecord] = useState<SummaryItem | null>(null);
  const [pendingDeleteRecord, setPendingDeleteRecord] = useState<SummaryItem | null>(null);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<1 | 2>(1);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);
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

  async function loadSummary(nextMonth = month, nextCompareMonth = compareMonth) {
    const data = await fetchSummary(nextMonth, nextCompareMonth);
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

  async function refresh(message = "数据已刷新") {
    const [nextAssetTypes] = await Promise.all([
      loadAssetTypes(),
      loadSummary(month, compareMonth),
    ]);
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
      return true;
    } catch (error) {
      showError(error);
      return false;
    }
  }

  async function submitRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await saveRecord(
        { ...recordForm, assetTypeId: selectedAssetTypeId },
        editingRecord?.id ?? undefined
      );
      resetRecordForm();
      await refresh(editingRecord ? "月度价值已更新" : "月度价值已保存");
    } catch (error) {
      showError(error);
    }
  }

  async function changeMonth(targetMonth: string) {
    const nextCompareMonth = previousMonth(targetMonth);
    setMonth(targetMonth);
    setCompareMonth(nextCompareMonth);
    setRecordForm((current) =>
      editingRecord ? current : { ...current, month: targetMonth }
    );
    try {
      await loadSummary(targetMonth, nextCompareMonth);
      setStatus("统计月份已切换");
      setStatusType("idle");
    } catch (error) {
      showError(error);
    }
  }

  async function goToPreviousMonth() {
    await changeMonth(previousMonth(month));
  }

  async function goToNextMonth() {
    await changeMonth(nextMonth(month));
  }

  async function changeCompareMonth(nextCompareMonth: string) {
    setCompareMonth(nextCompareMonth);
    try {
      await loadSummary(month, nextCompareMonth);
      setStatus("对比月份已切换");
      setStatusType("idle");
    } catch (error) {
      showError(error);
    }
  }

  function editRecord(item: SummaryItem) {
    if (!item.hasRecord || item.id === null || item.value === null) {
      recordAssetType(item);
      return;
    }
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

  function recordAssetType(item: SummaryItem) {
    setEditingRecord(null);
    setRecordForm({
      assetTypeId: item.assetTypeId.toString(),
      month: item.month,
      value: "",
      note: "",
    });
    setStatus(`正在记录「${item.assetTypeName}」${item.month} 的月度价值`);
    setStatusType("idle");
  }

  function requestDeleteRecord(item: SummaryItem) {
    if (!item.hasRecord || item.id === null) {
      return;
    }
    setPendingDeleteRecord(item);
    setDeleteConfirmStep(1);
    setStatus("等待删除确认");
    setStatusType("idle");
  }

  function cancelDeleteRecord() {
    if (isDeletingRecord) return;
    setPendingDeleteRecord(null);
    setDeleteConfirmStep(1);
  }

  async function confirmDeleteRecord() {
    if (!pendingDeleteRecord) return;
    if (deleteConfirmStep === 1) {
      setDeleteConfirmStep(2);
      return;
    }

    setIsDeletingRecord(true);
    try {
      if (pendingDeleteRecord.id === null) return;
      await deleteRecord(pendingDeleteRecord.id);
      if (editingRecord?.id === pendingDeleteRecord.id) {
        resetRecordForm();
      }
      setPendingDeleteRecord(null);
      setDeleteConfirmStep(1);
      await refresh("月度记录已删除");
    } catch (error) {
      showError(error);
    } finally {
      setIsDeletingRecord(false);
    }
  }

  function findAssetType(item: SummaryItem) {
    return (
      assetTypes.find((assetType) => assetType.id === item.assetTypeId) ?? {
        id: item.assetTypeId,
        name: item.assetTypeName,
        description: null,
        createdAt: item.createdAt ?? "",
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
    compareMonth,
    drawerAsset,
    drawerHistory,
    editingRecord,
    deleteConfirmStep,
    isHistoryLoading,
    isDeletingRecord,
    month,
    pendingDeleteRecord,
    recordForm,
    selectedAssetTypeId,
    status,
    statusType,
    summary,
    changeMonth,
    changeCompareMonth,
    cancelDeleteRecord,
    confirmDeleteRecord,
    editRecord,
    goToNextMonth,
    goToPreviousMonth,
    openHistory,
    refreshDashboard: refresh,
    recordAssetType,
    requestDeleteRecord,
    resetRecordForm,
    setAssetTypeDescription,
    setAssetTypeName,
    setDrawerOpen,
    submitAssetType,
    submitRecord,
    updateRecordField,
  };
}
