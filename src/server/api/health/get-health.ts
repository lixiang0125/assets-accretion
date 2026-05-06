import type { Hono } from "hono";

export function registerGetHealthRoute(api: Hono) {
  api.get("/health", (c) => c.json({ ok: true }));
}
