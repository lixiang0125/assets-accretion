const formatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("zh-CN", {
  style: "percent",
  maximumFractionDigits: 2,
});

const elements = {
  monthFilter: document.querySelector("#monthFilter"),
  recordMonth: document.querySelector("#recordMonth"),
  assetTypeForm: document.querySelector("#assetTypeForm"),
  assetTypeName: document.querySelector("#assetTypeName"),
  assetTypeDescription: document.querySelector("#assetTypeDescription"),
  recordForm: document.querySelector("#recordForm"),
  recordAssetType: document.querySelector("#recordAssetType"),
  recordValue: document.querySelector("#recordValue"),
  recordNote: document.querySelector("#recordNote"),
  totalValue: document.querySelector("#totalValue"),
  previousValue: document.querySelector("#previousValue"),
  changeValue: document.querySelector("#changeValue"),
  changeRate: document.querySelector("#changeRate"),
  summaryRows: document.querySelector("#summaryRows"),
  statusMessage: document.querySelector("#statusMessage"),
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatCurrency(value) {
  return value === null || value === undefined ? "--" : formatter.format(value);
}

function formatPercent(value) {
  return value === null || value === undefined ? "--" : percentFormatter.format(value);
}

function classForValue(value) {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "";
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "请求失败");
  }
  return data;
}

function setStatus(message, isError = false) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.style.color = isError ? "var(--danger)" : "var(--muted)";
}

async function loadAssetTypes() {
  const data = await request("/api/asset-types");
  elements.recordAssetType.innerHTML = "";

  if (data.items.length === 0) {
    const option = document.createElement("option");
    option.textContent = "先添加资产类型";
    option.value = "";
    elements.recordAssetType.append(option);
    elements.recordAssetType.disabled = true;
    return;
  }

  elements.recordAssetType.disabled = false;
  for (const item of data.items) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    elements.recordAssetType.append(option);
  }
}

function renderSummary(summary) {
  elements.totalValue.textContent = formatCurrency(summary.totalValue);
  elements.previousValue.textContent = formatCurrency(summary.totalPreviousValue);
  elements.changeValue.textContent = formatCurrency(summary.totalChangeValue);
  elements.changeValue.className = classForValue(summary.totalChangeValue);
  elements.changeRate.textContent = formatPercent(summary.totalChangeRate);
  elements.changeRate.className = classForValue(summary.totalChangeRate);

  elements.summaryRows.innerHTML = "";
  if (summary.items.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.className = "empty";
    cell.colSpan = 6;
    cell.textContent = "当前月份还没有记录";
    row.append(cell);
    elements.summaryRows.append(row);
    return;
  }

  for (const item of summary.items) {
    const row = document.createElement("tr");
    const changeClass = classForValue(item.changeValue);
    const values = [
      item.assetTypeName,
      item.month,
      formatCurrency(item.value),
      item.previousMonth || "--",
      formatCurrency(item.changeValue),
      formatPercent(item.changeRate),
    ];

    for (const [index, value] of values.entries()) {
      const cell = document.createElement("td");
      cell.textContent = value;
      if (index >= 4) {
        cell.className = changeClass;
      }
      row.append(cell);
    }
    elements.summaryRows.append(row);
  }
}

async function loadSummary() {
  const month = elements.monthFilter.value;
  const summary = await request(`/api/summary?month=${encodeURIComponent(month)}`);
  renderSummary(summary);
}

async function refresh(message) {
  await loadAssetTypes();
  await loadSummary();
  setStatus(message || "数据已刷新");
}

elements.assetTypeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await request("/api/asset-types", {
      method: "POST",
      body: JSON.stringify({
        name: elements.assetTypeName.value,
        description: elements.assetTypeDescription.value,
      }),
    });
    elements.assetTypeForm.reset();
    await refresh("资产类型已添加");
  } catch (error) {
    setStatus(error.message, true);
  }
});

elements.recordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await request("/api/records", {
      method: "POST",
      body: JSON.stringify({
        assetTypeId: Number(elements.recordAssetType.value),
        month: elements.recordMonth.value,
        value: Number(elements.recordValue.value),
        note: elements.recordNote.value,
      }),
    });
    elements.recordForm.reset();
    elements.recordMonth.value = elements.monthFilter.value;
    await refresh("月度价值已保存");
  } catch (error) {
    setStatus(error.message, true);
  }
});

elements.monthFilter.addEventListener("change", async () => {
  elements.recordMonth.value = elements.monthFilter.value;
  try {
    await loadSummary();
    setStatus("统计月份已切换");
  } catch (error) {
    setStatus(error.message, true);
  }
});

elements.monthFilter.value = currentMonth();
elements.recordMonth.value = elements.monthFilter.value;
refresh("准备就绪").catch((error) => setStatus(error.message, true));
