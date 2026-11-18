import { formatDecimal, parseNumeric } from "@micro-app/money";

/** Normalize the decimal separator while preserving incomplete user input. */
export function normalizeDecimalInput(value: string): string {
  return value.replace(",", ".");
}

/** Format PostgreSQL NUMERIC values for es-VE without binary floating-point conversion. */
export function formatLocalizedDecimal(value: string, precision: number, scale: number, minFractionDigits = scale): string {
  const scaled = parseNumeric(value, precision, scale);
  const parts = formatDecimal(scaled, scale, minFractionDigits).split(".");
  const integer = (parts[0] || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return parts[1] ? integer + "," + parts[1] : integer;
}
