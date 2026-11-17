// Starts the API. Render sets PORT; locally it defaults to 3000.
import { createApp } from "./app";
import { getJwtSecret } from "./services/session.service";

// Fail at start-up (not at the first login) if JWT_SECRET is missing or weak. Its value is never printed.
getJwtSecret();

const port = Number(process.env.PORT ?? 3000);

createApp().listen(port, () => {
  console.log(`DischargeIQ API listening on port ${port}`);
});
