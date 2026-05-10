import { useEffect, useState } from "react";
import {
  fetchAssetGroups,
  fetchAssetTypes,
  fetchPortfolioTrend,
  fetchSummary,
} from "../api/assets";
import { currentMonth, nextMonth, previousMonth } from "../lib/format";
import type {
  AssetGroup,
  AssetType,
  PortfolioSummary,
  PortfolioTrendPoint,
  StatusType,
} from "../types";

export const initialMonth = currentMonth();
export const initialCompareMonth = previousMonth(initialMonth);

type DashboardDataOptions = {
  onError: (error: unknown) => void;
  setStatus: (message: string, type: StatusType) => void;
};

export function useDashboardData({
  onError,
  setStatus,
}: DashboardDataOptions) {
  const [month, setMonth] = useState(initialMonth);
  const [compareMonth, setCompareMonth] = useState(initialCompareMonth);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [portfolioTrend, setPortfolioTrend] = useState<PortfolioTrendPoint[]>(
    [],
  );

  async function loadAssetTypes() {
    const data = await fetchAssetTypes();
    setAssetTypes(data.items);
    return data.items;
  }

  async function loadAssetGroups() {
    const data = await fetchAssetGroups();
    setAssetGroups(data.items);
    return data.items;
  }

  async function loadSummary(
    nextMonth = month,
    nextCompareMonth = compareMonth,
  ) {
    const data = await fetchSummary(nextMonth, nextCompareMonth);
    setSummary(data);
    return data;
  }

  async function loadPortfolioTrend() {
    const data = await fetchPortfolioTrend();
    setPortfolioTrend(data.items);
    return data.items;
  }

  async function refreshData() {
    const [, nextAssetTypes] = await Promise.all([
      loadAssetGroups(),
      loadAssetTypes(),
      loadSummary(month, compareMonth),
      loadPortfolioTrend(),
    ]);
    return { assetTypes: nextAssetTypes };
  }

  async function changeMonth(targetMonth: string) {
    const nextCompareMonth = previousMonth(targetMonth);
    setMonth(targetMonth);
    setCompareMonth(nextCompareMonth);
    try {
      await loadSummary(targetMonth, nextCompareMonth);
      setStatus("统计月份已切换", "idle");
    } catch (error) {
      onError(error);
    }
  }

  async function goToPreviousMonth() {
    await changeMonth(previousMonth(month));
  }

  async function goToNextMonth() {
    await changeMonth(nextMonth(month));
  }

  async function changeCompareMonth(nextCompareMonth: string) {
    setCompareMonth(nextCompareMonth);
    try {
      await loadSummary(month, nextCompareMonth);
      setStatus("对比月份已切换", "idle");
    } catch (error) {
      onError(error);
    }
  }

  useEffect(() => {
    Promise.all([
      loadAssetGroups(),
      loadAssetTypes(),
      loadSummary(),
      loadPortfolioTrend(),
    ]).catch(onError);
  }, []);

  return {
    assetGroups,
    assetTypes,
    changeCompareMonth,
    changeMonth,
    compareMonth,
    goToNextMonth,
    goToPreviousMonth,
    month,
    portfolioTrend,
    refreshData,
    summary,
  };
}
