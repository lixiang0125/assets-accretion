import { useEffect, useMemo, useState, type FormEvent } from "react";
import { deleteRecord, saveRecord } from "../api/assets";
import type {
  AssetType,
  RecordFormState,
  StatusType,
  SummaryItem,
} from "../types";
import { initialMonth } from "./useDashboardData";

const emptyRecordForm: RecordFormState = {
  assetTypeId: "",
  month: initialMonth,
  value: "",
  note: "",
};

type RecordEditorOptions = {
  assetTypes: AssetType[];
  month: string;
  refresh: (message?: string) => Promise<void>;
  showError: (error: unknown) => void;
  setStatus: (message: string, type: StatusType) => void;
};

export function useRecordEditor({
  assetTypes,
  month,
  refresh,
  showError,
  setStatus,
}: RecordEditorOptions) {
  const [recordForm, setRecordForm] =
    useState<RecordFormState>(emptyRecordForm);
  const [editingRecord, setEditingRecord] = useState<SummaryItem | null>(null);
  const [isRecordDrawerOpen, setIsRecordDrawerOpen] = useState(false);
  const [pendingDeleteRecord, setPendingDeleteRecord] =
    useState<SummaryItem | null>(null);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<1 | 2>(1);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);

  const selectedAssetTypeId = useMemo(() => {
    if (recordForm.assetTypeId) return recordForm.assetTypeId;
    return assetTypes[0]?.id.toString() ?? "";
  }, [assetTypes, recordForm.assetTypeId]);

  useEffect(() => {
    setRecordForm((current) => {
      if (current.assetTypeId || !assetTypes[0]) return current;
      return { ...current, assetTypeId: assetTypes[0].id.toString() };
    });
  }, [assetTypes]);

  useEffect(() => {
    setRecordForm((current) =>
      editingRecord ? current : { ...current, month },
    );
  }, [editingRecord, month]);

  function updateRecordField(field: keyof RecordFormState, value: string) {
    setRecordForm((current) => ({ ...current, [field]: value }));
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
    setStatus("正在编辑月度记录", "idle");
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
    setStatus(`正在记录「${item.assetTypeName}」${item.month} 的月度价值`, "idle");
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
    setStatus("等待删除确认", "idle");
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

  function clearDeletedAssetType(assetTypeId: number) {
    if (editingRecord?.assetTypeId === assetTypeId) {
      setEditingRecord(null);
      setIsRecordDrawerOpen(false);
    }
    setRecordForm((current) => ({
      ...current,
      assetTypeId:
        current.assetTypeId === assetTypeId.toString()
          ? ""
          : current.assetTypeId,
    }));
  }

  return {
    cancelDeleteRecord,
    changeRecordDrawerOpen,
    clearDeletedAssetType,
    confirmDeleteRecord,
    deleteConfirmStep,
    editRecord,
    editingRecord,
    isDeletingRecord,
    isRecordDrawerOpen,
    pendingDeleteRecord,
    recordAssetType,
    recordForm,
    requestDeleteRecord,
    resetRecordForm,
    selectedAssetTypeId,
    submitRecord,
    updateRecordField,
  };
}
