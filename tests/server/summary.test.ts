import { expect, test } from "bun:test";
import { createServerTestContext } from "./helpers";

const { app, createAssetGroup, createAssetType, createRecord } =
  createServerTestContext();

test("summarizes changes against a selected comparison month", async () => {
  const asset = await createAssetType("现金");
  await createRecord({ assetTypeId: asset.id, month: "2026-01", value: 40 });
  await createRecord({ assetTypeId: asset.id, month: "2026-04", value: 100 });
  await createRecord({ assetTypeId: asset.id, month: "2026-05", value: 150 });

  const response = await app.request(
    "/api/summary?month=2026-05&compareMonth=2026-01",
  );
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(payload.compareMonth).toBe("2026-01");
  expect(payload.totalPreviousValue).toBe(40);
  expect(payload.totalChangeValue).toBe(110);
  expect(payload.totalChangeRate).toBe(2.75);
  expect(payload.items[0]).toMatchObject({
    previousMonth: "2026-01",
    previousValue: 40,
    changeValue: 110,
    changeRate: 2.75,
  });
});

test("summarizes asset groups through API", async () => {
  const cashGroup = await createAssetGroup("现金类");
  const stockGroup = await createAssetGroup("证券");
  const cash = await createAssetType("现金", cashGroup.id);
  const alipay = await createAssetType("支付宝", cashGroup.id);
  const stock = await createAssetType("股票", stockGroup.id);

  await createRecord({ assetTypeId: cash.id, month: "2026-04", value: 100 });
  await createRecord({ assetTypeId: alipay.id, month: "2026-05", value: 50 });
  await createRecord({ assetTypeId: stock.id, month: "2026-04", value: 200 });
  await createRecord({ assetTypeId: stock.id, month: "2026-05", value: 260 });

  const response = await app.request("/api/summary?month=2026-05");
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(
    payload.items.find(
      (item: { assetTypeId: number }) => item.assetTypeId === cash.id,
    ),
  ).toMatchObject({
    assetGroupId: cashGroup.id,
    assetGroupName: "现金类",
    value: null,
    effectiveValue: 100,
  });
  expect(payload.groups).toEqual([
    {
      groupId: stockGroup.id,
      groupName: "证券",
      assetTypeCount: 1,
      recordedAssetTypeCount: 1,
      totalValue: 260,
      totalPreviousValue: 200,
      totalChangeValue: 60,
      totalChangeRate: 0.3,
    },
    {
      groupId: cashGroup.id,
      groupName: "现金类",
      assetTypeCount: 2,
      recordedAssetTypeCount: 1,
      totalValue: 150,
      totalPreviousValue: 100,
      totalChangeValue: 0,
      totalChangeRate: 0,
    },
  ]);
});

test("lists portfolio trend through API", async () => {
  const cash = await createAssetType("现金");
  const stock = await createAssetType("股票");
  await createRecord({ assetTypeId: cash.id, month: "2026-04", value: 40 });
  await createRecord({ assetTypeId: stock.id, month: "2026-04", value: 60 });
  await createRecord({ assetTypeId: cash.id, month: "2026-05", value: 120 });

  const response = await app.request("/api/summary/trend");
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(payload.items).toEqual([
    { month: "2026-04", totalValue: 100 },
    { month: "2026-05", totalValue: 180 },
  ]);
});

test("lists portfolio trend for a selected asset group", async () => {
  const cashGroup = await createAssetGroup("现金类");
  const stockGroup = await createAssetGroup("证券");
  const cash = await createAssetType("现金", cashGroup.id);
  const stock = await createAssetType("股票", stockGroup.id);

  await createRecord({ assetTypeId: cash.id, month: "2026-04", value: 40 });
  await createRecord({ assetTypeId: stock.id, month: "2026-04", value: 60 });
  await createRecord({ assetTypeId: cash.id, month: "2026-05", value: 120 });

  const response = await app.request(
    `/api/summary/trend?groupId=${cashGroup.id}`,
  );
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(payload.items).toEqual([
    { month: "2026-04", totalValue: 40 },
    { month: "2026-05", totalValue: 120 },
  ]);
});

test("lists ungrouped portfolio trend through API", async () => {
  const stockGroup = await createAssetGroup("证券");
  const cash = await createAssetType("现金");
  const stock = await createAssetType("股票", stockGroup.id);

  await createRecord({ assetTypeId: stock.id, month: "2026-04", value: 60 });
  await createRecord({ assetTypeId: cash.id, month: "2026-05", value: 120 });

  const response = await app.request("/api/summary/trend?groupId=ungrouped");
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(payload.items).toEqual([{ month: "2026-05", totalValue: 120 }]);
});

test("rejects invalid and missing portfolio trend group filters", async () => {
  const invalidResponse = await app.request("/api/summary/trend?groupId=abc");
  const missingResponse = await app.request("/api/summary/trend?groupId=999999");

  expect(invalidResponse.status).toBe(400);
  expect(await invalidResponse.json()).toEqual({
    error: "资产分组 id 必须是正整数或 ungrouped",
  });
  expect(missingResponse.status).toBe(404);
  expect(await missingResponse.json()).toEqual({
    error: "资产分组不存在",
  });
});
