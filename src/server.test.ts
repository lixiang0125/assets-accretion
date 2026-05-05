import { expect, test } from "bun:test";
import { app } from "./server";

test("serves health endpoint", async () => {
  const response = await app.request("/api/health");

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
});
