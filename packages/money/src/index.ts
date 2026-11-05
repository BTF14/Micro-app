const MAX_SCALE = 36;
const MAX_NUMERIC_PRECISION = 38;

function powerOfTen(scale: number): bigint {
  if (!Number.isInteger(scale) || scale < 0 || scale > MAX_SCALE) {
    throw new RangeError("Decimal scale is outside the supported range.");
  }
  return 10n ** BigInt(scale);
}

function assertNumericPrecision(value: bigint, precision: number): void {
  if (!Number.isInteger(precision) || precision < 1 || precision > MAX_NUMERIC_PRECISION) {
    throw new RangeError("Numeric precision is outside the supported range.");
  }
  const magnitude = value < 0n ? -value : value;
  if (magnitude >= 10n ** BigInt(precision)) {
    throw new RangeError("Numeric value exceeds the supported precision.");
  }
}

/**
 * Parse a plain base-10 decimal string into an integer scaled by 10^scale.
 * Exponents, whitespace, leading plus signs and excess fractional digits are rejected.
 */
export function parseDecimal(value: string, scale: number, maxIntegerDigits = 14): bigint {
  powerOfTen(scale);
  if (typeof value !== "string") throw new TypeError("Value must be a decimal string.");
  if (!Number.isInteger(maxIntegerDigits) || maxIntegerDigits < 1 || maxIntegerDigits > 38) {
    throw new RangeError("Maximum integer digits is invalid.");
  }

  const match = /^(-?)(0|[1-9][0-9]*)(?:\.([0-9]+))?$/.exec(value);
  if (!match) throw new TypeError("Value must be a plain decimal string.");

  const [, sign, integerPart, fractionPart = ""] = match;
  if (integerPart.length > maxIntegerDigits || fractionPart.length > scale) {
    throw new RangeError("Decimal precision exceeds the supported scale.");
  }

  const factor = powerOfTen(scale);
  const fraction = fractionPart.padEnd(scale, "0");
  const magnitude = BigInt(integerPart) * factor + BigInt(fraction || "0");
  return sign === "-" ? -magnitude : magnitude;
}

/**
 * Parse and validate a PostgreSQL NUMERIC(precision, scale) value.
 * The scaled integer must fit in exactly precision total decimal digits.
 */
export function parseNumeric(value: string, precision: number, scale: number): bigint {
  if (
    !Number.isInteger(precision) ||
    precision < 1 ||
    precision > MAX_NUMERIC_PRECISION ||
    !Number.isInteger(scale) ||
    scale < 0 ||
    scale > precision
  ) {
    throw new RangeError("Numeric precision or scale is invalid.");
  }

  const scaled = parseDecimal(value, scale, Math.max(1, precision - scale));
  assertNumericPrecision(scaled, precision);
  return scaled;
}

/** Format a scaled integer after enforcing PostgreSQL NUMERIC(precision, scale) bounds. */
export function formatNumeric(value: bigint, precision: number, scale: number): string {
  if (
    !Number.isInteger(precision) ||
    precision < 1 ||
    precision > MAX_NUMERIC_PRECISION ||
    !Number.isInteger(scale) ||
    scale < 0 ||
    scale > precision
  ) {
    throw new RangeError("Numeric precision or scale is invalid.");
  }
  powerOfTen(scale);
  assertNumericPrecision(value, precision);
  return formatDecimal(value, scale, scale);
}

/**
 * Format a scaled integer without floating-point conversion.
 * Trailing zeroes are removed, but at least minFractionDigits are retained.
 */
export function formatDecimal(value: bigint, scale: number, minFractionDigits = scale): string {
  const factor = powerOfTen(scale);
  if (!Number.isInteger(minFractionDigits) || minFractionDigits < 0 || minFractionDigits > scale) {
    throw new RangeError("Minimum fraction digits are invalid.");
  }

  const negative = value < 0n;
  const magnitude = negative ? -value : value;
  const integerPart = (magnitude / factor).toString();
  if (scale === 0) return (negative ? "-" : "") + integerPart;

  let fractionPart = (magnitude % factor).toString().padStart(scale, "0");
  while (fractionPart.length > minFractionDigits && fractionPart.endsWith("0")) {
    fractionPart = fractionPart.slice(0, -1);
  }
  return (negative ? "-" : "") + integerPart + (fractionPart ? "." + fractionPart : "");
}

/** Round an integer ratio to the nearest integer, with ties away from zero. */
function divideRoundHalfAwayFromZero(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new RangeError("Denominator must be positive.");
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if ((remainder < 0n ? -remainder : remainder) * 2n < denominator) return quotient;
  return quotient + (numerator < 0n ? -1n : 1n);
}

/**
 * Multiply two decimal strings and round once to resultScale.
 * This is used for quantity × unit price and USD × BCV rate calculations.
 */
export function multiplyDecimals(
  left: string,
  leftScale: number,
  right: string,
  rightScale: number,
  resultScale: number,
): string {
  powerOfTen(leftScale);
  powerOfTen(rightScale);
  powerOfTen(resultScale);
  const productScale = leftScale + rightScale;
  if (productScale > MAX_SCALE) {
    throw new RangeError("Combined decimal scale is outside the supported range.");
  }

  const product = parseDecimal(left, leftScale) * parseDecimal(right, rightScale);
  const rounded = resultScale >= productScale
    ? product * powerOfTen(resultScale - productScale)
    : divideRoundHalfAwayFromZero(product, powerOfTen(productScale - resultScale));

  return formatDecimal(rounded, resultScale, resultScale);
}

/** Add decimal strings at one common scale without precision loss. */
export function sumDecimals(values: readonly string[], scale: number): string {
  const total = values.reduce((sum, value) => sum + parseDecimal(value, scale), 0n);
  return formatDecimal(total, scale, scale);
}

/** Add values while enforcing the precision of their PostgreSQL NUMERIC column. */
export function sumNumeric(values: readonly string[], precision: number, scale: number): string {
  const total = values.reduce((sum, value) => sum + parseNumeric(value, precision, scale), 0n);
  return formatNumeric(total, precision, scale);
}

/** Calculate a line amount using quantity NUMERIC(14,3) × USD price NUMERIC(14,4). */
export function calculateLineUsd(quantity: string, unitPriceUsd: string): string {
  parseNumeric(quantity, 14, 3);
  parseNumeric(unitPriceUsd, 14, 4);
  const result = multiplyDecimals(quantity, 3, unitPriceUsd, 4, 4);
  parseNumeric(result, 14, 4);
  return result;
}

/** Convert USD NUMERIC(14,4) with BCV NUMERIC(18,8) to VES NUMERIC(16,2). */
export function convertUsdToVes(amountUsd: string, bcvRate: string): string {
  parseNumeric(amountUsd, 14, 4);
  parseNumeric(bcvRate, 18, 8);
  const result = multiplyDecimals(amountUsd, 4, bcvRate, 8, 2);
  parseNumeric(result, 16, 2);
  return result;
}

/** Format a stored amount for display while retaining meaningful extra precision. */
export function formatMoneyForDisplay(value: string, scale = 4): string {
  return formatDecimal(parseDecimal(value, scale), scale, 2);
}
