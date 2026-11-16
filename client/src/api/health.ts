// Fetch wrapper for GET /api/health. The URL is relative: same website in development (Vite forwards it)
// and in production (Vercel forwards it to Render). No API address appears in the code.
import { healthResponseSchema, type HealthResponse } from "@dischargeiq/shared";

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/health");
  const body: unknown = await response.json();
  // Check the answer has the shape we expect before using it.
  return healthResponseSchema.parse(body);
}
