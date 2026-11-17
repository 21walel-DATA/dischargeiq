// D-030: free text containing a valid NHS number outside the 999 test range is refused.
import { describe, expect, it } from "vitest";
import { containsRealNhsNumber, isTestNhsNumber, isValidNhsNumber } from "@dischargeiq/shared";

// Builds a number that passes Modulus 11 from any 9-digit start, so the tests don't hard-code anyone's number.
function withCheckDigit(nineDigits: string): string {
  let total = 0;
  for (let i = 0; i < 9; i++) {
    total += Number(nineDigits[i]) * (10 - i);
  }
  const check = (11 - (total % 11)) % 11;
  if (check === 10) {
    throw new Error("No valid check digit for this start; pick another");
  }
  return nineDigits + String(check);
}

const realLooking = withCheckDigit("401023456"); // valid, NOT in the test range
const testNumber = "9990000018"; // valid, in the 999 test range

describe("isValidNhsNumber (Modulus 11)", () => {
  it("accepts numbers with the right check digit", () => {
    expect(isValidNhsNumber(realLooking)).toBe(true);
    expect(isValidNhsNumber(testNumber)).toBe(true);
  });

  it("rejects a wrong check digit, wrong length or letters", () => {
    const wrongCheck = realLooking.slice(0, 9) + String((Number(realLooking[9]) + 1) % 10);
    expect(isValidNhsNumber(wrongCheck)).toBe(false);
    expect(isValidNhsNumber("12345")).toBe(false);
    expect(isValidNhsNumber("99900000I8")).toBe(false);
  });

  it("knows the 999 test range", () => {
    expect(isTestNhsNumber(testNumber)).toBe(true);
    expect(isTestNhsNumber(realLooking)).toBe(false);
  });
});

describe("containsRealNhsNumber", () => {
  it("finds a real-looking number written plainly, with spaces or with dashes", () => {
    const spaced = `${realLooking.slice(0, 3)} ${realLooking.slice(3, 6)} ${realLooking.slice(6)}`;
    const dashed = spaced.replaceAll(" ", "-");
    expect(containsRealNhsNumber(`NHS number: ${realLooking}`)).toBe(true);
    expect(containsRealNhsNumber(`NHS no ${spaced}.`)).toBe(true);
    expect(containsRealNhsNumber(`(${dashed})`)).toBe(true);
  });

  it("allows test numbers starting 999", () => {
    expect(containsRealNhsNumber("NHS number: 999 000 0018 (test range)")).toBe(false);
  });

  it("ignores numbers that fail the check, longer digit runs and doses", () => {
    const wrongCheck = realLooking.slice(0, 9) + String((Number(realLooking[9]) + 1) % 10);
    expect(containsRealNhsNumber(`Ref ${wrongCheck}`)).toBe(false);
    expect(containsRealNhsNumber(`Phone 0${realLooking}`)).toBe(false); // 11 digits
    expect(containsRealNhsNumber("Paracetamol 500 mg two tablets four times a day")).toBe(false);
    expect(containsRealNhsNumber("")).toBe(false);
  });
});
