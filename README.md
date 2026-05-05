# assets-accretion

本地资产增值统计工具。后端使用 Bun + TypeScript + Hono，数据写入本地
SQLite 文件；前端使用原生 HTML/CSS/JS 提供图形化录入和展示。

## 功能

- 添加资产类型，例如现金、股票、基金、房产。
- 按月份记录每类资产价值。
- 自动查找同资产类型的上一个记录月份，计算增值金额和增值率。
- 汇总指定月份的总资产、前期对比值、总增值金额和总增值率。

## 开发

```bash
bun install
bun run dev
```

默认访问地址是 <http://localhost:3000>。

SQLite 默认文件位于 `data/assets.sqlite`，已加入 `.gitignore`。

## API

- `GET /api/asset-types`
- `POST /api/asset-types`
- `GET /api/records?month=YYYY-MM`
- `POST /api/records`
- `GET /api/summary?month=YYYY-MM`
