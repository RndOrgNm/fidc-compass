/**
 * Initials from the first two whitespace-separated name parts
 * (e.g. "Joao Vitor Resende" → JV, "Luiz Augusto" → LA).
 * Single token → first two letters; email used as last resort.
 */
export function initialsFromTwoGivenNames(
  fullName: string | null | undefined,
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string | null | undefined,
): string {
  const combined =
    fullName?.trim() ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    "";

  if (combined) {
    const parts = combined.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0][0] ?? "";
      const b = parts[1][0] ?? "";
      return (a + b).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (parts.length === 1) {
      const c = parts[0][0] ?? "?";
      return (c + c).toUpperCase();
    }
  }

  if (email) {
    const local = email.split("@")[0] ?? "";
    const cleaned = local.replace(/[^a-zA-Z0-9]/g, "");
    if (cleaned.length >= 2) return cleaned.slice(0, 2).toUpperCase();
    if (cleaned.length === 1) return (cleaned + cleaned).toUpperCase();
  }

  return "??";
}
