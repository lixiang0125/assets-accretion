# 项目概述

## 项目目标

`assets-accretion` 是一个本地资产增值统计工具。用户可以：

- 添加资产分组，再添加资产类型，例如现金、股票、基金、房产，并为资产类型选择已有分组。
- 点击资产类型后，可在资产历史抽屉中修改当前资产类型名称、分组和备注，也可二次确认后删除该资产类型。
- 每个资产类型只创建一次，按月份持续更新该类型的资产价值。
- 每个月的明细都会展示所有资产类型；未写入当月记录的资产类型显示为待记录，而不是要求重新创建资产类型，统计总资产时沿用该类型最近一次记录。
- 编辑或删除已保存的月度明细。
- 删除月度明细前必须二次确认。
- 通过操作记录页面查询每次创建、更新、删除和恢复动作。
- 对删除的月度明细，从操作记录中恢复删除前快照。
- 在月度明细上方查看总资产按月汇总的折线趋势。
- 查看资产分组维度的统计值、对比值、增值金额和增值率。
- 点击资产类型，在抽屉中查看月维度变化和折线趋势。
- 默认对比同一资产类型的上一个记录月份，也支持选择任意对比月份。
- 查看指定月份的总资产、前期对比值、增值金额和增值率；当月未更新的资产类型按最近历史记录纳入总资产。
- 查看指定月份的分组汇总；分组汇总同样使用最近历史记录作为缺失月份的统计值。
- 增值金额和增值率必须标记其对比时间点，避免只展示结果不知道对比口径。
- 金额超过 1000 时使用 K/M/B 缩写并保留两位小数，避免长金额挤占表格和图表空间。

核心约束：

- 数据只保存在本地 SQLite 文件中。
- 所有业务时间采用东八区（GMT+8）墙钟时间，不使用 UTC 0 时区时间。
- 页面通过本地 Hono API 与数据层通信。
- 前端使用 React，不使用静态 HTML/CSS/JS 作为主实现。

## 技术栈

- 运行时：Bun
- 服务端：Hono + TypeScript
- 数据库：Bun 内置 `bun:sqlite`
- 客户端：React + React DOM + shadcn/ui 风格本地组件
- UI 基础：Radix UI primitives + class-variance-authority + clsx + tailwind-merge
- 测试：`bun test`
- 包源：npm 官方 registry `https://registry.npmjs.org/`

## 目录结构

