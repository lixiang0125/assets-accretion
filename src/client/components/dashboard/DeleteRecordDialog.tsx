import { AlertTriangle } from "lucide-react";
import type { SummaryItem } from "../../types";
import { formatCurrency } from "../../lib/format";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

type DeleteRecordDialogProps = {
  confirmStep: 1 | 2;
  isDeleting: boolean;
  record: SummaryItem | null;
  onCancel: () => void;
  onConfirmStep: () => void;
};

export function DeleteRecordDialog({
  confirmStep,
  isDeleting,
  record,
  onCancel,
  onConfirmStep,
}: DeleteRecordDialogProps) {
  return (
    <Dialog open={record !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <div className="dialog-title-row">
            <span className="danger-icon" aria-hidden="true">
              <AlertTriangle />
            </span>
            <div>
              <DialogTitle>
                {confirmStep === 1 ? "确认删除月度记录" : "二次确认删除"}
              </DialogTitle>
              <DialogDescription>
                删除后会从月度明细中移除，可在操作记录中恢复。
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {record ? (
          <div className="delete-record-summary">
            <div>
              <span>资产类型</span>
              <strong>{record.assetTypeName}</strong>
            </div>
            <div>
              <span>月份</span>
              <strong>{record.month}</strong>
            </div>
            <div>
              <span>当月价值</span>
              <strong>{formatCurrency(record.value)}</strong>
            </div>
          </div>
        ) : null}

        <p className="danger-copy">
          {confirmStep === 1
            ? "这是一个高风险操作。请先确认要删除的资产类型、月份和金额。"
            : "请再次确认：删除后当前统计页会立即失去这条记录，恢复需要进入操作记录页面执行。"}
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
