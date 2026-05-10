import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createAssetGroupQueries } from "./asset-groups";
import { createAssetTypeQueries } from "./asset-types";
import { createOperationLogQueries } from "./operation-logs";
import { createRecordQueries } from "./records";
import { initializeDatabase } from "./schema";
import { createSummaryQueries } from "./summary";

export type {
  AssetGroup,
  AssetGroupSummary,
  AssetRecord,
  AssetSummary,
  AssetType,
  OperationLog,
  OperationLogAction,
  PortfolioSummary,
  PortfolioTrendPoint,
  RestoreOperationResult,
} from "./types";

export function createAssetStore(filename = "data/assets.sqlite") {
  mkdirSync(dirname(filename), { recursive: true });
  const db = new Database(filename);
  initializeDatabase(db);

  const { insertOperationLog, ...operationLogQueries } =
    createOperationLogQueries(db);
  const { getAssetTypeById, ...assetTypeQueries } = createAssetTypeQueries(
    db,
    insertOperationLog,
  );
  const recordQueries = createRecordQueries(db, {
    getAssetTypeById,
    getOperationLogById: operationLogQueries.getOperationLogById,
    insertOperationLog,
  });
  const assetGroupQueries = createAssetGroupQueries(db, insertOperationLog);
  const summaryQueries = createSummaryQueries(db);

  return {
    ...assetGroupQueries,
    ...assetTypeQueries,
    ...recordQueries,
    ...operationLogQueries,
    ...summaryQueries,
    close() {
      db.close();
    },
  };
}

export type AssetStore = ReturnType<typeof createAssetStore>;
