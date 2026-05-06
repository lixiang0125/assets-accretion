import { expect, test } from "bun:test";
import { formatCurrency } from "../../src/client/lib/format";

test("formats small currency values without compacting", () => {
  expect(formatCurrency(0)).toBe("¥0.00");
  expect(formatCurrency(999.99)).toBe("¥999.99");
  expect(formatCurrency(1000)).toBe("¥1,000.00");
  expect(formatCurrency(null)).toBe("--");
});

test("compacts large currency values with KMB suffixes", () => {
  expect(formatCurrency(1000.01)).toBe("¥1.00K");
  expect(formatCurrency(12500)).toBe("¥12.50K");
  expect(formatCurrency(1_250_000)).toBe("¥1.25M");
  expect(formatCurrency(1_250_000_000)).toBe("¥1.25B");
  expect(formatCurrency(-2500)).toBe("-¥2.50K");
});
