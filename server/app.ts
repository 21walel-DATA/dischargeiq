// Builds the Express app. Kept separate from index.ts so tests can use the app without starting a server.
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { createApiRouter } from "./routes";
import { openApiDocument } from "./docs/openapi";
import { notFound } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";

export function createApp(): express.Express {
  const app = express();

  app.disable("x-powered-by"); // don't advertise which framework we use
  // Requests reach us through two proxies (Vercel, then Render's load balancer). Trusting exactly two hops lets
  // req.ip be the visitor's real address, which the rate limiter counts by. Trusting "all" would let anyone
  // fake their address with an X-Forwarded-For header.
  app.set("trust proxy", 2);
  app.use(helmet()); // sensible security headers
  app.use(express.json({ limit: "200kb" })); // JSON bodies only, with a size cap
  app.use(cookieParser()); // reads the login cookie

  // API documentation (D-050): the interactive Swagger page and the raw OpenAPI file.
  app.get("/api/docs.json", (_req, res) => {
    res.json(openApiDocument);
  });
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument, { customSiteTitle: "DischargeIQ API" }));

  app.use("/api", createApiRouter());

  app.use(notFound); // anything else: friendly 404
  app.use(errorHandler); // last: turns any error into a friendly message (golden rule 13)
  return app;
}
