import {
  StrictMode,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { createRoot } from "react-dom/client";

type AssetType = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
};

type SummaryItem = {
  id: number;
  assetTypeId: number;
  assetTypeName: string;
  month: string;
  value: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  previousMonth: string | null;
  previousValue: number | null;
  changeValue: number | null;
  changeRate: number | null;
};

type PortfolioSummary = {
  month: string | null;
  totalValue: number;
  totalPreviousValue: number;
  totalChangeValue: number;
  totalChangeRate: number | null;
  items: SummaryItem[];
};

const palette = {
  bg: "#f6f7f3",
  panel: "#ffffff",
  ink: "#1c2420",
  muted: "#66716b",
  line: "#dfe5dc",
  accent: "#24745a",
  danger: "#b44433",
  positive: "#0e7c58",
  negative: "#b44433",
  shadow: "0 16px 36px rgba(24, 45, 36, 0.08)",
};

const fontFamily =
  'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("zh-CN", {
  style: "percent",
  maximumFractionDigits: 2,
});

function applyPageStyle() {
  document.documentElement.style.colorScheme = "light";
  Object.assign(document.body.style, {
    margin: "0",
    minWidth: "320px",
    background: palette.bg,
    color: palette.ink,
    fontFamily,
  });
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function useCompactViewport() {
  const [isCompact, setIsCompact] = useState(() => window.innerWidth <= 820);

  useEffect(() => {
    const update = () => setIsCompact(window.innerWidth <= 820);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return isCompact;
}

function formatCurrency(value: number | null | undefined) {
  return value === null || value === undefined ? "--" : currencyFormatter.format(value);
}

function formatPercent(value: number | null | undefined) {
  return value === null || value === undefined ? "--" : percentFormatter.format(value);
}

function toneStyle(value: number | null | undefined): CSSProperties {
  if (value === null || value === undefined || value === 0) return {};
  return {
    color: value > 0 ? palette.positive : palette.negative,
    fontWeight: 800,
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "请求失败");
  }
  return data as T;
}

function shellStyle(isCompact: boolean): CSSProperties {
  return {
    width: isCompact ? "min(100% - 20px, 1180px)" : "min(1180px, calc(100vw - 32px))",
    margin: "0 auto",
    padding: isCompact ? "20px 0" : "32px 0",
    boxSizing: "border-box",
  };
}

function stackableRowStyle(isCompact: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: isCompact ? "stretch" : "end",
    flexDirection: isCompact ? "column" : "row",
    justifyContent: "space-between",
    gap: isCompact ? 12 : 24,
  };
}

function gridStyle(columns: string, isCompact: boolean): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: isCompact ? "1fr" : columns,
    gap: 14,
  };
}

const panelStyle: CSSProperties = {
  border: `1px solid ${palette.line}`,
  borderRadius: 8,
  background: palette.panel,
  boxShadow: palette.shadow,
  boxSizing: "border-box",
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  color: palette.muted,
  fontSize: 14,
  fontWeight: 650,
};

const controlStyle: CSSProperties = {
  width: "100%",
  height: 42,
  border: `1px solid ${palette.line}`,
  borderRadius: 8,
  background: "#fff",
  color: palette.ink,
  padding: "0 12px",
  boxSizing: "border-box",
  font: "inherit",
};

function buttonStyle(disabled = false): CSSProperties {
  return {
    height: 42,
    border: 0,
    borderRadius: 8,
    background: palette.accent,
    color: "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    font: "inherit",
    fontWeight: 800,
    opacity: disabled ? 0.55 : 1,
  };
}

const metricStyle: CSSProperties = {
  ...panelStyle,
  display: "grid",
  gap: 10,
  padding: 18,
};

const tableCellStyle: CSSProperties = {
  borderBottom: `1px solid ${palette.line}`,
  padding: "13px 10px",
  textAlign: "left",
  whiteSpace: "nowrap",
};

function Metric({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: CSSProperties;
}) {
  return (
    <article style={metricStyle}>
      <span style={{ color: palette.muted, fontSize: 13, fontWeight: 700 }}>
        {label}
      </span>
      <strong
        style={{
          fontSize: 25,
          lineHeight: 1.15,
          wordBreak: "break-word",
          ...valueStyle,
        }}
      >
        {value}
      </strong>
    </article>
  );
}

