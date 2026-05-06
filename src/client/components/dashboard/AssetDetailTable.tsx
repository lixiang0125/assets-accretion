import type { SummaryItem } from "../../types";
import { formatCurrency, formatPercent, toneClass } from "../../lib/format";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

type AssetDetailTableProps = {
  items: SummaryItem[];
  status: string;
  statusType: "idle" | "error";
  onDeleteRecord: (item: SummaryItem) => void;
  onEditRecord: (item: SummaryItem) => void;
  onOpenHistory: (item: SummaryItem) => void;
};

const headings = ["资产类型", "月份", "当月价值", "对比月份", "增值金额", "增值率", "操作"];

export function AssetDetailTable({
  items,
  status,
  statusType,
  onDeleteRecord,
  onEditRecord,
  onOpenHistory,
}: AssetDetailTableProps) {
  return (
    <Card aria-label="资产明细" role="region">
      <CardHeader className="section-title-row">
        <CardTitle>月度明细</CardTitle>
        <p className={cn("status-text", statusType === "error" && "status-error")} role="status">
          {status}
        </p>
      </CardHeader>
      <CardContent>
        <div className="table-scroll">
          <Table className="detail-table">
            <TableHeader>
              <TableRow>
                {headings.map((heading) => (
                  <TableHead key={heading}>{heading}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell className="empty-cell" colSpan={7}>
                    当前月份还没有记录
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const changeTone = toneClass(item.changeValue);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Button
                          className="asset-link-button"
                          type="button"
                          variant="ghost"
                          onClick={() => onOpenHistory(item)}
                        >
                          {item.assetTypeName}
                        </Button>
                      </TableCell>
                      <TableCell>{item.month}</TableCell>
                      <TableCell>{formatCurrency(item.value)}</TableCell>
                      <TableCell>{item.previousMonth || "--"}</TableCell>
                      <TableCell className={changeTone}>
                        {formatCurrency(item.changeValue)}
                      </TableCell>
                      <TableCell className={changeTone}>
                        {formatPercent(item.changeRate)}
                      </TableCell>
                      <TableCell>
                        <div className="row-actions">
                          <Button type="button" size="sm" variant="outline" onClick={() => onEditRecord(item)}>
                            编辑
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => onDeleteRecord(item)}
                          >
                            删除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
