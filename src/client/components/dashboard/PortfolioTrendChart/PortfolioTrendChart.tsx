import type { AssetGroup, PortfolioTrendPoint } from "../../../types";
import { formatCurrency } from "../../../lib/format";
import {
  allTrendGroupsValue,
  trendFilterForGroup,
  trendFilterLabel,
  ungroupedTrendGroupsValue,
  type TrendGroupFilterValue,
} from "../../../lib/trend-filter";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/Card";
import { Label } from "../../ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/Select";

type PortfolioTrendChartProps = {
  assetGroups: AssetGroup[];
  groupFilter: TrendGroupFilterValue;
  items: PortfolioTrendPoint[];
  selectedMonth: string;
  onGroupFilterChange: (value: TrendGroupFilterValue) => void;
};

type ChartPoint = {
  item: PortfolioTrendPoint;
  x: number;
  y: number;
};

function tickIndexes(length: number, selectedIndex: number) {
  if (length <= 6) {
    return Array.from({ length }, (_, index) => index);
  }

  const step = Math.ceil(length / 6);
  const indexes = new Set([0, length - 1]);
  if (selectedIndex >= 0) indexes.add(selectedIndex);
  for (let index = 0; index < length; index += step) {
    indexes.add(index);
  }
  return [...indexes].sort((left, right) => left - right);
}

export function PortfolioTrendChart({
  assetGroups,
  groupFilter,
  items,
  onGroupFilterChange,
  selectedMonth,
}: PortfolioTrendChartProps) {
  const width = 760;
  const height = 182;
  const padding = { top: 24, right: 38, bottom: 34, left: 72 };
  const sortedItems = [...items].sort((left, right) =>
    left.month.localeCompare(right.month),
  );
  const selectedIndex = sortedItems.findIndex(
    (item) => item.month === selectedMonth,
  );
  const groupLabel = trendFilterLabel(groupFilter, assetGroups);
  const title =
    groupFilter === allTrendGroupsValue ? "总资产趋势" : `${groupLabel}趋势`;
  const currentPrefix =
    groupFilter === allTrendGroupsValue ? "" : `${groupLabel} `;
  const controls = (
    <div className="portfolio-trend-filter">
      <Label htmlFor="portfolio-trend-group">趋势分组</Label>
      <Select
        value={groupFilter}
        onValueChange={(value) =>
          onGroupFilterChange(value as TrendGroupFilterValue)
        }
      >
        <SelectTrigger id="portfolio-trend-group" aria-label="趋势分组">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={allTrendGroupsValue}>全部分组</SelectItem>
          {assetGroups.map((group) => (
            <SelectItem key={group.id} value={trendFilterForGroup(group.id)}>
              {group.name}
            </SelectItem>
          ))}
          <SelectItem value={ungroupedTrendGroupsValue}>未分组</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  if (sortedItems.length === 0) {
    return (
      <Card
        className="portfolio-trend-card"
        aria-label={title}
        role="region"
      >
        <CardHeader className="portfolio-trend-header">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="portfolio-trend-subtitle">{groupLabel} · 月维度汇总</p>
          </div>
          {controls}
        </CardHeader>
        <CardContent>
          <div className="portfolio-trend-empty">暂无月度记录</div>
        </CardContent>
      </Card>
    );
  }

  const values = sortedItems.map((item) => item.totalValue);
  const minValue = 0;
  const maxValue = Math.max(...values, 0);
  const range = maxValue - minValue || 1;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const baselineY = height - padding.bottom;
  const points: ChartPoint[] = sortedItems.map((item, index) => {
    const x =
      sortedItems.length === 1
        ? padding.left + innerWidth / 2
        : padding.left + (index * innerWidth) / (sortedItems.length - 1);
    const y = baselineY - ((item.totalValue - minValue) / range) * innerHeight;
    return { item, x, y };
  });
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints = `${padding.left},${baselineY} ${linePoints} ${width - padding.right},${baselineY}`;
  const ticks = tickIndexes(sortedItems.length, selectedIndex);
  const selectedPoint = selectedIndex >= 0 ? points[selectedIndex] : null;
  const firstPoint = points[0]!;
  const latestPoint = points[points.length - 1]!;
  const valueLabels = [
    firstPoint,
    selectedPoint,
    latestPoint,
  ].filter(
    (point, index, list): point is ChartPoint =>
      Boolean(point) &&
      list.findIndex(
        (candidate) => candidate?.item.month === point?.item.month,
      ) === index,
  );

  return (
    <Card
      className="portfolio-trend-card"
      aria-label={title}
      role="region"
    >
      <CardHeader className="portfolio-trend-header">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="portfolio-trend-subtitle">{groupLabel} · 月维度汇总</p>
        </div>
        <div className="portfolio-trend-header-side">
          <p className="portfolio-trend-current">
            {selectedPoint
              ? `${currentPrefix}${selectedPoint.item.month} ${formatCurrency(selectedPoint.item.totalValue)}`
              : `${currentPrefix}最新 ${formatCurrency(latestPoint.item.totalValue)}`}
          </p>
          {controls}
        </div>
      </CardHeader>
      <CardContent>
        <svg
          aria-label={`${title}按月份变化折线图`}
          className="portfolio-trend-chart"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <line
            className="portfolio-trend-axis"
            x1={padding.left}
            y1={baselineY}
            x2={width - padding.right}
            y2={baselineY}
          />
          <line
            className="portfolio-trend-axis"
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={baselineY}
          />
          {[0, 0.5, 1].map((ratio) => {
            const y = baselineY - ratio * innerHeight;
            const value = minValue + ratio * range;
            return (
              <g key={ratio}>
                <line
                  className="portfolio-trend-grid-line"
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                />
                <text
                  className="portfolio-trend-y-label"
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                >
                  {formatCurrency(value)}
                </text>
              </g>
            );
          })}
          <polygon className="portfolio-trend-area" points={areaPoints} />
          <polyline className="portfolio-trend-line" points={linePoints} />
          {points.map((point) => {
            const isSelected = point.item.month === selectedMonth;
            return (
              <circle
                key={point.item.month}
                className={
                  isSelected
                    ? "portfolio-trend-point is-selected"
                    : "portfolio-trend-point"
                }
                cx={point.x}
                cy={point.y}
                r={isSelected ? 3 : 2}
              />
            );
          })}
          {valueLabels.map((point) => (
            <text
              key={`value-${point.item.month}`}
              className="portfolio-trend-value-label"
              x={point.x}
              y={Math.max(16, point.y - 12)}
              textAnchor="middle"
            >
              {formatCurrency(point.item.totalValue)}
            </text>
          ))}
          {ticks.map((index) => {
            const point = points[index];
            return (
              <text
                key={`month-${point.item.month}`}
                className="portfolio-trend-month-label"
                x={point.x}
                y={height - 14}
                textAnchor="middle"
              >
                {point.item.month}
              </text>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}
