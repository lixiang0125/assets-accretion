import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { SummaryItem } from "../../../types";
import { formatCurrency, formatPercent, toneClass } from "../../../lib/format";
import { cn } from "../../../lib/utils";
import { Button } from "../../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/Table";
import {
  nextSortState,
  sortSummaryItems,
  type AssetDetailSortKey,
  type AssetDetailSortState,
} from "./sort";

type AssetDetailTableProps = {
  items: SummaryItem[];
  status: string;
  statusType: "idle" | "error";
  onRequestDeleteRecord: (item: SummaryItem) => void;
  onEditRecord: (item: SummaryItem) => void;
  onRecordAssetType: (item: SummaryItem) => void;
  onOpenHistory: (item: SummaryItem) => void;
};

export function AssetDetailTable({
  items,
  status,
  statusType,
  onEditRecord,
  onOpenHistory,
  onRecordAssetType,
  onRequestDeleteRecord,
}: AssetDetailTableProps) {
  const [sortState, setSortState] = useState<AssetDetailSortState | null>(null);
  const sortedItems = useMemo(
    () => sortSummaryItems(items, sortState),
    [items, sortState]
  );

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
                <TableHead>资产类型</TableHead>
                <TableHead>月份</TableHead>
                <SortableTableHead
                  label="当月价值"
                  sortKey="value"
                  sortState={sortState}
                  onSort={setSortState}
                />
                <TableHead>对比时间点</TableHead>
                <SortableTableHead
                  label="增值金额"
                  sortKey="changeValue"
                  sortState={sortState}
                  onSort={setSortState}
                />
                <SortableTableHead
                  label="增值率"
                  sortKey="changeRate"
                  sortState={sortState}
                  onSort={setSortState}
                />
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.length === 0 ? (
                <TableRow>
                  <TableCell className="empty-cell" colSpan={7}>
                    还没有资产类型
                  </TableCell>
                </TableRow>
              ) : (
                sortedItems.map((item) => {
                  const changeTone = toneClass(item.changeValue);
                  return (
                    <TableRow key={`${item.assetTypeId}-${item.month}`}>
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
                      <TableCell>
                        {item.hasRecord ? (
                          formatCurrency(item.value)
                        ) : item.effectiveValue !== null ? (
                          <span className="carried-value">
                            <span>{formatCurrency(item.effectiveValue)}</span>
                            <span>沿用 {item.effectiveMonth}</span>
                          </span>
                        ) : (
                          <span className="pending-record-text">待记录</span>
                        )}
                      </TableCell>
                      <TableCell>{item.previousMonth || "--"}</TableCell>
                      <TableCell className={changeTone}>
                        {formatCurrency(item.changeValue)}
                      </TableCell>
                      <TableCell className={changeTone}>
                        {formatPercent(item.changeRate)}
                      </TableCell>
                      <TableCell>
                        <div className="row-actions">
                          {item.hasRecord ? (
                            <>
                              <Button type="button" size="sm" variant="outline" onClick={() => onEditRecord(item)}>
                                编辑
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => onRequestDeleteRecord(item)}
                              >
                                删除
                              </Button>
                            </>
                          ) : (
                            <Button type="button" size="sm" variant="outline" onClick={() => onRecordAssetType(item)}>
                              记录
                            </Button>
                          )}
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

function SortableTableHead({
  label,
  sortKey,
  sortState,
  onSort,
}: {
  label: string;
  sortKey: AssetDetailSortKey;
  sortState: AssetDetailSortState | null;
  onSort: Dispatch<SetStateAction<AssetDetailSortState | null>>;
}) {
  const isActive = sortState?.key === sortKey;
  const direction = isActive ? sortState.direction : null;
  const ariaSort =
    direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none";

  return (
    <TableHead aria-sort={ariaSort}>
      <button
        className="sortable-head-button"
        type="button"
        aria-label={`${label}排序`}
        onClick={() => onSort((current) => nextSortState(current, sortKey))}
      >
        <span>{label}</span>
        {isActive ? (
          direction === "desc" ? (
            <ArrowDown aria-hidden="true" />
          ) : (
            <ArrowUp aria-hidden="true" />
          )
        ) : (
          <ChevronsUpDown aria-hidden="true" />
        )}
      </button>
    </TableHead>
  );
}
