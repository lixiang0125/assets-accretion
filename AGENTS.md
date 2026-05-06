# 核心要求

本文件是仓库规则与 Agent 执行契约的唯一入口。详细规则与项目知识库拆分到 `docs/`，但入口仍以本文件为准；`CLAUDE.md` 应通过软链指向本文件，避免并行维护两份规则。

## 必读文档

开始工作前，按需阅读以下文档：

1. `docs/README.md`：文档索引与推荐阅读顺序。
2. `docs/rules/development-guide.md`：开发规则、架构边界、验证与提交要求。
3. `docs/knowledge-base/project-overview.md`：项目概览、技术栈、目录结构、数据与 API 约定。
4. `docs/experience.md`：开发经验、踩坑背景、用户偏好与后续维护提醒。

## 强制要求

- Always：Reconnaissance -> Plan -> Execute -> Verify -> Report。
- Read-before-write；write-then-reread。修改后必须重新检查关键文件和验证结果。
- 代码边界保持清晰：浏览器端放在 `src/client/`，服务端放在 `src/server/`，测试放在 `tests/`。
- SQLite 数据只保存在本地 `data/assets.sqlite`，数据库文件不得提交到 git。
- 安装依赖必须使用 npm 官方源 `https://registry.npmjs.org/`，不得使用内部 registry。
- 修改项目结构、运行脚本、数据契约或关键约定时，必须同步更新 `docs/` 和 `README.md`。
- 开发中发现可复用经验、重复踩坑、用户新增偏好或验证方式时，必须主动追加到 `docs/experience.md`；新增分类时同步更新 `docs/README.md` 的索引。
- 提交前必须至少运行 `bun test` 和 `bun run typecheck`；涉及客户端入口时补跑 `bun build src/client/main.tsx --target browser --outfile /tmp/assets-accretion-client-check.js`。

## 禁止行为

- 禁止把生成的 SQLite 文件、`.omx/`、`node_modules/` 提交到 git。
- 禁止重新引入静态 `public/index.html`、`public/styles.css`、`public/app.js` 作为前端主实现；前端必须由 React 构建。
- 禁止新增依赖前不说明必要性；当前项目优先使用 Bun、Hono、React 与标准库能力。
- 禁止使用 `any` 掩盖类型不清晰的问题，优先定义具体类型。
