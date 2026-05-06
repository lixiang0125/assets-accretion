import { Card, CardContent } from "../../ui/Card";
import { cn } from "../../../lib/utils";

type MetricCardProps = {
  description?: string;
  label: string;
  value: string;
  tone?: string;
};

export function MetricCard({ description, label, value, tone }: MetricCardProps) {
  return (
    <Card className="metric-card">
      <CardContent className="metric-card-content">
        <span className="metric-label">{label}</span>
        {description ? <span className="metric-description">{description}</span> : null}
        <strong className={cn("metric-value", tone)}>{value}</strong>
      </CardContent>
    </Card>
  );
}
