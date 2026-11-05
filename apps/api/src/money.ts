const MAX_SCALE = 36;

function powerOfTen(scale: number): bigint {
  if (!Number.isInteger(scale) || scale < 0 || scale > MAX_SCALE) {
    throw new RangeError("Decimal scale is outside the supported range.");
  }
  return 10n ** BigInt(scale);
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
  const product = parseDecimal(left, leftScale) * parseDecimal(right, rightScale);
  const productScale = leftScale + rightScale;

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

/** Format a stored amount for display while retaining meaningful extra precision. */
export function formatMoneyForDisplay(value: string, scale = 4): string {
  return formatDecimal(parseDecimal(value, scale), scale, 2);
}
