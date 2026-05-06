import type { PortfolioSummary } from "../../../types";
import { formatCurrency, formatPercent, toneClass } from "../../../lib/format";
import { MetricCard } from "../MetricCard";

type MetricsGridProps = {
  compareMonth: string;
  summary: PortfolioSummary | null;
};

export function MetricsGrid({ compareMonth, summary }: MetricsGridProps) {
  const totalValue = summary?.totalValue ?? 0;
  const totalPreviousValue = summary?.totalPreviousValue ?? 0;
  const totalChangeValue = summary?.totalChangeValue ?? 0;
  const totalChangeRate = summary?.totalChangeRate ?? null;
  const comparisonMonth = summary?.compareMonth ?? compareMonth;

  return (
    <section aria-label="资产汇总" className="metrics-grid">
      <MetricCard label="当月总资产" value={formatCurrency(totalValue)} />
      <MetricCard
        description={comparisonMonth ? `对比 ${comparisonMonth}` : undefined}
        label="对比值"
        value={formatCurrency(totalPreviousValue)}
      />
      <MetricCard
        description={comparisonMonth ? `对比 ${comparisonMonth}` : undefined}
        label="增值金额"
        value={formatCurrency(totalChangeValue)}
        tone={toneClass(totalChangeValue)}
      />
      <MetricCard
        description={comparisonMonth ? `对比 ${comparisonMonth}` : undefined}
        label="增值率"
        value={formatPercent(totalChangeRate)}
        tone={toneClass(totalChangeRate)}
      />
    </section>
  );
}
