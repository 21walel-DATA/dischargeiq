// Serves the API documentation (D-050):
//   /api/docs        the interactive Swagger page (no trailing slash, so it works through the Vercel /api rewrite)
//   /api/docs.json   the OpenAPI file
//   /api/docs/assets Swagger UI's own files, from the swagger-ui-dist package (no CDN, nothing inline, so the
//                    strict Content-Security-Policy from helmet still applies)
import { createRequire } from "node:module";
import { dirname } from "node:path";
import express, { Router } from "express";
import { openApiDocument } from "./openapi";

// Where npm put swagger-ui-dist. createRequire lets an ES module use require.resolve to find a package's folder.
const require = createRequire(import.meta.url);
const assetsDir = dirname(require.resolve("swagger-ui-dist/package.json"));

const PAGE = `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DischargeIQ API</title>
  <link rel="stylesheet" href="/api/docs/assets/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/api/docs/assets/swagger-ui-bundle.js"></script>
  <script src="/api/docs/init.js"></script>
</body>
</html>`;

// In a separate file (not inline) because the Content-Security-Policy blocks inline scripts.
const INIT = `window.addEventListener("load", function () {
  window.ui = SwaggerUIBundle({ url: "/api/docs.json", dom_id: "#swagger-ui" });
});`;

export function createDocsRouter(): Router {
  const router = Router();
  router.get("/docs.json", (_req, res) => {
    res.json(openApiDocument);
  });
  router.get("/docs", (_req, res) => {
    res.type("html").send(PAGE);
  });
  router.get("/docs/init.js", (_req, res) => {
    res.type("js").send(INIT);
  });
  router.use("/docs/assets", express.static(assetsDir, { index: false }));
  return router;
}
