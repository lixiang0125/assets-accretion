import type { AssetType, SummaryItem } from "../../../types";
import {
  formatCurrency,
  formatDateTime,
  formatPercent,
  toneClass,
} from "../../../lib/format";
import { Card } from "../../ui/Card";
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
  history: SummaryItem[];
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
};

export function HistoryDrawer({ asset, history, isLoading, onOpenChange }: HistoryDrawerProps) {
  return (
    <Sheet open={asset !== null} onOpenChange={onOpenChange}>
      <SheetContent aria-label={asset ? `${asset.name} 月度变化` : undefined}>
        {asset ? (
          <>
            <SheetHeader>
              <SheetDescription>月度变化</SheetDescription>
              <SheetTitle>{asset.name}</SheetTitle>
              {asset.description ? (
                <p className="sheet-note">{asset.description}</p>
              ) : null}
            </SheetHeader>

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
