import type { SummaryItem } from "../../types";
import { formatCurrency } from "../../lib/format";

type HistoryChartProps = {
  items: SummaryItem[];
};

export function HistoryChart({ items }: HistoryChartProps) {
  const width = 560;
  const height = 240;
  const padding = 34;

  if (items.length === 0) {
    return <div className="empty-chart">暂无月度记录</div>;
  }

  const values = items.map((item) => item.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  const points = items.map((item, index) => {
    const x =
      items.length === 1
        ? width / 2
        : padding + (index * (width - padding * 2)) / (items.length - 1);
    const y = height - padding - ((item.value - minValue) / range) * (height - padding * 2);
    return { item, x, y };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <svg
      aria-label="资产月度价值趋势"
      className="history-chart"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <line className="chart-axis" x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} />
      <line className="chart-axis" x1={padding} y1={padding} x2={padding} y2={height - padding} />
      <polyline className="chart-line" points={polyline} />
      {points.map((point) => (
        <g key={point.item.id}>
          <circle className="chart-point" cx={point.x} cy={point.y} r="5" />
          <text className="chart-value-label" x={point.x} y={point.y - 12} textAnchor="middle">
            {formatCurrency(point.item.value)}
          </text>
          <text className="chart-month-label" x={point.x} y={height - 10} textAnchor="middle">
            {point.item.month}
          </text>
        </g>
      ))}
    </svg>
  );
}
