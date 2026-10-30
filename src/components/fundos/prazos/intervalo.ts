export interface IntervaloOption {
  value: string;
  label: string;
}

// The backend accepts any interval of 1 month or more, and the Agent proposes the cadence
// a document states (every 24 months, for instance), so the form cannot cap it at a year.
export const MAX_INTERVALO_MESES = 120;

export const INTERVALO_OPTIONS: IntervaloOption[] = [
  { value: "1", label: "Mensal" },
  { value: "2", label: "Bimestral (a cada 2 meses)" },
  { value: "3", label: "Trimestral (a cada 3 meses)" },
  { value: "6", label: "Semestral (a cada 6 meses)" },
  { value: "12", label: "Anual (a cada 12 meses)" },
  { value: "24", label: "A cada 2 anos (24 meses)" },
];

/** The standard options, plus the obligation's own interval when it is not one of them, so the
 * select shows what is stored instead of an empty field. */
export function intervaloOptions(current: number | null | undefined): IntervaloOption[] {
  if (!current || INTERVALO_OPTIONS.some((option) => option.value === String(current))) {
    return INTERVALO_OPTIONS;
  }
  return [...INTERVALO_OPTIONS, { value: String(current), label: `A cada ${current} meses` }].sort(
    (a, b) => Number(a.value) - Number(b.value),
  );
}
