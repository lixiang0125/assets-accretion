# 项目概述

## 项目目标

`assets-accretion` 是一个本地资产增值统计工具。用户可以：

- 添加资产类型，例如现金、股票、基金、房产。
- 每个资产类型只创建一次，按月份持续更新该类型的资产价值。
- 编辑或删除已保存的月度明细。
- 点击资产类型，在抽屉中查看月维度变化和折线趋势。
- 自动对比同一资产类型的上一个记录月份。
- 查看指定月份的总资产、前期对比值、增值金额和增值率。

核心约束：

- 数据只保存在本地 SQLite 文件中。
- 页面通过本地 Hono API 与数据层通信。
- 前端使用 React，不使用静态 HTML/CSS/JS 作为主实现。

## 技术栈

- 运行时：Bun
- 服务端：Hono + TypeScript
- 数据库：Bun 内置 `bun:sqlite`
- 客户端：React + React DOM
- 测试：`bun test`
- 包源：npm 官方 registry `https://registry.npmjs.org/`

## 目录结构

```text
src/
  client/
    document.tsx       React 渲染的 HTML document 壳
    main.tsx           浏览器端 React 应用入口
  server/
    app.ts             Hono app、API 路由、React bundle 服务
    server.ts          Bun.serve 监听入口
    db/
      store.ts         SQLite schema、数据访问与增值计算
tests/
  server/
    server.test.ts     Hono app、document、bundle 服务测试
  server-db/
    store.test.ts      SQLite 数据层测试
data/
  .gitkeep             保留数据目录；SQLite 文件 ignored
```

## 运行方式

```bash
bun install
bun run dev
```

默认服务地址：`http://localhost:3000`

常用脚本：

| 命令 | 作用 |
| --- | --- |
| `bun run dev` | 热重载启动本地服务 |
| `bun run start` | 启动本地服务 |
| `bun test` | 运行测试 |
| `bun run typecheck` | TypeScript 类型检查 |

## 数据模型

SQLite 默认文件：`data/assets.sqlite`

### `asset_types`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | INTEGER | 主键 |
| `name` | TEXT | 资产类型名称，唯一 |
| `description` | TEXT | 可选备注 |
| `created_at` | TEXT | 创建时间 |

### `asset_records`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | INTEGER | 主键 |
| `asset_type_id` | INTEGER | 关联资产类型 |
| `month` | TEXT | 月份，格式 `YYYY-MM` |
| `value` | REAL | 当月资产价值，非负 |
| `note` | TEXT | 可选备注 |
| `created_at` | TEXT | 创建时间 |
| `updated_at` | TEXT | 更新时间 |

约束：

- 同一资产类型同一月份只有一条记录。
- 删除资产类型时级联删除对应月度记录。
- 增值对比取同一资产类型中早于当前月份的最近一条记录。

## API

| Method | Path | 说明 |
| --- | --- | --- |
| `GET` | `/api/health` | 健康检查 |
| `GET` | `/api/asset-types` | 获取资产类型 |
| `POST` | `/api/asset-types` | 新增资产类型 |
| `PUT` | `/api/asset-types/:id` | 更新资产类型名称和备注 |
| `GET` | `/api/asset-types/:id/history` | 获取单个资产类型的月度变化历史 |
| `GET` | `/api/records?month=YYYY-MM` | 获取月度记录 |
| `POST` | `/api/records` | 新增或更新某资产类型某月份价值 |
| `PUT` | `/api/records/:id` | 编辑已保存的月度记录 |
| `DELETE` | `/api/records/:id` | 删除已保存的月度记录 |
| `GET` | `/api/summary?month=YYYY-MM` | 获取指定月份汇总与增值明细 |

## 关键设计决策

- 本地优先：SQLite 文件默认落在 `data/`，并通过 `.gitignore` 避免提交。
- 轻量依赖：SQLite 使用 Bun 标准能力，不额外引入 ORM。
- 清晰边界：客户端、服务端、测试分目录维护。
- 动态 bundle：当前由 Hono 在 `/assets/app.js` 请求时调用 `Bun.build` 打包客户端，适合本地开发；未来如需生产部署，可改为固定 build 产物和缓存策略。
