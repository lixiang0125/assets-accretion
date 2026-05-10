import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AssetDetailTable } from "../components/dashboard/AssetDetailTable";
import { AssetGroupForm } from "../components/dashboard/AssetGroupForm";
import { DeleteAssetTypeDialog } from "../components/dashboard/DeleteAssetTypeDialog";
import { DeleteRecordDialog } from "../components/dashboard/DeleteRecordDialog";
import { AssetTypeForm } from "../components/dashboard/AssetTypeForm";
import { GroupSummaryTable } from "../components/dashboard/GroupSummaryTable";
import { HistoryDrawer } from "../components/dashboard/HistoryDrawer";
import { MetricsGrid } from "../components/dashboard/MetricsGrid";
import { PortfolioTrendChart } from "../components/dashboard/PortfolioTrendChart";
import { RecordDrawer } from "../components/dashboard/RecordDrawer";
import { OperationLogPage } from "../components/operations/OperationLogPage";
import { Button } from "../components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/Dialog";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { useAssetDashboard } from "../hooks/useAssetDashboard";
import { cn } from "../lib/utils";

type AppView = "dashboard" | "operation-logs";

export function App() {
  const dashboard = useAssetDashboard();
  const [activeView, setActiveView] = useState<AppView>("dashboard");
  const [isAssetGroupDialogOpen, setIsAssetGroupDialogOpen] = useState(false);
  const [isAssetTypeDialogOpen, setIsAssetTypeDialogOpen] = useState(false);

  return (
    <>
      <main className="app-shell">
        <section aria-label="页面标题与月份筛选" className="hero-row">
          <div>
            <p className="eyebrow">本地 SQLite 资产台账</p>
            <h1>资产增值统计</h1>
          </div>
          <div className="period-panel" aria-label="月份筛选">
            <div className="field-stack summary-month-filter">
              <Label htmlFor="summary-month">统计月份</Label>
              <div className="month-stepper" aria-label="统计月份快捷切换">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="切换到上一个月"
                  title="切换到上一个月"
                  onClick={dashboard.goToPreviousMonth}
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <Input
                  id="summary-month"
                  type="month"
                  value={dashboard.month}
                  onChange={(event) =>
                    dashboard.changeMonth(event.target.value)
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="切换到下一个月"
                  title="切换到下一个月"
                  onClick={dashboard.goToNextMonth}
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </div>
            <div className="field-stack compare-month-filter">
              <Label htmlFor="compare-month">对比月份</Label>
              <Input
                id="compare-month"
                type="month"
                value={dashboard.compareMonth}
                onChange={(event) =>
                  dashboard.changeCompareMonth(event.target.value)
                }
              />
            </div>
          </div>
        </section>

        <section
          className="dashboard-controls-row"
          aria-label="页面导航与资产类型操作"
        >
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
              className={cn(
                activeView === "operation-logs" && "view-tab-active",
              )}
              onClick={() => setActiveView("operation-logs")}
            >
              操作记录
            </Button>
          </nav>
          <div className="dashboard-config-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAssetGroupDialogOpen(true)}
            >
              添加资产分组
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAssetTypeDialogOpen(true)}
            >
              添加资产类型
            </Button>
          </div>
        </section>

        {activeView === "dashboard" ? (
          <>
            <MetricsGrid
              compareMonth={dashboard.compareMonth}
              summary={dashboard.summary}
            />
            <PortfolioTrendChart
              assetGroups={dashboard.assetGroups}
              groupFilter={dashboard.trendGroupFilter}
              items={dashboard.portfolioTrend}
              selectedMonth={dashboard.month}
              onGroupFilterChange={dashboard.changeTrendGroupFilter}
            />
            <GroupSummaryTable groups={dashboard.summary?.groups ?? []} />
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
          <OperationLogPage
            onRestored={() => dashboard.refreshDashboard("删除记录已恢复")}
          />
        )}
      </main>

      <HistoryDrawer
        asset={dashboard.drawerAsset}
        assetGroups={dashboard.assetGroups}
        assetDescription={dashboard.drawerAssetDescription}
        assetGroupId={dashboard.drawerAssetGroupId}
        assetName={dashboard.drawerAssetName}
        history={dashboard.drawerHistory}
        isEditingAsset={dashboard.isEditingDrawerAsset}
        isLoading={dashboard.isHistoryLoading}
        onAssetDescriptionChange={dashboard.setDrawerAssetDescription}
        onAssetGroupIdChange={dashboard.setDrawerAssetGroupId}
        onAssetNameChange={dashboard.setDrawerAssetName}
        onCancelEditAsset={dashboard.cancelEditDrawerAsset}
        onRequestDeleteAsset={dashboard.requestDeleteAssetType}
        onStartEditAsset={dashboard.startEditDrawerAsset}
        onSubmitAsset={dashboard.submitDrawerAssetType}
        onOpenChange={dashboard.setDrawerOpen}
      />
      <RecordDrawer
        assetTypes={dashboard.assetTypes}
        editingRecord={dashboard.editingRecord}
        form={dashboard.recordForm}
        isOpen={dashboard.isRecordDrawerOpen}
        selectedAssetTypeId={dashboard.selectedAssetTypeId}
        onCancelEdit={dashboard.resetRecordForm}
        onFieldChange={dashboard.updateRecordField}
        onOpenChange={dashboard.changeRecordDrawerOpen}
        onSubmit={dashboard.submitRecord}
      />
      <DeleteRecordDialog
        confirmStep={dashboard.deleteConfirmStep}
        isDeleting={dashboard.isDeletingRecord}
        record={dashboard.pendingDeleteRecord}
        onCancel={dashboard.cancelDeleteRecord}
        onConfirmStep={dashboard.confirmDeleteRecord}
      />
      <DeleteAssetTypeDialog
        asset={dashboard.pendingDeleteAssetType}
        confirmStep={dashboard.deleteAssetTypeConfirmStep}
        isDeleting={dashboard.isDeletingAssetType}
        recordCount={dashboard.drawerHistory.length}
        onCancel={dashboard.cancelDeleteAssetType}
        onConfirmStep={dashboard.confirmDeleteAssetType}
      />
      <Dialog
        open={isAssetGroupDialogOpen}
        onOpenChange={setIsAssetGroupDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加资产分组</DialogTitle>
            <DialogDescription>
              先创建分组，再在资产类型里选择它。
            </DialogDescription>
          </DialogHeader>
          <AssetGroupForm
            assetGroups={dashboard.assetGroups}
            name={dashboard.assetGroupName}
            onNameChange={dashboard.setAssetGroupName}
            onSubmit={async (event) => {
              const created = await dashboard.submitAssetGroup(event);
              if (created) {
                setIsAssetGroupDialogOpen(false);
              }
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={isAssetTypeDialogOpen}
        onOpenChange={setIsAssetTypeDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加资产类型</DialogTitle>
            <DialogDescription>
              资产类型只需要创建一次，后续每个月直接记录它的价值。
            </DialogDescription>
          </DialogHeader>
          <AssetTypeForm
            assetGroups={dashboard.assetGroups}
            description={dashboard.assetTypeDescription}
            groupId={dashboard.assetTypeGroupId}
            name={dashboard.assetTypeName}
            submitLabel="添加类型"
            onDescriptionChange={dashboard.setAssetTypeDescription}
            onGroupIdChange={dashboard.setAssetTypeGroupId}
            onNameChange={dashboard.setAssetTypeName}
            onSubmit={async (event) => {
              const created = await dashboard.submitAssetType(event);
              if (created) {
                setIsAssetTypeDialogOpen(false);
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
