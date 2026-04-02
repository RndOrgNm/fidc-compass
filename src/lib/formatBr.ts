/** pt-BR-style numbers for dashboards: thousands `.`, decimals `,` (e.g. 10903.64 → 10.903,64). */

const br = "pt-BR" as const;

/** Cota (valor de quota) — número sem símbolo, alinhado ao notebook (4 casas). */
export function formatCota(value: number | null | undefined, fractionDigits = 4): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(br, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Valor da cota em reais (R$), para UI. */
export function formatCotaBrl(value: number | null | undefined, fractionDigits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(br, {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatBrl(value: number | null | undefined, fractionDigits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(br, {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/**
 * Abbreviated BRL for large amounts on dashboards: `R$ 842M`, `R$ 147,86M`, `R$ 1,23B`.
 * Values in millions/billions round to **two** decimal places in the scaled unit (e.g. 147,858M → 147,86M).
 * Whole millions/billions omit decimals (`R$ 100M`). Values below 1 million use full {@link formatBrl}.
 */
export function formatBrlCompact(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";

  const negative = value < 0;
  const v = Math.abs(value);

  const formatScaled = (n: number, divisor: number, suffix: string): string => {
    const scaled = n / divisor;
    const rounded = Math.round(scaled * 100) / 100;
    const isWhole = Math.abs(rounded - Math.round(rounded)) < 1e-9;
    const numPart = new Intl.NumberFormat(br, {
      minimumFractionDigits: isWhole ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(rounded);
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
 * True when the value rounds to zero at the given decimals (avoids -0,00% / red styling from float noise).
 */
export function isNeutralPercent(value: number | null | undefined, fractionDigits = 2): boolean {
  if (value == null || Number.isNaN(value)) return false;
  return Math.abs(Number(value.toFixed(fractionDigits))) === 0;
}

/**
 * Formats a ratio as percent points (e.g. 1.23 → "+1,23%").
 * Pass raw ratio * 100 from (a - b) / b * 100.
 * Values that round to 0 at `fractionDigits` show as "0,00%" with no sign.
 */
export function formatPercentPoints(value: number | null | undefined, fractionDigits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (isNeutralPercent(value, fractionDigits)) {
    return `${new Intl.NumberFormat(br, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(0)}%`;
  }
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat(br, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(abs);
  if (value > 0) return `+${formatted}%`;
  if (value < 0) return `-${formatted}%`;
  return `${formatted}%`;
}
