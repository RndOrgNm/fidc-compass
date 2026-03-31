/** pt-BR currency and percent helpers for dashboard figures. */

/** Cota (valor de quota) — alinhado ao notebook (4 casas). */
export function formatCota(value: number | null | undefined, fractionDigits = 4): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

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
 * Abbreviated BRL for large amounts on dashboards: `R$ 842M` or `R$ 842,5M`, `R$ 1,2B`.
 * Uses one decimal when the value in millions/billions is not a whole number after rounding to 1 decimal place.
 * Values below 1 million use full {@link formatBrl}.
 */
export function formatBrlCompact(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";

  const negative = value < 0;
  const v = Math.abs(value);

  const formatScaled = (n: number, divisor: number, suffix: string): string => {
    const scaled = n / divisor;
    const rounded = Math.round(scaled * 10) / 10;
    const isWhole = Math.abs(rounded - Math.round(rounded)) < 1e-9;
    const numPart = isWhole
      ? String(Math.round(rounded))
      : rounded.toFixed(1).replace(".", ",");
    const body = `R$ ${numPart}${suffix}`;
    return negative ? `-${body}` : body;
  };

  if (v >= 1_000_000_000) {
    return formatScaled(v, 1_000_000_000, "B");
  }
  if (v >= 1_000_000) {
    return formatScaled(v, 1_000_000, "M");
  }

  return formatBrl(value);
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
