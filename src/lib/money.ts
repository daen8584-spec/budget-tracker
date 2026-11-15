/**
 * Amounts are stored as whole cents. These helpers convert between what people type and
 * cents, and format cents for display.
 */

const MAX_CENTS = 1_000_000_000_00; // one billion in any currency is plenty for a budget

/**
 * Parses an amount as people type it, in either common notation: "1,234.56" or
 * "1.234,56". Rules:
 *
 * - With both "." and ",", the one that comes last is the decimal separator.
 * - With only one kind, it is a decimal separator when followed by one or two digits
 *   at the end ("12.5", "12,50"), and a thousands separator otherwise ("12.500",
 *   "1,000,000").
 * - Spaces, apostrophes and currency symbols are ignored.
 *
 * Returns null for anything else, including negative amounts and more than two decimals.
 */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[\s' $€£¥₹]/g, "");
  if (!/^\d[\d.,]*$/.test(cleaned)) return null;

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  let decimalIndex = -1;
  if (lastDot >= 0 && lastComma >= 0) {
    decimalIndex = Math.max(lastDot, lastComma);
  } else {
    const separator = lastDot >= 0 ? "." : lastComma >= 0 ? "," : null;
    if (separator) {
      const occurrences = cleaned.split(separator).length - 1;
      const digitsAfter = cleaned.length - cleaned.lastIndexOf(separator) - 1;
      if (occurrences === 1 && digitsAfter >= 1 && digitsAfter <= 2) decimalIndex = cleaned.lastIndexOf(separator);
    }
  }

  const integerPart = decimalIndex >= 0 ? cleaned.slice(0, decimalIndex) : cleaned;
  const fractionPart = decimalIndex >= 0 ? cleaned.slice(decimalIndex + 1) : "";
  if (!/^\d{1,3}([.,]\d{3})*$|^\d+$/.test(integerPart)) return null;
  if (fractionPart !== "" && !/^\d{1,2}$/.test(fractionPart)) return null;

  const whole = Number(integerPart.replace(/[.,]/g, ""));
  const cents = whole * 100 + Number(fractionPart.padEnd(2, "0") || 0);
  if (!Number.isSafeInteger(cents) || cents > MAX_CENTS) return null;
  return cents;
}

/** Cents as a plain decimal string, as used in CSV files: 123456 -> "1234.56". */
export function centsToDecimal(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}${Math.trunc(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

const formatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(cents: number, currency: string, locale?: string): string {
  const key = `${locale ?? ""}|${currency}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: "currency", currency });
    formatters.set(key, formatter);
  }
  return formatter.format(cents / 100);
}
