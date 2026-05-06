import type { PortfolioSummary } from "../../types";
import { formatCurrency, formatPercent, toneClass } from "../../lib/format";
import { MetricCard } from "./MetricCard";

type MetricsGridProps = {
  summary: PortfolioSummary | null;
};

export function MetricsGrid({ summary }: MetricsGridProps) {
  const totalValue = summary?.totalValue ?? 0;
  const totalPreviousValue = summary?.totalPreviousValue ?? 0;
  const totalChangeValue = summary?.totalChangeValue ?? 0;
  const totalChangeRate = summary?.totalChangeRate ?? null;

  return (
    <section aria-label="资产汇总" className="metrics-grid">
      <MetricCard label="当月总资产" value={formatCurrency(totalValue)} />
      <MetricCard label="前期对比值" value={formatCurrency(totalPreviousValue)} />
      <MetricCard
        label="增值金额"
        value={formatCurrency(totalChangeValue)}
        tone={toneClass(totalChangeValue)}
      />
      <MetricCard
        label="增值率"
        value={formatPercent(totalChangeRate)}
        tone={toneClass(totalChangeRate)}
      />
    </section>
  );
}
