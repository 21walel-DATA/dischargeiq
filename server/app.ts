// Builds the Express app. Kept separate from index.ts so tests can use the app without starting a server.
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { apiRouter } from "./routes";
import { notFound } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";

export function createApp(): express.Express {
  const app = express();

  app.disable("x-powered-by"); // don't advertise which framework we use
  app.use(helmet()); // sensible security headers
  app.use(express.json({ limit: "200kb" })); // JSON bodies only, with a size cap
  app.use(cookieParser()); // reads the login cookie (used from the auth step)

  app.use("/api", apiRouter);

  app.use(notFound); // anything else: friendly 404
  app.use(errorHandler); // last: turns any error into a friendly message (golden rule 13)
  return app;
}
