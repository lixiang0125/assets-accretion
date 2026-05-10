import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Label } from "../../ui/Label";

type AssetGroupFormProps = {
  name: string;
  onNameChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function AssetGroupForm({
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
    </form>
  );
}
