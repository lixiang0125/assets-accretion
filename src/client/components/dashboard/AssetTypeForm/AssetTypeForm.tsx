import type { AssetGroup } from "../../../types";
import { Input } from "../../ui/Input";
import { Label } from "../../ui/Label";
import { Button } from "../../ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/Select";

const ungroupedValue = "__ungrouped__";

type AssetTypeFormProps = {
  assetGroups: AssetGroup[];
  description: string;
  groupId: string;
  submitLabel?: string;
  name: string;
  onDescriptionChange: (value: string) => void;
  onGroupIdChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function AssetTypeForm({
  assetGroups,
  description,
  groupId,
  submitLabel = "添加类型",
  name,
  onDescriptionChange,
  onGroupIdChange,
  onNameChange,
  onSubmit,
}: AssetTypeFormProps) {
  return (
    <form className="form-stack" onSubmit={onSubmit}>
      <div className="field-stack">
        <Label htmlFor="asset-type-name">名称</Label>
        <Input
          autoComplete="off"
          id="asset-type-name"
          placeholder="现金 / 股票 / 房产"
          required
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
        />
      </div>
      <div className="field-stack">
        <Label htmlFor="asset-type-group">分组</Label>
        <Select
          value={groupId || ungroupedValue}
          onValueChange={(value) =>
            onGroupIdChange(value === ungroupedValue ? "" : value)
          }
        >
          <SelectTrigger id="asset-type-group" aria-label="资产分组">
            <SelectValue placeholder="选择资产分组" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ungroupedValue}>未分组</SelectItem>
            {assetGroups.map((group) => (
              <SelectItem key={group.id} value={group.id.toString()}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="field-stack">
        <Label htmlFor="asset-type-description">备注</Label>
        <Input
          autoComplete="off"
          id="asset-type-description"
          placeholder="可选"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
        />
      </div>
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