function App() {
  const isCompact = useCompactViewport();
  const [month, setMonth] = useState(currentMonth);
  const [recordMonth, setRecordMonth] = useState(currentMonth);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [assetTypeName, setAssetTypeName] = useState("");
  const [assetTypeDescription, setAssetTypeDescription] = useState("");
  const [recordAssetTypeId, setRecordAssetTypeId] = useState("");
  const [recordValue, setRecordValue] = useState("");
  const [recordNote, setRecordNote] = useState("");
  const [status, setStatus] = useState("准备就绪");
  const [statusType, setStatusType] = useState<"idle" | "error">("idle");

  const selectedAssetTypeId = useMemo(() => {
    if (recordAssetTypeId) return recordAssetTypeId;
    return assetTypes[0]?.id.toString() ?? "";
  }, [assetTypes, recordAssetTypeId]);

  async function loadAssetTypes() {
    const data = await request<{ items: AssetType[] }>("/api/asset-types");
    setAssetTypes(data.items);
    if (!recordAssetTypeId && data.items[0]) {
      setRecordAssetTypeId(data.items[0].id.toString());
    }
  }

  async function loadSummary(nextMonth = month) {
    const data = await request<PortfolioSummary>(
      `/api/summary?month=${encodeURIComponent(nextMonth)}`
    );
    setSummary(data);
  }

  async function refresh(message: string) {
    await loadAssetTypes();
    await loadSummary();
    setStatus(message);
    setStatusType("idle");
  }

  function showError(error: unknown) {
    setStatus(error instanceof Error ? error.message : "请求失败");
    setStatusType("error");
  }

  useEffect(() => {
    Promise.all([loadAssetTypes(), loadSummary()]).catch(showError);
  }, []);

  async function submitAssetType(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await request("/api/asset-types", {
        method: "POST",
        body: JSON.stringify({
          name: assetTypeName,
          description: assetTypeDescription,
        }),
      });
      setAssetTypeName("");
      setAssetTypeDescription("");
      await refresh("资产类型已添加");
    } catch (error) {
      showError(error);
    }
  }

  async function submitRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await request("/api/records", {
        method: "POST",
        body: JSON.stringify({
          assetTypeId: Number(selectedAssetTypeId),
          month: recordMonth,
          value: Number(recordValue),
          note: recordNote,
        }),
      });
      setRecordValue("");
      setRecordNote("");
      setRecordMonth(month);
      await refresh("月度价值已保存");
    } catch (error) {
      showError(error);
    }
  }

  async function changeMonth(nextMonth: string) {
    setMonth(nextMonth);
    setRecordMonth(nextMonth);
    try {
      await loadSummary(nextMonth);
      setStatus("统计月份已切换");
      setStatusType("idle");
    } catch (error) {
      showError(error);
    }
  }

  const totalValue = summary?.totalValue ?? 0;
  const totalPreviousValue = summary?.totalPreviousValue ?? 0;
  const totalChangeValue = summary?.totalChangeValue ?? 0;
  const totalChangeRate = summary?.totalChangeRate ?? null;
  const items = summary?.items ?? [];

  return (
    <main style={shellStyle(isCompact)}>
      <section
        aria-label="月份筛选"
        style={{ ...stackableRowStyle(isCompact), marginBottom: 20 }}
      >
        <div>
          <p
            style={{
              margin: "0 0 8px",
              color: palette.accent,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            本地 SQLite 资产台账
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: isCompact ? 36 : "clamp(32px, 5vw, 56px)",
              lineHeight: 1,
            }}
          >
            资产增值统计
          </h1>
        </div>
        <label style={{ ...fieldStyle, width: isCompact ? "100%" : 220 }}>
          <span>统计月份</span>
          <input
            type="month"
            value={month}
            onChange={(event) => changeMonth(event.target.value)}
            style={controlStyle}
          />
        </label>
      </section>

      <section
        aria-label="资产汇总"
        style={{ ...gridStyle("repeat(4, minmax(0, 1fr))", isCompact), marginBottom: 14 }}
      >
        <Metric label="当月总资产" value={formatCurrency(totalValue)} />
        <Metric label="前期对比值" value={formatCurrency(totalPreviousValue)} />
        <Metric
          label="增值金额"
          value={formatCurrency(totalChangeValue)}
          valueStyle={toneStyle(totalChangeValue)}
        />
        <Metric
          label="增值率"
          value={formatPercent(totalChangeRate)}
          valueStyle={toneStyle(totalChangeRate)}
        />
      </section>

      <section
        style={{
          ...gridStyle("0.85fr 1.15fr", isCompact),
          marginBottom: 14,
        }}
      >
        <form
          onSubmit={submitAssetType}
          style={{ ...panelStyle, display: "grid", alignContent: "start", gap: 16, padding: 18 }}
        >
          <div style={stackableRowStyle(isCompact)}>
            <h2 style={{ margin: 0, fontSize: 18 }}>资产类型</h2>
          </div>
          <label style={fieldStyle}>
            <span>名称</span>
            <input
              autoComplete="off"
              placeholder="现金 / 股票 / 房产"
              required
              value={assetTypeName}
              onChange={(event) => setAssetTypeName(event.target.value)}
              style={controlStyle}
            />
          </label>
          <label style={fieldStyle}>
            <span>备注</span>
            <input
              autoComplete="off"
              placeholder="可选"
              value={assetTypeDescription}
              onChange={(event) => setAssetTypeDescription(event.target.value)}
              style={controlStyle}
            />
          </label>
          <button type="submit" style={buttonStyle()}>
            添加类型
          </button>
        </form>

        <form
          onSubmit={submitRecord}
          style={{ ...panelStyle, display: "grid", alignContent: "start", gap: 16, padding: 18 }}
        >
          <div style={stackableRowStyle(isCompact)}>
            <h2 style={{ margin: 0, fontSize: 18 }}>记录月度价值</h2>
          </div>
          <label style={fieldStyle}>
            <span>资产类型</span>
            <select
              required
              disabled={assetTypes.length === 0}
              value={selectedAssetTypeId}
              onChange={(event) => setRecordAssetTypeId(event.target.value)}
              style={controlStyle}
            >
              {assetTypes.length === 0 ? (
                <option value="">先添加资产类型</option>
              ) : (
                assetTypes.map((assetType) => (
                  <option key={assetType.id} value={assetType.id}>
                    {assetType.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <label style={fieldStyle}>
            <span>月份</span>
            <input
              type="month"
              required
              value={recordMonth}
              onChange={(event) => setRecordMonth(event.target.value)}
              style={controlStyle}
            />
          </label>
          <label style={fieldStyle}>
            <span>价值</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              required
              value={recordValue}
              onChange={(event) => setRecordValue(event.target.value)}
              style={controlStyle}
            />
          </label>
          <label style={fieldStyle}>
            <span>备注</span>
            <input
              autoComplete="off"
              placeholder="可选"
              value={recordNote}
              onChange={(event) => setRecordNote(event.target.value)}
              style={controlStyle}
            />
          </label>
          <button type="submit" disabled={assetTypes.length === 0} style={buttonStyle(assetTypes.length === 0)}>
            保存记录
          </button>
        </form>
      </section>

      <section aria-label="资产明细" style={{ ...panelStyle, padding: 18 }}>
        <div style={stackableRowStyle(isCompact)}>
          <h2 style={{ margin: 0, fontSize: 18 }}>月度明细</h2>
          <p
            role="status"
            style={{
              minHeight: 20,
              margin: 0,
              color: statusType === "error" ? palette.danger : palette.muted,
              fontSize: 14,
            }}
          >
            {status}
          </p>
        </div>
        <div style={{ overflowX: "auto", marginTop: 14 }}>
          <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["资产类型", "月份", "当月价值", "对比月份", "增值金额", "增值率"].map(
                  (heading) => (
                    <th
                      key={heading}
                      style={{
                        ...tableCellStyle,
                        color: palette.muted,
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      ...tableCellStyle,
                      color: palette.muted,
                      textAlign: "center",
                    }}
                  >
                    当前月份还没有记录
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const changeStyle = toneStyle(item.changeValue);
                  return (
                    <tr key={item.id}>
                      <td style={tableCellStyle}>{item.assetTypeName}</td>
                      <td style={tableCellStyle}>{item.month}</td>
                      <td style={tableCellStyle}>{formatCurrency(item.value)}</td>
                      <td style={tableCellStyle}>{item.previousMonth || "--"}</td>
                      <td style={{ ...tableCellStyle, ...changeStyle }}>
                        {formatCurrency(item.changeValue)}
                      </td>
                      <td style={{ ...tableCellStyle, ...changeStyle }}>
                        {formatPercent(item.changeRate)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

const root = document.querySelector("#root");
if (!root) {
  throw new Error("React root element is missing");
}

applyPageStyle();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
