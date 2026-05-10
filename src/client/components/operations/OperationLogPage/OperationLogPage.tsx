import type { OperationLog, OperationLogAction } from "../../../types";
import { formatDateTime } from "../../../lib/format";
import { cn } from "../../../lib/utils";
import {
  useOperationLogs,
  type OperationLogFilter,
} from "../../../hooks/useOperationLogs";
import { Button } from "../../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/Card";
import { Label } from "../../ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/Table";

type OperationLogPageProps = {
  onRestored: () => Promise<void> | void;
};

const actionLabels: Record<OperationLogAction, string> = {
  asset_group_created: "创建资产分组",
  asset_type_created: "创建资产类型",
  asset_type_updated: "更新资产类型",
  asset_type_deleted: "删除资产类型",
  record_created: "创建月度记录",
  record_updated: "更新月度记录",
  record_deleted: "删除月度记录",
  record_restored: "恢复月度记录",
};

const filters: Array<{ label: string; value: OperationLogFilter }> = [
  { label: "全部操作", value: "all" },
  { label: "创建资产分组", value: "asset_group_created" },
  { label: "创建资产类型", value: "asset_type_created" },
  { label: "更新资产类型", value: "asset_type_updated" },
  { label: "删除资产类型", value: "asset_type_deleted" },
  { label: "创建月度记录", value: "record_created" },
  { label: "更新月度记录", value: "record_updated" },
  { label: "删除月度记录", value: "record_deleted" },
  { label: "恢复月度记录", value: "record_restored" },
];

function formatPayload(log: OperationLog) {
  return JSON.stringify(
    {
      before: log.beforePayload ?? null,
      after: log.afterPayload ?? null,
    },
    null,
    2,
  );
}

function restoreStateLabel(log: OperationLog) {
  if (log.action !== "record_deleted") return "--";
  if (log.restoredAt) return `已恢复 ${formatDateTime(log.restoredAt)}`;
  return log.reversible ? "可恢复" : "不可恢复";
}

export function OperationLogPage({ onRestored }: OperationLogPageProps) {
  const logs = useOperationLogs(onRestored);

  return (
    <Card aria-label="操作记录" role="region">
      <CardHeader className="section-title-row">
        <div>
          <CardTitle>操作记录</CardTitle>
          <p className="section-subtitle">
            查询本地账本的创建、更新、删除和恢复历史
          </p>
        </div>
        <p
          className={cn(
            "status-text",
            logs.statusType === "error" && "status-error",
          )}
          role="status"
        >
          {logs.isLoading ? "加载中" : logs.status}
        </p>
      </CardHeader>
      <CardContent>
        <div className="operation-toolbar">
          <div className="field-stack operation-filter">
            <Label htmlFor="operation-filter">操作类型</Label>
            <Select
              value={logs.actionFilter}
              onValueChange={(value) =>
                logs.changeActionFilter(value as OperationLogFilter)
              }
            >
              <SelectTrigger id="operation-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => logs.loadLogs()}
            disabled={logs.isLoading}
          >
            刷新
          </Button>
        </div>

        <div className="table-scroll">
          <Table className="operation-table">
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>操作类型</TableHead>
                <TableHead>对象</TableHead>
                <TableHead>操作内容</TableHead>
                <TableHead>恢复状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.items.length === 0 ? (
                <TableRow>
                  <TableCell className="empty-cell" colSpan={6}>
                    暂无操作记录
                  </TableCell>
                </TableRow>
              ) : (
                logs.items.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                    <TableCell>{actionLabels[log.action]}</TableCell>
                    <TableCell>{log.entityLabel}</TableCell>
                    <TableCell className="operation-summary-cell">
                      <p className="operation-summary">{log.summary}</p>
                      <details className="operation-payload">
                        <summary>查看快照</summary>
                        <pre>{formatPayload(log)}</pre>
                      </details>
                    </TableCell>
                    <TableCell>{restoreStateLabel(log)}</TableCell>
                    <TableCell>
                      {log.action === "record_deleted" &&
                      log.reversible &&
                      !log.restoredAt ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => logs.restoreLog(log)}
                          disabled={logs.restoringLogId === log.id}
                        >
                          {logs.restoringLogId === log.id ? "恢复中" : "恢复"}
                        </Button>
                      ) : (
                        "--"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
