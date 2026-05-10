import type { AssetGroupSummary } from "../../../types";
import { formatCurrency, formatPercent, toneClass } from "../../../lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/Table";

type GroupSummaryTableProps = {
  groups: AssetGroupSummary[];
};

export function GroupSummaryTable({ groups }: GroupSummaryTableProps) {
  return (
    <Card aria-label="分组统计" role="region">
      <CardHeader className="section-title-row">
        <CardTitle>分组统计</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="table-scroll">
          <Table className="group-summary-table">
            <TableHeader>
              <TableRow>
                <TableHead>分组</TableHead>
                <TableHead>资产类型</TableHead>
                <TableHead>已记录</TableHead>
                <TableHead>当前统计值</TableHead>
                <TableHead>对比值</TableHead>
                <TableHead>增值金额</TableHead>
                <TableHead>增值率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.length === 0 ? (
                <TableRow>
                  <TableCell className="empty-cell" colSpan={7}>
                    暂无分组统计
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((group) => {
                  const changeTone = toneClass(group.totalChangeValue);
                  const groupName = group.groupName ?? "未分组";
                  return (
                    <TableRow
                      key={
                        group.groupId === null
                          ? "__ungrouped__"
                          : group.groupId.toString()
                      }
                    >
                      <TableCell>
                        <span className="asset-group-pill">{groupName}</span>
                      </TableCell>
                      <TableCell>{group.assetTypeCount}</TableCell>
                      <TableCell>{group.recordedAssetTypeCount}</TableCell>
                      <TableCell>{formatCurrency(group.totalValue)}</TableCell>
                      <TableCell>
                        {formatCurrency(group.totalPreviousValue)}
                      </TableCell>
                      <TableCell className={changeTone}>
                        {formatCurrency(group.totalChangeValue)}
                      </TableCell>
                      <TableCell className={changeTone}>
                        {formatPercent(group.totalChangeRate)}
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
