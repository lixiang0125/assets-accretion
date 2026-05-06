const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("zh-CN", {
  style: "percent",
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | null | undefined) {
  return value === null || value === undefined ? "--" : currencyFormatter.format(value);
}

export function formatPercent(value: number | null | undefined) {
  return value === null || value === undefined ? "--" : percentFormatter.format(value);
}

export function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "--";
  return value.replace("T", " ").slice(0, 19);
}

export function toneClass(value: number | null | undefined) {
  if (value === null || value === undefined || value === 0) return "";
  return value > 0 ? "value-positive" : "value-negative";
}
