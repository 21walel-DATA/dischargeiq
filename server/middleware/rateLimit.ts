// Limits how often one internet address can try to log in or register, to slow down password guessing.
// The counters live in this server's memory: fine for one Render instance (production would use a shared store).
import { rateLimit, type RateLimitRequestHandler } from "express-rate-limit";

const TOO_MANY = { error: "Too many attempts. Wait 15 minutes and try again." };

// Each call makes a fresh limiter with its own counters, so every test app starts at zero.
export function createLoginLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10, // 10 FAILED logins per 15 minutes per address
    skipSuccessfulRequests: true, // a correct login doesn't use up an attempt
    standardHeaders: "draft-8", // tells the browser how long to wait, in a standard header
    legacyHeaders: false,
    message: TOO_MANY,
  });
}

// The AI call costs money and time, so it gets its own limit (architecture.md section 8).
export function createExtractLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 30, // 30 letter readings per hour per address
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "You've read a lot of letters in the last hour. Wait a while, or add medicines by hand." },
  });
}

export function createRegisterLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10, // 10 new accounts per hour per address
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many accounts created from this connection. Try again in an hour." },
  });
}
