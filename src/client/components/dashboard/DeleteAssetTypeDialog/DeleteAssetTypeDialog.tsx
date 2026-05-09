import { AlertTriangle } from "lucide-react";
import type { AssetType } from "../../../types";
import { Button } from "../../ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/Dialog";

type DeleteAssetTypeDialogProps = {
  asset: AssetType | null;
  confirmStep: 1 | 2;
  isDeleting: boolean;
  recordCount: number;
  onCancel: () => void;
  onConfirmStep: () => void;
};

export function DeleteAssetTypeDialog({
  asset,
  confirmStep,
  isDeleting,
  recordCount,
  onCancel,
  onConfirmStep,
}: DeleteAssetTypeDialogProps) {
  return (
    <Dialog open={asset !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <div className="delete-asset-type-title-row">
            <span className="delete-asset-type-danger-icon" aria-hidden="true">
              <AlertTriangle />
            </span>
            <div>
              <DialogTitle>
                {confirmStep === 1 ? "确认删除资产类型" : "二次确认删除"}
              </DialogTitle>
              <DialogDescription>
                删除后会移除该资产类型及其所有月度记录。
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {asset ? (
          <div className="delete-asset-type-summary">
            <div>
              <span>资产类型</span>
              <strong>{asset.name}</strong>
            </div>
            <div>
              <span>关联月度记录</span>
              <strong>{recordCount} 条</strong>
            </div>
          </div>
        ) : null}

        <p className="delete-asset-type-danger-copy">
          {confirmStep === 1
            ? "这是一个高风险操作。请先确认资产类型名称和关联记录数量。"
            : "请再次确认：该资产类型下的月度记录会一并删除，此操作不会在操作记录中提供一键恢复。"}
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isDeleting}>
            取消
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirmStep}
            disabled={isDeleting}
          >
            {confirmStep === 1 ? "继续删除" : isDeleting ? "删除中" : "确认删除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
