import type { FormEvent } from "react";
import type { AssetType, RecordFormState, SummaryItem } from "../../../types";
import { RecordForm } from "../RecordForm";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../ui/Sheet";

type RecordDrawerProps = {
  assetTypes: AssetType[];
  editingRecord: SummaryItem | null;
  form: RecordFormState;
  isOpen: boolean;
  selectedAssetTypeId: string;
  onCancelEdit: () => void;
  onFieldChange: (field: keyof RecordFormState, value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function RecordDrawer({
  assetTypes,
  editingRecord,
  form,
  isOpen,
  selectedAssetTypeId,
  onCancelEdit,
  onFieldChange,
  onOpenChange,
  onSubmit,
}: RecordDrawerProps) {
  const title = editingRecord ? "编辑月度价值" : "记录月度价值";
  const description = editingRecord
    ? `正在编辑 ${editingRecord.assetTypeName} ${editingRecord.month} 的资产价值。`
    : "从月度明细选择资产类型后，在这里补充当月价值。";

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader className="record-drawer-header">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="record-drawer-body">
          <RecordForm
            assetTypes={assetTypes}
            editingRecord={editingRecord}
            form={form}
            selectedAssetTypeId={selectedAssetTypeId}
            onCancelEdit={onCancelEdit}
            onFieldChange={onFieldChange}
            onSubmit={onSubmit}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
