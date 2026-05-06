# assets-accretion

本地资产增值统计工具。后端使用 Bun + TypeScript + Hono，数据写入本地
SQLite 文件；前端使用 React 提供图形化录入和展示。

## 功能

- 添加资产类型，例如现金、股票、基金、房产。
- 每个资产类型只创建一次，按月份持续更新该类型的资产价值。
- 月度明细支持编辑和删除。
- 点击资产类型可在抽屉中查看月维度变化和折线趋势。
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

## 项目文档

- `AGENTS.md`：Agent 执行入口和仓库规则。
- `CLAUDE.md`：指向 `AGENTS.md` 的软链，避免并行维护两份规则。
- `docs/README.md`：规则库和知识库索引。
- `docs/rules/development-guide.md`：开发、架构边界、验证与提交要求。
- `docs/knowledge-base/project-overview.md`：技术栈、目录结构、数据模型和 API 说明。

## API

- `GET /api/health`
- `GET /api/asset-types`
- `POST /api/asset-types`
- `PUT /api/asset-types/:id`
- `GET /api/asset-types/:id/history`
- `GET /api/records?month=YYYY-MM`
- `POST /api/records`
- `PUT /api/records/:id`
- `DELETE /api/records/:id`
- `GET /api/summary?month=YYYY-MM`
