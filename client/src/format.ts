// Small display helpers shared by the pages. Display only: nothing here changes clinical data.

// "14 Nov 09:10" (UK style, the browser's own time zone).
export function formatDateTime(iso: string | null): string {
  if (!iso) return "Not recorded";
  const date = new Date(iso);
  const day = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${day} ${time}`;
}

// Hours left of the 72-hour stage 1 target, counted from when the referral arrived (guidance, not a deadline).
// Negative means the target has passed. Null when the referral time wasn't recorded.
export function stageOneHoursLeft(referralReceivedAt: string | null, now: Date = new Date()): number | null {
  if (!referralReceivedAt) return null;
  const elapsedHours = (now.getTime() - new Date(referralReceivedAt).getTime()) / 3_600_000;
  return Math.round(72 - elapsedHours);
}

export function describeHoursLeft(hours: number): string {
  return hours >= 0 ? `${hours} h left of the 72-hour target` : `${Math.abs(hours)} h past the 72-hour target`;
}

// "one tablet, each morning": the label's directions line, from the separate dose and frequency fields.
export function directions(dose: string | null, frequency: string | null): string {
  return [dose, frequency].filter((part) => part && part.trim() !== "").join(", ");
}

// "<input type=datetime-local>" works in local time without a zone; the API wants a full ISO date.
export function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function fromLocalInputValue(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}
