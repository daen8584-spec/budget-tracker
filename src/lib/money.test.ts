import { describe, expect, it } from "vitest";
import { centsToDecimal, formatMoney, parseAmount } from "./money";

describe("parseAmount", () => {
  it.each([
    ["12", 1200],
    ["12.5", 1250],
    ["12,5", 1250],
    ["12.50", 1250],
    ["12,50", 1250],
    ["0.05", 5],
    ["1,234.56", 123456],
    ["1.234,56", 123456],
    ["1 234,56", 123456],
    ["1'234.56", 123456],
    ["12.500", 1250000],
    ["12,500", 1250000],
    ["1,000,000", 100000000],
    ["1.000.000,99", 100000099],
    ["$ 40", 4000],
    ["40 €", 4000],
  ])("reads %s as %i cents", (input, cents) => {
    expect(parseAmount(input)).toBe(cents);
  });

  it.each(["", "abc", "-5", "12.345.6", "12.", "1.2.3", "12.555,5,5", "1,2345", "12.999.99", "1e5", "1000000000000"])(
    "rejects %j",
    (input) => {
      expect(parseAmount(input)).toBeNull();
    },
  );
});

describe("centsToDecimal", () => {
  it("writes two decimals without separators", () => {
    expect(centsToDecimal(123456)).toBe("1234.56");
    expect(centsToDecimal(5)).toBe("0.05");
    expect(centsToDecimal(-250)).toBe("-2.50");
  });

  it("round-trips through parseAmount", () => {
    for (const cents of [0, 1, 99, 100, 123456, 99999999]) {
      expect(parseAmount(centsToDecimal(cents))).toBe(cents);
    }
  });
});

describe("formatMoney", () => {
  it("formats with the currency and locale", () => {
    expect(formatMoney(123456, "USD", "en-US")).toBe("$1,234.56");
    expect(formatMoney(123456, "EUR", "es-ES")).toBe("1234,56 €");
  });
});
