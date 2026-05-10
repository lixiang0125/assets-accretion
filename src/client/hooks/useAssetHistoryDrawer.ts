import { useState, type FormEvent } from "react";
import {
  deleteAssetType,
  fetchAssetHistory,
  updateAssetType,
} from "../api/assets";
import type { AssetType, StatusType, SummaryItem } from "../types";

type AssetHistoryDrawerOptions = {
  assetTypes: AssetType[];
  clearDeletedAssetType: (assetTypeId: number) => void;
  refresh: (message?: string) => Promise<void>;
  showError: (error: unknown) => void;
  setStatus: (message: string, type: StatusType) => void;
};

export function useAssetHistoryDrawer({
  assetTypes,
  clearDeletedAssetType,
  refresh,
  showError,
  setStatus,
}: AssetHistoryDrawerOptions) {
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

  async function refreshDrawer(nextAssetTypes: AssetType[]) {
    if (!drawerAsset) return;
    const nextDrawerAsset =
      nextAssetTypes.find((assetType) => assetType.id === drawerAsset.id) ??
      null;
    if (nextDrawerAsset) {
      await loadAssetHistory(nextDrawerAsset);
    } else {
      closeDrawer();
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

  function closeDrawer() {
    setDrawerAsset(null);
    setDrawerHistory([]);
    setIsEditingDrawerAsset(false);
  }

  function setDrawerOpen(open: boolean) {
    if (!open) {
      closeDrawer();
    }
  }

  function startEditDrawerAsset() {
    if (!drawerAsset) return;
    setDrawerAssetName(drawerAsset.name);
    setDrawerAssetDescription(drawerAsset.description ?? "");
    setDrawerAssetGroupId(drawerAsset.groupId?.toString() ?? "");
    setIsEditingDrawerAsset(true);
    setStatus("正在编辑资产类型信息", "idle");
  }

  function cancelEditDrawerAsset() {
    if (!drawerAsset) return;
    setDrawerAssetName(drawerAsset.name);
    setDrawerAssetDescription(drawerAsset.description ?? "");
    setDrawerAssetGroupId(drawerAsset.groupId?.toString() ?? "");
    setIsEditingDrawerAsset(false);
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

  function requestDeleteAssetType() {
    if (!drawerAsset) return;
    setPendingDeleteAssetType(drawerAsset);
    setDeleteAssetTypeConfirmStep(1);
    setStatus("等待删除资产类型确认", "idle");
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
      clearDeletedAssetType(pendingDeleteAssetType.id);
      setPendingDeleteAssetType(null);
      setDeleteAssetTypeConfirmStep(1);
      closeDrawer();
      await refresh("资产类型已删除");
    } catch (error) {
      showError(error);
    } finally {
      setIsDeletingAssetType(false);
    }
  }

  return {
    cancelDeleteAssetType,
    cancelEditDrawerAsset,
    confirmDeleteAssetType,
    deleteAssetTypeConfirmStep,
    drawerAsset,
    drawerAssetDescription,
    drawerAssetGroupId,
    drawerAssetName,
    drawerHistory,
    isDeletingAssetType,
    isEditingDrawerAsset,
    isHistoryLoading,
    openHistory,
    pendingDeleteAssetType,
    refreshDrawer,
    requestDeleteAssetType,
    setDrawerAssetDescription,
    setDrawerAssetGroupId,
    setDrawerAssetName,
    setDrawerOpen,
    startEditDrawerAsset,
    submitDrawerAssetType,
  };
}
