import { expect, test } from "bun:test";
import { createServerTestContext } from "./helpers";

const { app } = createServerTestContext();

test("serves health endpoint", async () => {
  const response = await app.request("/api/health");

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
});

test("serves React application shell", async () => {
  const response = await app.request("/");
  const html = await response.text();

  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("content-type")).toContain("text/html");
  expect(html).toContain('<div id="root"></div>');
  expect(html).toContain("/assets/styles.css?v=");
  expect(html).toContain("/assets/app.js?v=");
});

test("serves bundled React client", async () => {
  const response = await app.request("/assets/app.js");
  const script = await response.text();

  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("content-type")).toContain("text/javascript");
  expect(script).toContain("createRoot");
});

test("serves separated client stylesheet", async () => {
  const response = await app.request("/assets/styles.css");
  const stylesheet = await response.text();

  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("content-type")).toContain("text/css");
  expect(stylesheet).toContain('@import "./App/App.css"');
  expect(stylesheet).toContain(
    '@import "./components/dashboard/AssetGroupForm/AssetGroupForm.css"',
  );
  expect(stylesheet).toContain(
    '@import "./components/dashboard/DeleteAssetTypeDialog/DeleteAssetTypeDialog.css"',
  );
  expect(stylesheet).toContain(
    '@import "./components/dashboard/GroupSummaryTable/GroupSummaryTable.css"',
  );
  expect(stylesheet).toContain(
    '@import "./components/dashboard/PortfolioTrendChart/PortfolioTrendChart.css"',
  );
});

test("serves imported component stylesheets from the client tree only", async () => {
  const appStylesResponse = await app.request("/assets/App/App.css");
  const appStyles = await appStylesResponse.text();
  const componentStylesResponse = await app.request(
    "/assets/components/dashboard/AssetDetailTable/AssetDetailTable.css",
  );
  const drawerStylesResponse = await app.request(
    "/assets/components/dashboard/RecordDrawer/RecordDrawer.css",
  );
  const deleteAssetTypeStylesResponse = await app.request(
    "/assets/components/dashboard/DeleteAssetTypeDialog/DeleteAssetTypeDialog.css",
  );
  const assetGroupFormStylesResponse = await app.request(
    "/assets/components/dashboard/AssetGroupForm/AssetGroupForm.css",
  );
  const groupSummaryStylesResponse = await app.request(
    "/assets/components/dashboard/GroupSummaryTable/GroupSummaryTable.css",
  );
  const outsideResponse = await app.request("/assets/../server/app.ts");

  expect(appStylesResponse.status).toBe(200);
  expect(appStyles).toContain(".app-shell");
  expect(componentStylesResponse.status).toBe(200);
  expect(await componentStylesResponse.text()).toContain(".detail-table");
  expect(drawerStylesResponse.status).toBe(200);
  expect(await drawerStylesResponse.text()).toContain(".record-drawer-body");
  expect(deleteAssetTypeStylesResponse.status).toBe(200);
  expect(await deleteAssetTypeStylesResponse.text()).toContain(
    ".delete-asset-type-summary",
  );
  expect(assetGroupFormStylesResponse.status).toBe(200);
  expect(await assetGroupFormStylesResponse.text()).toContain(
    ".asset-group-list",
  );
  expect(groupSummaryStylesResponse.status).toBe(200);
  expect(await groupSummaryStylesResponse.text()).toContain(
    ".group-summary-table",
  );
  expect(outsideResponse.status).toBe(404);
});