```text
src/
  client/
    App/               客户端页面编排层
    api/               浏览器端 API 请求封装
    components/
      dashboard/       业务组件目录；每个组件自带 tsx/css/index
      operations/      操作记录业务组件目录；每个组件自带 tsx/css/index
      ui/              shadcn/ui 风格基础组件目录；每个组件自带 tsx/css/index
    document.tsx       React 渲染的 HTML document 壳
    hooks/             页面状态和业务动作 hooks
    lib/               格式化、样式组合等纯工具
    main.tsx           浏览器端 React 应用入口
    styles.css         CSS 入口，只维护 @import 顺序
    styles/            全局基础样式
    types.ts           客户端领域类型
  server/
    api/               Hono API 路由；每个 endpoint 一个文件，资源 index 只负责组装
    app.ts             Hono app 工厂、页面、静态资源和 API 组装
    server.ts          Bun.serve 监听入口
    db/
      store.ts         SQLite store 装配入口，保持 createAssetStore 对外 API
      schema.ts        SQLite schema 初始化与兼容迁移
      mappers.ts       SQLite row 到领域对象的映射
      asset-groups.ts  资产分组查询与写入
      asset-types.ts   资产类型查询、更新与级联删除快照
      records.ts       月度记录写入、删除和恢复
      operation-logs.ts 操作日志查询与写入
      summary.ts       汇总、历史和趋势读模型
tests/
  server/
    *.test.ts          Hono app、document、bundle 和 API 场景测试
    helpers.ts         每个测试文件独立创建系统临时目录 SQLite app
  server-db/
    *.test.ts          SQLite 数据层场景测试
    helpers.ts         只允许在系统临时目录创建 assets-accretion-*.sqlite 临时库
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

| 命令                | 作用                |
| ------------------- | ------------------- |
| `bun run dev`       | 热重载启动本地服务  |
| `bun run start`     | 启动本地服务        |
| `bun test`          | 运行测试            |
| `bun run typecheck` | TypeScript 类型检查 |

## 数据模型

SQLite 默认文件：`data/assets.sqlite`

时间口径：`created_at`、`updated_at`、`restored_at` 等业务时间统一写入东八区（GMT+8）时间字符串。前端默认月份也按东八区计算，避免运行环境本地时区不同导致月份偏移。

### `asset_groups`

| 字段         | 类型    | 说明             |
| ------------ | ------- | ---------------- |
| `id`         | INTEGER | 主键             |
| `name`       | TEXT    | 资产分组名，唯一 |
| `created_at` | TEXT    | 创建时间         |

### `asset_types`

| 字段          | 类型    | 说明                         |
| ------------- | ------- | ---------------------------- |
| `id`          | INTEGER | 主键                         |
| `name`        | TEXT    | 资产类型名称，唯一           |
| `description` | TEXT    | 可选备注                     |
| `group_id`    | INTEGER | 可选资产分组，关联分组表     |
| `group_name`  | TEXT    | 旧版本迁移辅助字段，不再写入 |
| `created_at`  | TEXT    | 创建时间                     |

### `asset_records`

| 字段            | 类型    | 说明                 |
| --------------- | ------- | -------------------- |
| `id`            | INTEGER | 主键                 |
| `asset_type_id` | INTEGER | 关联资产类型         |
| `month`         | TEXT    | 月份，格式 `YYYY-MM` |
| `value`         | REAL    | 当月资产价值，非负   |
| `note`          | TEXT    | 可选备注             |
| `created_at`    | TEXT    | 创建时间             |
| `updated_at`    | TEXT    | 更新时间             |

约束：

- 同一资产类型同一月份只有一条记录。
- 资产分组先写入 `asset_groups`，资产类型通过 `asset_types.group_id` 选择已有分组；为空时前端展示为未分组。
- 删除资产类型时级联删除对应月度记录；该操作会写入操作日志快照，但当前不提供一键恢复。
- 增值对比取同一资产类型中早于当前月份的最近一条记录。
- 月度汇总接口会按资产类型展开指定月份视图，未记录当月价值的资产类型返回 `hasRecord: false`、`value: null`，同时返回用于统计的 `effectiveValue`/`effectiveMonth`；这些沿用值来自目标月份之前最近一次记录，但不会自动向 `asset_records` 插入空记录。
- 月度汇总响应同时返回 `groups`，按资产类型分组聚合 `effectiveValue`、对比值、增值金额和增值率；没有分组的资产类型归入 `groupName: null`。

### `operation_logs`

| 字段             | 类型    | 说明                                               |
| ---------------- | ------- | -------------------------------------------------- |
| `id`             | INTEGER | 主键                                               |
| `action`         | TEXT    | 操作类型，例如 `record_deleted`、`record_restored` |
| `entity_type`    | TEXT    | 操作对象类型                                       |
| `entity_id`      | INTEGER | 操作对象 id                                        |
| `entity_label`   | TEXT    | 页面可读对象名称                                   |
| `summary`        | TEXT    | 操作摘要                                           |
| `before_payload` | TEXT    | 操作前快照 JSON                                    |
| `after_payload`  | TEXT    | 操作后快照 JSON                                    |
| `reversible`     | INTEGER | 是否可恢复                                         |
| `restored_at`    | TEXT    | 删除操作被恢复的时间                               |
| `source_log_id`  | INTEGER | 恢复操作对应的原删除日志                           |
| `created_at`     | TEXT    | 操作发生时间                                       |

约束：

- 所有资产分组创建、资产类型创建/更新、月度记录创建/更新/删除/恢复都要写入操作记录。
- `asset_type_deleted` 会保存资产类型和其删除前月度记录快照，但标记为不可恢复。
- `record_deleted` 必须保存删除前快照，且标记为可恢复。
- 恢复删除记录时，如果原资产类型不存在、原记录 id 已存在，或同一资产类型同一月份已存在记录，则拒绝恢复，避免覆盖当前账本。
- 恢复成功后需要回写原删除日志的 `restored_at`，防止重复恢复。

## API

| Method   | Path                                                  | 说明                                                      |
| -------- | ----------------------------------------------------- | --------------------------------------------------------- |
| `GET`    | `/api/health`                                         | 健康检查                                                  |
| `GET`    | `/api/asset-groups`                                   | 获取资产分组                                              |
| `POST`   | `/api/asset-groups`                                   | 新增资产分组                                              |
| `GET`    | `/api/asset-types`                                    | 获取资产类型                                              |
| `POST`   | `/api/asset-types`                                    | 新增资产类型，可包含 `groupId`                            |
| `PUT`    | `/api/asset-types/:id`                                | 更新资产类型名称、分组和备注                              |
| `DELETE` | `/api/asset-types/:id`                                | 删除资产类型，并级联删除该类型下的月度记录                |
| `GET`    | `/api/asset-types/:id/history`                        | 获取单个资产类型的月度变化历史                            |
| `GET`    | `/api/records?month=YYYY-MM`                          | 获取月度记录                                              |
| `POST`   | `/api/records`                                        | 新增或更新某资产类型某月份价值                            |
| `PUT`    | `/api/records/:id`                                    | 编辑已保存的月度记录                                      |
| `DELETE` | `/api/records/:id`                                    | 删除已保存的月度记录                                      |
| `GET`    | `/api/operation-logs?action=record_deleted&limit=100` | 查询操作记录，`action` 可选，`limit` 范围 1 到 500        |
| `POST`   | `/api/operation-logs/:id/restore`                     | 恢复可逆的删除操作                                        |
| `GET`    | `/api/summary?month=YYYY-MM&compareMonth=YYYY-MM`     | 获取指定月份汇总、分组汇总与增值明细，`compareMonth` 可选 |
| `GET`    | `/api/summary/trend`                                  | 获取各月份总资产汇总趋势                                  |

## 关键设计决策

- 本地优先：SQLite 文件默认落在 `data/`，并通过 `.gitignore` 避免提交。
- 轻量依赖：SQLite 使用 Bun 标准能力，不额外引入 ORM。
- 清晰边界：客户端、服务端、测试分目录维护；前端组件、样式、API 请求和状态 hook 分层放置；后端 API 路由与 SQLite store 分离，且每个后端 endpoint 独立文件维护。
- 数据库模块按职责拆分：`store.ts` 只负责创建数据库、初始化 schema 并组合查询模块；具体 SQL 分散到资产分组、资产类型、月度记录、操作日志和汇总读模型文件，避免单文件继续膨胀。
- 测试数据隔离：`tests/server/` 与 `tests/server-db/` helper 都显式在系统临时目录创建 `assets-accretion-*.sqlite` 临时库并在每个测试后清理主库、`-wal` 和 `-shm` 文件；helper 会断言路径前缀，避免误写默认 `data/assets.sqlite`。
- shadcn/ui 本地化：`src/client/components/ui/` 保存可维护的 shadcn/ui 风格组件源码，业务组件只组合这些基础组件，不直接复制 Radix 细节。
- 组件目录内聚：`src/client/styles.css` 只作为 CSS 入口；业务组件和基础 UI 组件都以独立目录维护实现、样式和 `index.ts` 导出，避免继续形成平铺组件和单个大 CSS 文件。
- 可注入 app：`createApp(store)` 是刻意保留的测试隔离点，测试和冒烟验证应传入临时 SQLite store，避免写入真实本地账本。
- 动态 bundle：当前由 Hono 在 `/assets/app.js` 请求时调用 `Bun.build` 打包客户端，适合本地开发；未来如需生产部署，可改为固定 build 产物和缓存策略。
- 删除可审计：月度记录删除会通过操作日志保存快照并支持恢复；资产类型删除会级联删除其月度记录，操作日志保留删除前快照用于审计，但当前不提供一键恢复。
- 展示层压缩金额：压缩只发生在客户端展示层，数据库和 API 仍保存完整数字，避免精度和计算逻辑被展示格式污染。
- 分组独立创建后再被资产类型引用：资产分组有独立表和创建入口，资产类型只保存可选 `group_id`；未分组通过 `null` 表达，展示层负责显示为“未分组”。
- 月份视图不复制资产类型：资产类型是全局维度，月份视图只是展开所有资产类型及其当月记录状态；不存在的月度价值用空状态表达，并通过 `effectiveValue` 沿用最近历史值参与统计，不通过创建占位记录污染数据表。
- 统一东八区时间：SQLite 写入时显式使用 GMT+8 时间表达，而不是依赖 `datetime('now')` 的 UTC 默认值或运行机器本地时区。
- 显式对比口径：`compareMonth` 是汇总接口的一等查询条件。未指定时沿用最近历史记录；指定后只对比该月份记录，不用其他月份兜底。
