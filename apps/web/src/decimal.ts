import { formatDecimal, parseNumeric } from "@micro-app/money";

/** Normalize the decimal separator while preserving incomplete user input. */
export function normalizeDecimalInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  // Mixed or repeated separators are ambiguous. Preserve them for strict rejection.
  const commaCount = (trimmed.match(/,/g) ?? []).length;
  const dotCount = (trimmed.match(/\./g) ?? []).length;
  if (commaCount > 1 || dotCount > 1 || (commaCount > 0 && dotCount > 0)) return trimmed;

  const normalized = commaCount === 1 ? trimmed.replace(",", ".") : trimmed;
  return normalized.replace(/^(-?)\./, "$10.");
}

/** Format PostgreSQL NUMERIC values for es-VE without binary floating-point conversion. */
export function formatLocalizedDecimal(value: string, precision: number, scale: number, minFractionDigits = scale): string {
  const scaled = parseNumeric(value, precision, scale);
  const parts = formatDecimal(scaled, scale, minFractionDigits).split(".");
  const integer = (parts[0] || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return parts[1] ? integer + "," + parts[1] : integer;
}
