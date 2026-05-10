import type { AssetGroup } from "../../../types";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Label } from "../../ui/Label";

type AssetGroupFormProps = {
  assetGroups: AssetGroup[];
  name: string;
  onNameChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function AssetGroupForm({
  assetGroups,
  name,
  onNameChange,
  onSubmit,
}: AssetGroupFormProps) {
  return (
    <form className="form-stack" onSubmit={onSubmit}>
      <div className="field-stack">
        <Label htmlFor="asset-group-name">名称</Label>
        <Input
          autoComplete="off"
          id="asset-group-name"
          placeholder="现金类 / 证券 / 房产"
          required
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
        />
      </div>
      <Button type="submit">添加分组</Button>
      <section className="asset-group-list" aria-label="已有资产分组">
        <div className="asset-group-list-header">
          <h3>已有分组</h3>
          <span>{assetGroups.length}</span>
        </div>
        {assetGroups.length === 0 ? (
          <p className="asset-group-empty">暂无分组</p>
        ) : (
          <div className="asset-group-chip-list">
            {assetGroups.map((group) => (
              <span className="asset-group-chip" key={group.id}>
                {group.name}
              </span>
            ))}
          </div>
        )}
      </section>
    </form>
  );
}
