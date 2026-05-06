import { useEffect, useState } from "react";
import { fetchOperationLogs, restoreOperationLog } from "../api/assets";
import type { OperationLog, OperationLogAction, StatusType } from "../types";

export type OperationLogFilter = OperationLogAction | "all";

export function useOperationLogs(onRestored?: () => Promise<void> | void) {
  const [actionFilter, setActionFilter] = useState<OperationLogFilter>("all");
  const [items, setItems] = useState<OperationLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [restoringLogId, setRestoringLogId] = useState<number | null>(null);
  const [status, setStatus] = useState("准备就绪");
  const [statusType, setStatusType] = useState<StatusType>("idle");

  function showError(error: unknown) {
    setStatus(error instanceof Error ? error.message : "请求失败");
    setStatusType("error");
  }

  async function loadLogs(nextFilter = actionFilter) {
    setIsLoading(true);
    try {
      const data = await fetchOperationLogs({
        action: nextFilter === "all" ? undefined : nextFilter,
        limit: 200,
      });
      setItems(data.items);
      setStatus("操作记录已加载");
      setStatusType("idle");
    } catch (error) {
      showError(error);
    } finally {
      setIsLoading(false);
    }
  }

  function changeActionFilter(nextFilter: OperationLogFilter) {
    setActionFilter(nextFilter);
  }

  async function restoreLog(log: OperationLog) {
    setRestoringLogId(log.id);
    try {
      await restoreOperationLog(log.id);
      await onRestored?.();
      await loadLogs(actionFilter);
      setStatus("删除记录已恢复");
      setStatusType("idle");
    } catch (error) {
      showError(error);
    } finally {
      setRestoringLogId(null);
    }
  }

  useEffect(() => {
    void loadLogs(actionFilter);
  }, [actionFilter]);

  return {
    actionFilter,
    isLoading,
    items,
    restoringLogId,
    status,
    statusType,
    changeActionFilter,
    loadLogs,
    restoreLog,
  };
}
