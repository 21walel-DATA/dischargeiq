import { z } from "zod";

// Rules for the register and login forms. The client uses them to show errors early; the server uses the
// SAME schemas to check every request, because anything sent from a browser can be faked.

// bcrypt only looks at the first 72 bytes of a password, so longer ones are refused rather than silently cut.
// TextEncoder counts bytes (an emoji is 4 bytes), and it works in both the browser and Node.
function fitsInBcrypt(password: string): boolean {
  return new TextEncoder().encode(password).length <= 72;
}

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter an email address like name@example.com." }).max(254));

export const registerRequestSchema = z.object({
  email: emailField,
  displayName: z
    .string()
    .trim()
    .min(1, { error: "Enter a display name." })
    .max(60, { error: "Use 60 characters or fewer for your display name." }),
  password: z
    .string()
    .min(12, { error: "Use at least 12 characters for your password." })
    .refine(fitsInBcrypt, { error: "Use 72 characters or fewer for your password." }),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

// Login doesn't repeat the length rules: a wrong password simply fails to match.
export const loginRequestSchema = z.object({
  email: emailField,
  password: z.string().min(1, { error: "Enter your password." }).max(200),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

// What the API sends back about the logged-in user. Never includes the password hash.
export const publicUserSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  displayName: z.string(),
  role: z.enum(["pharmacist", "admin"]),
});
export type PublicUser = z.infer<typeof publicUserSchema>;
export type Role = PublicUser["role"];

export const authResponseSchema = z.object({ user: publicUserSchema });
export type AuthResponse = z.infer<typeof authResponseSchema>;
