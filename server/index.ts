// Starts the API. Render sets PORT; locally it defaults to 3000.
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 3000);

createApp().listen(port, () => {
  console.log(`DischargeIQ API listening on port ${port}`);
});
