import { useState, type FormEvent } from "react";
import { createAssetGroup, createAssetType } from "../api/assets";
import type { StatusType } from "../types";
import { useAssetHistoryDrawer } from "./useAssetHistoryDrawer";
import { useDashboardData } from "./useDashboardData";
import { useRecordEditor } from "./useRecordEditor";

export function useAssetDashboard() {
  const [assetTypeName, setAssetTypeName] = useState("");
  const [assetTypeDescription, setAssetTypeDescription] = useState("");
  const [assetTypeGroupId, setAssetTypeGroupId] = useState("");
  const [assetGroupName, setAssetGroupName] = useState("");
  const [status, setStatusValue] = useState("准备就绪");
  const [statusType, setStatusType] = useState<StatusType>("idle");

  function setStatus(message: string, type: StatusType) {
    setStatusValue(message);
    setStatusType(type);
  }

  function showError(error: unknown) {
    setStatus(error instanceof Error ? error.message : "请求失败", "error");
  }

  const dashboardData = useDashboardData({
    onError: showError,
    setStatus,
  });

  async function refreshDashboard(message = "数据已刷新") {
    const { assetTypes } = await dashboardData.refreshData();
    await assetHistoryDrawer.refreshDrawer(assetTypes);
    setStatus(message, "idle");
  }

  const recordEditor = useRecordEditor({
    assetTypes: dashboardData.assetTypes,
    month: dashboardData.month,
    refresh: refreshDashboard,
    showError,
    setStatus,
  });

  const assetHistoryDrawer = useAssetHistoryDrawer({
    assetTypes: dashboardData.assetTypes,
    clearDeletedAssetType: recordEditor.clearDeletedAssetType,
    refresh: refreshDashboard,
    showError,
    setStatus,
  });

  async function submitAssetGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createAssetGroup({ name: assetGroupName });
      setAssetGroupName("");
      await refreshDashboard("资产分组已添加");
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
      await refreshDashboard("资产类型已添加");
      return true;
    } catch (error) {
      showError(error);
      return false;
    }
  }

  return {
    assetGroupName,
    assetGroups: dashboardData.assetGroups,
    assetTypeDescription,
    assetTypeGroupId,
    assetTypeName,
    assetTypes: dashboardData.assetTypes,
    compareMonth: dashboardData.compareMonth,
    deleteAssetTypeConfirmStep: assetHistoryDrawer.deleteAssetTypeConfirmStep,
    deleteConfirmStep: recordEditor.deleteConfirmStep,
    drawerAsset: assetHistoryDrawer.drawerAsset,
    drawerAssetDescription: assetHistoryDrawer.drawerAssetDescription,
    drawerAssetGroupId: assetHistoryDrawer.drawerAssetGroupId,
    drawerAssetName: assetHistoryDrawer.drawerAssetName,
    drawerHistory: assetHistoryDrawer.drawerHistory,
    editingRecord: recordEditor.editingRecord,
    isDeletingAssetType: assetHistoryDrawer.isDeletingAssetType,
    isDeletingRecord: recordEditor.isDeletingRecord,
    isEditingDrawerAsset: assetHistoryDrawer.isEditingDrawerAsset,
    isHistoryLoading: assetHistoryDrawer.isHistoryLoading,
    isRecordDrawerOpen: recordEditor.isRecordDrawerOpen,
    month: dashboardData.month,
    pendingDeleteAssetType: assetHistoryDrawer.pendingDeleteAssetType,
    pendingDeleteRecord: recordEditor.pendingDeleteRecord,
    portfolioTrend: dashboardData.portfolioTrend,
    recordForm: recordEditor.recordForm,
    selectedAssetTypeId: recordEditor.selectedAssetTypeId,
    status,
    statusType,
    summary: dashboardData.summary,
    cancelDeleteAssetType: assetHistoryDrawer.cancelDeleteAssetType,
    cancelDeleteRecord: recordEditor.cancelDeleteRecord,
    cancelEditDrawerAsset: assetHistoryDrawer.cancelEditDrawerAsset,
    changeCompareMonth: dashboardData.changeCompareMonth,
    changeMonth: dashboardData.changeMonth,
    changeRecordDrawerOpen: recordEditor.changeRecordDrawerOpen,
    confirmDeleteAssetType: assetHistoryDrawer.confirmDeleteAssetType,
    confirmDeleteRecord: recordEditor.confirmDeleteRecord,
    editRecord: recordEditor.editRecord,
    goToNextMonth: dashboardData.goToNextMonth,
    goToPreviousMonth: dashboardData.goToPreviousMonth,
    openHistory: assetHistoryDrawer.openHistory,
    recordAssetType: recordEditor.recordAssetType,
    refreshDashboard,
    requestDeleteAssetType: assetHistoryDrawer.requestDeleteAssetType,
    requestDeleteRecord: recordEditor.requestDeleteRecord,
    resetRecordForm: recordEditor.resetRecordForm,
    setAssetGroupName,
    setAssetTypeDescription,
    setAssetTypeGroupId,
    setAssetTypeName,
    setDrawerAssetDescription: assetHistoryDrawer.setDrawerAssetDescription,
    setDrawerAssetGroupId: assetHistoryDrawer.setDrawerAssetGroupId,
    setDrawerAssetName: assetHistoryDrawer.setDrawerAssetName,
    setDrawerOpen: assetHistoryDrawer.setDrawerOpen,
    startEditDrawerAsset: assetHistoryDrawer.startEditDrawerAsset,
    submitAssetGroup,
    submitAssetType,
    submitDrawerAssetType: assetHistoryDrawer.submitDrawerAssetType,
    submitRecord: recordEditor.submitRecord,
    updateRecordField: recordEditor.updateRecordField,
  };
}
