# assets-accretion

本地资产增值统计工具。后端使用 Bun + TypeScript + Hono，数据写入本地
SQLite 文件；前端使用 React 提供图形化录入和展示。

React 客户端入口位于 `src/client/main.tsx`，由 Bun 在 `/assets/app.js`
动态打包并通过 Hono 服务给浏览器。

## 项目结构

```text
src/
  server/    Hono API、服务监听入口和 SQLite 数据访问
  client/    React 页面和 HTML document 壳
tests/
  server/    服务端接口与客户端 bundle 服务测试
  server-db/ SQLite 数据层测试
```

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

项目通过 `.npmrc` 和 `bunfig.toml` 固定使用 npm 官方源
`https://registry.npmjs.org/` 安装依赖。

默认访问地址是 <http://localhost:3000>。

SQLite 默认文件位于 `data/assets.sqlite`，已加入 `.gitignore`。

## API

- `GET /api/asset-types`
- `POST /api/asset-types`
- `GET /api/records?month=YYYY-MM`
- `POST /api/records`
- `GET /api/summary?month=YYYY-MM`
