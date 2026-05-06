import { Input } from "../../ui/Input";
import { Label } from "../../ui/Label";
import { Button } from "../../ui/Button";

type AssetTypeFormProps = {
  description: string;
  name: string;
  onDescriptionChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function AssetTypeForm({
  description,
  name,
  onDescriptionChange,
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
        <Label htmlFor="asset-type-description">备注</Label>
        <Input
          autoComplete="off"
          id="asset-type-description"
          placeholder="可选"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
        />
      </div>
      <Button type="submit">添加类型</Button>
    </form>
  );
}
