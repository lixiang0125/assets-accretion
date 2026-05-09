import type { FormEvent } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import type { AssetType, SummaryItem } from "../../../types";
import {
  formatCurrency,
  formatDateTime,
  formatPercent,
  toneClass,
} from "../../../lib/format";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { Input } from "../../ui/Input";
import { Label } from "../../ui/Label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../ui/Sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/Table";
import { HistoryChart } from "../HistoryChart";

type HistoryDrawerProps = {
  asset: AssetType | null;
  assetDescription: string;
  assetName: string;
  history: SummaryItem[];
  isEditingAsset: boolean;
  isLoading: boolean;
  onAssetDescriptionChange: (value: string) => void;
  onAssetNameChange: (value: string) => void;
  onCancelEditAsset: () => void;
  onRequestDeleteAsset: () => void;
  onStartEditAsset: () => void;
  onSubmitAsset: (event: FormEvent<HTMLFormElement>) => void;
  onOpenChange: (open: boolean) => void;
};

export function HistoryDrawer({
  asset,
  assetDescription,
  assetName,
  history,
  isEditingAsset,
  isLoading,
  onAssetDescriptionChange,
  onAssetNameChange,
  onCancelEditAsset,
  onRequestDeleteAsset,
  onStartEditAsset,
  onSubmitAsset,
  onOpenChange,
}: HistoryDrawerProps) {
  return (
    <Sheet open={asset !== null} onOpenChange={onOpenChange}>
      <SheetContent aria-label={asset ? `${asset.name} 月度变化` : undefined}>
        {asset ? (
          <>
            <SheetHeader className="history-drawer-header">
              <div>
                <SheetDescription>月度变化</SheetDescription>
                <SheetTitle>{asset.name}</SheetTitle>
                {asset.description ? (
                  <p className="sheet-note">{asset.description}</p>
                ) : null}
              </div>
              <div className="history-drawer-actions" aria-label="资产类型操作">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="编辑资产类型"
                  title="编辑资产类型"
                  onClick={onStartEditAsset}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  aria-label="删除资产类型"
                  title="删除资产类型"
                  onClick={onRequestDeleteAsset}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </SheetHeader>

            {isEditingAsset ? (
              <form className="history-asset-form" onSubmit={onSubmitAsset}>
                <div className="field-stack">
                  <Label htmlFor="drawer-asset-type-name">名称</Label>
                  <Input
                    autoComplete="off"
                    id="drawer-asset-type-name"
                    required
                    value={assetName}
                    onChange={(event) => onAssetNameChange(event.target.value)}
                  />
                </div>
                <div className="field-stack">
                  <Label htmlFor="drawer-asset-type-description">备注</Label>
                  <Input
                    autoComplete="off"
                    id="drawer-asset-type-description"
                    placeholder="可选"
                    value={assetDescription}
                    onChange={(event) => onAssetDescriptionChange(event.target.value)}
                  />
                </div>
                <div className="history-asset-form-actions">
                  <Button type="submit">保存修改</Button>
                  <Button type="button" variant="outline" onClick={onCancelEditAsset}>
                    <X aria-hidden="true" />
                    取消
                  </Button>
                </div>
              </form>
            ) : null}

            <Card className="chart-panel">
              {isLoading ? <div className="empty-chart">加载中</div> : <HistoryChart items={history} />}
            </Card>

            <div className="table-scroll drawer-table">
              <Table>
                <TableHeader>
                  <TableRow>
                    {["月份", "价值", "增值金额", "增值率", "最后更新"].map((heading) => (
                      <TableHead key={heading}>{heading}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow>
                      <TableCell className="empty-cell" colSpan={5}>
                        暂无月度记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map((item) => (
                      <TableRow key={`${item.assetTypeId}-${item.month}`}>
                        <TableCell>{item.month}</TableCell>
                        <TableCell>{formatCurrency(item.value)}</TableCell>
                        <TableCell className={toneClass(item.changeValue)}>
                          {formatCurrency(item.changeValue)}
                        </TableCell>
                        <TableCell className={toneClass(item.changeRate)}>
                          {formatPercent(item.changeRate)}
                        </TableCell>
                        <TableCell className="history-updated-at">
                          {formatDateTime(item.updatedAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
