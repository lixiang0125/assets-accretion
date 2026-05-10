import { expect, test } from "bun:test";
import { createServerTestContext } from "./helpers";

const { app, createAssetGroup, createAssetType, createRecord } =
  createServerTestContext();

test("rejects malformed JSON and invalid asset type names", async () => {
  const malformedResponse = await app.request("/api/asset-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  const emptyNameResponse = await app.request("/api/asset-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "   " }),
  });

  expect(malformedResponse.status).toBe(400);
  expect(await malformedResponse.json()).toEqual({
    error: "请求体必须是合法 JSON",
  });
  expect(emptyNameResponse.status).toBe(400);
  expect(await emptyNameResponse.json()).toEqual({
    error: "资产类型名称不能为空",
  });
});

test("rejects duplicate asset type creation and rename conflicts", async () => {
  const cash = await createAssetType("现金");
  const stock = await createAssetType("股票");

  const duplicateResponse = await app.request("/api/asset-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "现金" }),
  });
  const renameConflictResponse = await app.request(
    `/api/asset-types/${stock.id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cash.name }),
    },
  );

  expect(duplicateResponse.status).toBe(409);
  expect(await duplicateResponse.json()).toEqual({ error: "资产类型已存在" });
  expect(renameConflictResponse.status).toBe(409);
  expect(await renameConflictResponse.json()).toEqual({
    error: "资产类型已存在",
  });
});

test("creates asset groups and assigns them through API", async () => {
  const cashGroup = await createAssetGroup("现金类");
  const liquidGroup = await createAssetGroup("流动资金");
  const cash = await createAssetType("现金", cashGroup.id);

  expect(cash.groupId).toBe(cashGroup.id);
  expect(cash.groupName).toBe("现金类");

  const updateResponse = await app.request(`/api/asset-types/${cash.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "现金账户",
      description: "活期",
      groupId: liquidGroup.id,
    }),
  });
  const updatePayload = await updateResponse.json();
  const groupsResponse = await app.request("/api/asset-groups");
  const groupsPayload = await groupsResponse.json();
  const listResponse = await app.request("/api/asset-types");
  const listPayload = await listResponse.json();

  expect(updateResponse.status).toBe(200);
  expect(updatePayload.item).toMatchObject({
    id: cash.id,
    name: "现金账户",
    description: "活期",
    groupId: liquidGroup.id,
    groupName: "流动资金",
  });
  expect(
    groupsPayload.items.map((item: { name: string }) => item.name),
  ).toEqual(["流动资金", "现金类"]);
  expect(listPayload.items[0]).toMatchObject({
    groupId: liquidGroup.id,
    groupName: "流动资金",
  });

  const invalidGroupResponse = await app.request("/api/asset-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "股票", groupId: 0 }),
  });
  expect(invalidGroupResponse.status).toBe(400);
  expect(await invalidGroupResponse.json()).toEqual({
    error: "资产分组 id 必须是正整数",
  });

  const missingGroupResponse = await app.request("/api/asset-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "股票", groupId: 999999 }),
  });
  expect(missingGroupResponse.status).toBe(404);
  expect(await missingGroupResponse.json()).toEqual({
    error: "资产分组不存在",
  });
});

test("deletes an asset type and cascades its monthly records through API", async () => {
  const cash = await createAssetType("现金");
  const stock = await createAssetType("股票");
  await createRecord({ assetTypeId: cash.id, month: "2026-04", value: 100 });
  await createRecord({ assetTypeId: cash.id, month: "2026-05", value: 150 });
  await createRecord({ assetTypeId: stock.id, month: "2026-05", value: 300 });

  const invalidResponse = await app.request("/api/asset-types/not-a-number", {
    method: "DELETE",
  });
  const deleteResponse = await app.request(`/api/asset-types/${cash.id}`, {
    method: "DELETE",
  });
  const deletedAgainResponse = await app.request(
    `/api/asset-types/${cash.id}`,
    {
      method: "DELETE",
    },
  );
  const summaryResponse = await app.request("/api/summary?month=2026-05");
  const summaryPayload = await summaryResponse.json();
  const historyResponse = await app.request(
    `/api/asset-types/${cash.id}/history`,
  );
  const historyPayload = await historyResponse.json();
  const logsResponse = await app.request(
    "/api/operation-logs?action=asset_type_deleted&limit=1",
  );
  const logsPayload = await logsResponse.json();

  expect(invalidResponse.status).toBe(400);
  expect(await invalidResponse.json()).toEqual({
    error: "资产类型 id 必须是正整数",
  });
  expect(deleteResponse.status).toBe(200);
  expect(await deleteResponse.json()).toEqual({ ok: true });
  expect(deletedAgainResponse.status).toBe(404);
  expect(await deletedAgainResponse.json()).toEqual({
    error: "资产类型不存在",
  });
  expect(summaryPayload.items).toHaveLength(1);
  expect(summaryPayload.items[0]).toMatchObject({
    assetTypeId: stock.id,
    month: "2026-05",
    value: 300,
    hasRecord: true,
  });
  expect(summaryPayload.totalValue).toBe(300);
  expect(historyPayload.items).toEqual([]);
  expect(logsResponse.status).toBe(200);
  expect(logsPayload.items).toHaveLength(1);
  expect(logsPayload.items[0]).toMatchObject({
    action: "asset_type_deleted",
    entityId: cash.id,
    entityLabel: "现金",
    reversible: false,
  });
  expect(logsPayload.items[0].beforePayload.records).toHaveLength(2);
});
