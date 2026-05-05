import { expect, test } from "bun:test";
import { app } from "../../src/server/app";

test("serves health endpoint", async () => {
  const response = await app.request("/api/health");

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
});

test("serves React application shell", async () => {
  const response = await app.request("/");
  const html = await response.text();

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/html");
  expect(html).toContain('<div id="root"></div>');
  expect(html).toContain('/assets/app.js');
});

test("serves bundled React client", async () => {
  const response = await app.request("/assets/app.js");
  const script = await response.text();

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/javascript");
  expect(script).toContain("createRoot");
});
