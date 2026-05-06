import { AssetDetailTable } from "./components/dashboard/AssetDetailTable";
import { AssetTypeForm } from "./components/dashboard/AssetTypeForm";
import { HistoryDrawer } from "./components/dashboard/HistoryDrawer";
import { MetricsGrid } from "./components/dashboard/MetricsGrid";
import { RecordForm } from "./components/dashboard/RecordForm";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { useAssetDashboard } from "./hooks/useAssetDashboard";

export function App() {
  const dashboard = useAssetDashboard();

  return (
    <>
      <main className="app-shell">
        <section aria-label="月份筛选" className="hero-row">
          <div>
            <p className="eyebrow">本地 SQLite 资产台账</p>
            <h1>资产增值统计</h1>
          </div>
          <div className="field-stack month-filter">
            <Label htmlFor="summary-month">统计月份</Label>
            <Input
              id="summary-month"
              type="month"
              value={dashboard.month}
              onChange={(event) => dashboard.changeMonth(event.target.value)}
            />
          </div>
        </section>

        <MetricsGrid summary={dashboard.summary} />

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
          onDeleteRecord={dashboard.removeRecord}
          onEditRecord={dashboard.editRecord}
          onOpenHistory={dashboard.openHistory}
        />
      </main>

      <HistoryDrawer
        asset={dashboard.drawerAsset}
        history={dashboard.drawerHistory}
        isLoading={dashboard.isHistoryLoading}
        onOpenChange={dashboard.setDrawerOpen}
      />
    </>
  );
}
