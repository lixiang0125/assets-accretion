const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 2,
});

const compactCurrencyUnits = [
  { suffix: "B", value: 1_000_000_000 },
  { suffix: "M", value: 1_000_000 },
  { suffix: "K", value: 1_000 },
] as const;

const percentFormatter = new Intl.NumberFormat("zh-CN", {
  style: "percent",
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  const absoluteValue = Math.abs(value);
  if (absoluteValue <= 1000) return currencyFormatter.format(value);

  const unit = compactCurrencyUnits.find((item) => absoluteValue >= item.value);
  if (!unit) return currencyFormatter.format(value);

  return `${value < 0 ? "-" : ""}¥${(absoluteValue / unit.value).toFixed(2)}${unit.suffix}`;
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
