// NHS number guard (D-030): enforces "synthetic data only" in code.
// Any free text that contains a VALID NHS number outside the 999 test range is refused.
// It lives in `shared` so the browser can warn early; the server is what actually enforces it.

// Ten digits, optionally written 3-3-4 with spaces or dashes ("943 476 5919", "943-476-5919"), and not part of a
// longer run of digits (so a 11-digit phone number isn't mistaken for one).
const CANDIDATE = /(?<!\d)(\d{3})[ -]?(\d{3})[ -]?(\d{4})(?!\d)/g;

// The Modulus 11 check every real NHS number passes: multiply the first 9 digits by 10, 9, ... 2, add them up,
// and the 10th digit must equal 11 minus the remainder after dividing by 11 (11 counts as 0; 10 is never valid).
export function isValidNhsNumber(digits: string): boolean {
  if (!/^\d{10}$/.test(digits)) {
    return false;
  }
  let total = 0;
  for (let i = 0; i < 9; i++) {
    total += Number(digits[i]) * (10 - i);
  }
  let check = 11 - (total % 11);
  if (check === 11) {
    check = 0;
  }
  if (check === 10) {
    return false;
  }
  return check === Number(digits[9]);
}

// NHS England's test numbers all start with 999. They pass the check but never belong to a real patient.
export function isTestNhsNumber(digits: string): boolean {
  return digits.startsWith("999");
}

// True when the text contains something that looks like a real patient's NHS number.
export function containsRealNhsNumber(text: string): boolean {
  for (const match of text.matchAll(CANDIDATE)) {
    const digits = match[1] + match[2] + match[3];
    if (isValidNhsNumber(digits) && !isTestNhsNumber(digits)) {
      return true;
    }
  }
  return false;
}

export const REAL_NHS_NUMBER_MESSAGE =
  "This looks like a real NHS number. Use synthetic data only: remove it, or use a test number starting 999.";
