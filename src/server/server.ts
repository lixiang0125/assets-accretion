import { createDefaultApp } from "./app";

const port = Number(process.env.PORT ?? 3000);
const app = createDefaultApp();

Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`Server running at http://localhost:${port}`);
