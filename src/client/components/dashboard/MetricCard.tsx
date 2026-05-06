import { Card, CardContent } from "../ui/card";
import { cn } from "../../lib/utils";

type MetricCardProps = {
  label: string;
  value: string;
  tone?: string;
};

export function MetricCard({ label, value, tone }: MetricCardProps) {
  return (
    <Card className="metric-card">
      <CardContent className="metric-card-content">
        <span className="metric-label">{label}</span>
        <strong className={cn("metric-value", tone)}>{value}</strong>
      </CardContent>
    </Card>
  );
}
