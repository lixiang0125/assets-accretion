import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createAssetGroup,
  createAssetType,
  deleteAssetType,
  deleteRecord,
  fetchAssetGroups,
  fetchAssetHistory,
  fetchAssetTypes,
  fetchPortfolioTrend,
  fetchSummary,
  saveRecord,
  updateAssetType,
} from "../api/assets";
import type {
  AssetGroup,
  AssetType,
  PortfolioSummary,
  PortfolioTrendPoint,
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
  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [portfolioTrend, setPortfolioTrend] = useState<PortfolioTrendPoint[]>(
    [],
  );
  const [assetTypeName, setAssetTypeName] = useState("");
  const [assetTypeDescription, setAssetTypeDescription] = useState("");
  const [assetTypeGroupId, setAssetTypeGroupId] = useState("");
  const [assetGroupName, setAssetGroupName] = useState("");
  const [recordForm, setRecordForm] =
    useState<RecordFormState>(emptyRecordForm);
  const [editingRecord, setEditingRecord] = useState<SummaryItem | null>(null);
  const [isRecordDrawerOpen, setIsRecordDrawerOpen] = useState(false);
  const [pendingDeleteRecord, setPendingDeleteRecord] =
    useState<SummaryItem | null>(null);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<1 | 2>(1);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);
  const [drawerAsset, setDrawerAsset] = useState<AssetType | null>(null);
  const [drawerHistory, setDrawerHistory] = useState<SummaryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isEditingDrawerAsset, setIsEditingDrawerAsset] = useState(false);
  const [drawerAssetName, setDrawerAssetName] = useState("");
  const [drawerAssetDescription, setDrawerAssetDescription] = useState("");
  const [drawerAssetGroupId, setDrawerAssetGroupId] = useState("");
  const [pendingDeleteAssetType, setPendingDeleteAssetType] =
    useState<AssetType | null>(null);
  const [deleteAssetTypeConfirmStep, setDeleteAssetTypeConfirmStep] = useState<
    1 | 2
  >(1);
  const [isDeletingAssetType, setIsDeletingAssetType] = useState(false);
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

  async function loadAssetGroups() {
    const data = await fetchAssetGroups();
    setAssetGroups(data.items);
    return data.items;
  }

  async function loadSummary(
    nextMonth = month,
    nextCompareMonth = compareMonth,
  ) {
    const data = await fetchSummary(nextMonth, nextCompareMonth);
    setSummary(data);
    return data;
  }

  async function loadPortfolioTrend() {
    const data = await fetchPortfolioTrend();
    setPortfolioTrend(data.items);
    return data.items;
  }

  async function loadAssetHistory(assetType: AssetType) {
    setDrawerAsset(assetType);
    setDrawerAssetName(assetType.name);
    setDrawerAssetDescription(assetType.description ?? "");
    setDrawerAssetGroupId(assetType.groupId?.toString() ?? "");
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
    const [, nextAssetTypes] = await Promise.all([
      loadAssetGroups(),
      loadAssetTypes(),
      loadSummary(month, compareMonth),
      loadPortfolioTrend(),
    ]);
    if (drawerAsset) {
      const nextDrawerAsset =
        nextAssetTypes.find((assetType) => assetType.id === drawerAsset.id) ??
        null;
      if (nextDrawerAsset) {
        await loadAssetHistory(nextDrawerAsset);
      } else {
        setDrawerAsset(null);
        setDrawerHistory([]);
        setIsEditingDrawerAsset(false);
      }
    }
    setStatus(message);
    setStatusType("idle");
  }

  function resetRecordForm() {
    setEditingRecord(null);
    setIsRecordDrawerOpen(false);
    setRecordForm({
      assetTypeId: selectedAssetTypeId,
      month,
      value: "",
      note: "",
    });
  }

  useEffect(() => {
    Promise.all([
      loadAssetGroups(),
      loadAssetTypes(),
      loadSummary(),
      loadPortfolioTrend(),
    ]).catch(showError);
  }, []);

  async function submitAssetGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createAssetGroup({ name: assetGroupName });
      setAssetGroupName("");
      await refresh("资产分组已添加");
      return true;
    } catch (error) {
      showError(error);
      return false;
    }
  }

  async function submitAssetType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createAssetType({
        name: assetTypeName,
        description: assetTypeDescription,
        groupId: assetTypeGroupId ? Number(assetTypeGroupId) : null,
      });
      setAssetTypeName("");
      setAssetTypeDescription("");
      setAssetTypeGroupId("");
      await refresh("资产类型已添加");
      return true;
    } catch (error) {
      showError(error);
      return false;
    }
  }

  async function submitDrawerAssetType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!drawerAsset) return false;
    try {
      const data = await updateAssetType(drawerAsset.id, {
        name: drawerAssetName,
        description: drawerAssetDescription,
        groupId: drawerAssetGroupId ? Number(drawerAssetGroupId) : null,
      });
      setDrawerAsset(data.item);
      setDrawerAssetName(data.item.name);
      setDrawerAssetDescription(data.item.description ?? "");
      setDrawerAssetGroupId(data.item.groupId?.toString() ?? "");
      setIsEditingDrawerAsset(false);
      await refresh("资产类型信息已更新");
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
        editingRecord?.id ?? undefined,
      );
      await refresh(editingRecord ? "月度价值已更新" : "月度价值已保存");
      resetRecordForm();
    } catch (error) {
      showError(error);
    }
  }

  async function changeMonth(targetMonth: string) {
    const nextCompareMonth = previousMonth(targetMonth);
    setMonth(targetMonth);
    setCompareMonth(nextCompareMonth);
    setRecordForm((current) =>
      editingRecord ? current : { ...current, month: targetMonth },
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
    setIsRecordDrawerOpen(true);
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
    setIsRecordDrawerOpen(true);
    setStatus(`正在记录「${item.assetTypeName}」${item.month} 的月度价值`);
    setStatusType("idle");
  }

  function changeRecordDrawerOpen(open: boolean) {
    if (!open) {
      resetRecordForm();
      return;
    }
    setIsRecordDrawerOpen(true);
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
        groupId: item.assetGroupId,
        groupName: item.assetGroupName,
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
      setDrawerHistory([]);
      setIsEditingDrawerAsset(false);
    }
  }

  function startEditDrawerAsset() {
    if (!drawerAsset) return;
    setDrawerAssetName(drawerAsset.name);
    setDrawerAssetDescription(drawerAsset.description ?? "");
    setDrawerAssetGroupId(drawerAsset.groupId?.toString() ?? "");
    setIsEditingDrawerAsset(true);
    setStatus("正在编辑资产类型信息");
    setStatusType("idle");
  }

  function cancelEditDrawerAsset() {
    if (!drawerAsset) return;
    setDrawerAssetName(drawerAsset.name);
    setDrawerAssetDescription(drawerAsset.description ?? "");
    setDrawerAssetGroupId(drawerAsset.groupId?.toString() ?? "");
    setIsEditingDrawerAsset(false);
  }

  function requestDeleteAssetType() {
    if (!drawerAsset) return;
    setPendingDeleteAssetType(drawerAsset);
    setDeleteAssetTypeConfirmStep(1);
    setStatus("等待删除资产类型确认");
    setStatusType("idle");
  }

  function cancelDeleteAssetType() {
    if (isDeletingAssetType) return;
    setPendingDeleteAssetType(null);
    setDeleteAssetTypeConfirmStep(1);
  }

  async function confirmDeleteAssetType() {
    if (!pendingDeleteAssetType) return;
    if (deleteAssetTypeConfirmStep === 1) {
      setDeleteAssetTypeConfirmStep(2);
      return;
    }

    setIsDeletingAssetType(true);
    try {
      await deleteAssetType(pendingDeleteAssetType.id);
      if (editingRecord?.assetTypeId === pendingDeleteAssetType.id) {
        setEditingRecord(null);
        setIsRecordDrawerOpen(false);
      }
      setRecordForm((current) => ({
        ...current,
        assetTypeId:
          current.assetTypeId === pendingDeleteAssetType.id.toString()
            ? ""
            : current.assetTypeId,
      }));
      setPendingDeleteAssetType(null);
      setDeleteAssetTypeConfirmStep(1);
      setDrawerAsset(null);
      setDrawerHistory([]);
      setIsEditingDrawerAsset(false);
      await refresh("资产类型已删除");
    } catch (error) {
      showError(error);
    } finally {
      setIsDeletingAssetType(false);
    }
  }

  return {
    assetGroupName,
    assetGroups,
    assetTypeDescription,
    assetTypeGroupId,
    assetTypeName,
    assetTypes,
    compareMonth,
    deleteAssetTypeConfirmStep,
    drawerAsset,
    drawerAssetDescription,
    drawerAssetGroupId,
    drawerHistory,
    drawerAssetName,
    editingRecord,
    deleteConfirmStep,
    pendingDeleteAssetType,
    isHistoryLoading,
    isDeletingAssetType,
    isEditingDrawerAsset,
    isRecordDrawerOpen,
    isDeletingRecord,
    month,
    pendingDeleteRecord,
    portfolioTrend,
    recordForm,
    selectedAssetTypeId,
    status,
    statusType,
    summary,
    changeMonth,
    changeCompareMonth,
    changeRecordDrawerOpen,
    cancelDeleteAssetType,
    cancelEditDrawerAsset,
    cancelDeleteRecord,
    confirmDeleteAssetType,
    confirmDeleteRecord,
    editRecord,
    goToNextMonth,
    goToPreviousMonth,
    openHistory,
    refreshDashboard: refresh,
    recordAssetType,
    requestDeleteAssetType,
    requestDeleteRecord,
    resetRecordForm,
    setAssetGroupName,
    setAssetTypeDescription,
    setAssetTypeGroupId,
    setAssetTypeName,
    setDrawerAssetDescription,
    setDrawerAssetGroupId,
    setDrawerAssetName,
    setDrawerOpen,
    submitAssetGroup,
    submitAssetType,
    submitDrawerAssetType,
    submitRecord,
    startEditDrawerAsset,
    updateRecordField,
  };
}
