/** pt-BR currency and percent helpers for dashboard figures. */

export function formatBrl(value: number | null | undefined, fractionDigits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/**
 * Formats a ratio as percent points (e.g. 1.23 → "+1,23%").
 * Pass raw ratio * 100 from (a - b) / b * 100.
 */
export function formatPercentPoints(value: number | null | undefined, fractionDigits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  const abs = Math.abs(value).toFixed(fractionDigits).replace(".", ",");
  if (value > 0) return `+${abs}%`;
  if (value < 0) return `-${abs}%`;
  return `${abs}%`;
}
