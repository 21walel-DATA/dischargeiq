import { z } from "zod";

// The answer from GET /api/health.
// The server builds it; the client checks it with this same schema before showing it.
export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  database: z.enum(["ok", "unavailable"]),
});

// `z.infer` turns the schema into a TypeScript type, so the type and the check can never disagree.
export type HealthResponse = z.infer<typeof healthResponseSchema>;
