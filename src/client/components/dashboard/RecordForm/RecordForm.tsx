import type { FormEvent } from "react";
import type { AssetType, RecordFormState, SummaryItem } from "../../../types";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Label } from "../../ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/Select";

type RecordFormProps = {
  assetTypes: AssetType[];
  editingRecord: SummaryItem | null;
  form: RecordFormState;
  selectedAssetTypeId: string;
  onCancelEdit: () => void;
  onFieldChange: (field: keyof RecordFormState, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function RecordForm({
  assetTypes,
  editingRecord,
  form,
  selectedAssetTypeId,
  onCancelEdit,
  onFieldChange,
  onSubmit,
}: RecordFormProps) {
  const hasAssetTypes = assetTypes.length > 0;

  return (
    <form className="form-stack" onSubmit={onSubmit}>
      <div className="field-stack">
        <Label htmlFor="record-asset-type">资产类型</Label>
        <Select
          disabled={!hasAssetTypes}
          value={selectedAssetTypeId}
          onValueChange={(value) => onFieldChange("assetTypeId", value)}
        >
          <SelectTrigger id="record-asset-type" aria-label="资产类型">
            <SelectValue placeholder="先添加资产类型" />
          </SelectTrigger>
          <SelectContent>
            {assetTypes.map((assetType) => (
              <SelectItem key={assetType.id} value={assetType.id.toString()}>
                {assetType.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="field-stack">
        <Label htmlFor="record-month">月份</Label>
        <Input
          id="record-month"
          required
          type="month"
          value={form.month}
          onChange={(event) => onFieldChange("month", event.target.value)}
        />
      </div>
      <div className="field-stack">
        <Label htmlFor="record-value">价值</Label>
        <Input
          id="record-value"
          min="0"
          placeholder="0.00"
          required
          step="0.01"
          type="number"
          value={form.value}
          onChange={(event) => onFieldChange("value", event.target.value)}
        />
      </div>
      <div className="field-stack">
        <Label htmlFor="record-note">备注</Label>
        <Input
          autoComplete="off"
          id="record-note"
          placeholder="可选"
          value={form.note}
          onChange={(event) => onFieldChange("note", event.target.value)}
        />
      </div>
      <div className="form-actions">
        {editingRecord ? (
          <Button type="button" variant="outline" onClick={onCancelEdit}>
            取消编辑
          </Button>
        ) : null}
        <Button disabled={!hasAssetTypes} type="submit">
          {editingRecord ? "更新记录" : "保存记录"}
        </Button>
      </div>
    </form>
  );
}
