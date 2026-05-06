import { useState } from "react";
import { AssetDetailTable } from "./components/dashboard/AssetDetailTable";
import { DeleteRecordDialog } from "./components/dashboard/DeleteRecordDialog";
import { AssetTypeForm } from "./components/dashboard/AssetTypeForm";
import { HistoryDrawer } from "./components/dashboard/HistoryDrawer";
import { MetricsGrid } from "./components/dashboard/MetricsGrid";
import { RecordForm } from "./components/dashboard/RecordForm";
import { OperationLogPage } from "./components/operations/OperationLogPage";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { useAssetDashboard } from "./hooks/useAssetDashboard";
import { cn } from "./lib/utils";

type AppView = "dashboard" | "operation-logs";

export function App() {
  const dashboard = useAssetDashboard();
  const [activeView, setActiveView] = useState<AppView>("dashboard");

  return (
    <>
      <main className="app-shell">
        <section aria-label="月份筛选" className="hero-row">
          <div>
            <p className="eyebrow">本地 SQLite 资产台账</p>
            <h1>资产增值统计</h1>
          </div>
          <div className="month-filter-group">
            <div className="field-stack month-filter">
              <Label htmlFor="summary-month">统计月份</Label>
              <Input
                id="summary-month"
                type="month"
                value={dashboard.month}
                onChange={(event) => dashboard.changeMonth(event.target.value)}
              />
            </div>
            <div className="field-stack month-filter">
              <Label htmlFor="compare-month">对比月份</Label>
              <Input
                id="compare-month"
                type="month"
                value={dashboard.compareMonth}
                onChange={(event) => dashboard.changeCompareMonth(event.target.value)}
              />
            </div>
          </div>
        </section>

        <nav className="view-tabs" aria-label="页面导航">
          <Button
            type="button"
            variant={activeView === "dashboard" ? "default" : "outline"}
            className={cn(activeView === "dashboard" && "view-tab-active")}
            onClick={() => setActiveView("dashboard")}
          >
            资产统计
          </Button>
          <Button
            type="button"
            variant={activeView === "operation-logs" ? "default" : "outline"}
            className={cn(activeView === "operation-logs" && "view-tab-active")}
            onClick={() => setActiveView("operation-logs")}
          >
            操作记录
          </Button>
        </nav>

        {activeView === "dashboard" ? (
          <>
            <MetricsGrid compareMonth={dashboard.compareMonth} summary={dashboard.summary} />

            <section className="forms-grid">
              <AssetTypeForm
                description={dashboard.assetTypeDescription}
                name={dashboard.assetTypeName}
                onDescriptionChange={dashboard.setAssetTypeDescription}
                onNameChange={dashboard.setAssetTypeName}
                onSubmit={dashboard.submitAssetType}
              />
              <RecordForm
                assetTypes={dashboard.assetTypes}
                editingRecord={dashboard.editingRecord}
                form={dashboard.recordForm}
                selectedAssetTypeId={dashboard.selectedAssetTypeId}
                onCancelEdit={dashboard.resetRecordForm}
                onFieldChange={dashboard.updateRecordField}
                onSubmit={dashboard.submitRecord}
              />
            </section>

            <AssetDetailTable
              items={dashboard.summary?.items ?? []}
              status={dashboard.status}
              statusType={dashboard.statusType}
              onEditRecord={dashboard.editRecord}
              onOpenHistory={dashboard.openHistory}
              onRecordAssetType={dashboard.recordAssetType}
              onRequestDeleteRecord={dashboard.requestDeleteRecord}
            />
          </>
        ) : (
          <OperationLogPage onRestored={() => dashboard.refreshDashboard("删除记录已恢复")} />
        )}
      </main>

      <HistoryDrawer
        asset={dashboard.drawerAsset}
        history={dashboard.drawerHistory}
        isLoading={dashboard.isHistoryLoading}
        onOpenChange={dashboard.setDrawerOpen}
      />
      <DeleteRecordDialog
        confirmStep={dashboard.deleteConfirmStep}
        isDeleting={dashboard.isDeletingRecord}
        record={dashboard.pendingDeleteRecord}
        onCancel={dashboard.cancelDeleteRecord}
        onConfirmStep={dashboard.confirmDeleteRecord}
      />
    </>
  );
}
