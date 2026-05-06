# 开发指引

本仓库是一个本地优先的资产增值统计工具。开发时优先保持结构清晰、依赖少、验证闭环明确。

## AI Coding 速查

默认执行顺序：

1. 先判断改动类型：客户端 UI、服务端 API、SQLite 数据层、测试、脚本配置、纯文档。
2. 先读相关文件再修改；涉及结构调整时同时更新 `docs/` 和 `README.md`。
3. 默认执行定向验证；失败时先修复再汇报。
4. 最终报告说明变更文件、验证命令和剩余风险。

常见场景：

| 场景 | 默认校验 | 追加校验 |
| --- | --- | --- |
| 修改 `src/client/**` | `bun test`、`bun run typecheck` | `bun build src/client/main.tsx --target browser --outfile /tmp/assets-accretion-client-check.js` |
| 修改 `src/server/**` | `bun test`、`bun run typecheck` | 启动 `bun run dev` 后 smoke `/api/health`、`/`、`/assets/app.js` |
| 修改 SQLite 数据层 | `bun test`、`bun run typecheck` | 增加或更新 `tests/server-db/` 覆盖边界 |
| 修改依赖或 registry | `bun install --registry https://registry.npmjs.org/`、`bun test`、`bun run typecheck` | 扫描 lockfile 确认无内部 registry |
| 纯文档 | 定向阅读检查 | 可跳过代码验证，但需说明原因 |

## 架构边界

- `src/client/`：浏览器端 React 应用。
  - `main.tsx` 只负责挂载 React。
  - `App/` 放客户端页面编排层；`App.tsx` 只做页面编排，不堆业务组件实现和样式。
  - `components/ui/` 放 shadcn/ui 风格基础组件，每个组件一个目录。
  - `components/dashboard/` 放资产台账业务组件，每个组件一个目录。
  - `components/operations/` 放操作记录、审计和恢复相关业务组件，每个组件一个目录。
  - `api/` 放浏览器端接口请求封装。
  - `hooks/` 放页面状态和业务动作。
  - `styles.css` 只作为样式入口，使用 `@import` 组织样式。
  - `styles/` 只放全局基础样式；页面级布局样式跟随页面组件目录。
  - 组件样式必须放到对应组件目录，例如 `components/dashboard/MetricCard/MetricCard.css`、`components/ui/Button/Button.css`。
  - `document.tsx` 是服务端返回的 HTML document 壳。
- `src/server/`：服务端运行时代码。
  - `app.ts` 只组装 Hono app、页面、静态资源、API 路由和错误处理。
  - `api/` 放 Hono API 路由和 HTTP 校验 helpers；资源目录的 `index.ts` 只组装路由，每个具体 endpoint 必须独立文件维护。
  - `server.ts` 只负责读取端口并启动 `Bun.serve`。
  - `db/store.ts` 封装 SQLite 表结构、查询和汇总计算。
- `tests/`：测试代码。
  - `tests/server/` 覆盖 Hono app 与页面/bundle 服务。
  - `tests/server-db/` 覆盖 SQLite 数据层。

边界要求：

- 客户端不得直接访问 SQLite 或 `bun:sqlite`。
- 服务端可以服务 React document 和 bundle，但业务 UI 状态必须留在 `src/client/`。
- 业务组件不得直接复制 shadcn/Radix 细节；优先组合 `components/ui/` 下的基础组件。
- 新增较大的页面区块时，先放入独立业务组件目录；不要继续扩张 `App/App.tsx` 或 `main.tsx`。
- 每个组件目录应包含组件实现、同名 CSS（如需要）和 `index.ts` 导出；外部调用优先 import 组件目录，不直接依赖内部文件路径。
- 样式优先写入组件同目录 CSS 文件；`styles.css` 不承载具体组件样式，只维护 import 顺序。
- 新增组件时同步评估是否需要同目录 CSS 文件；不要把业务组件样式堆入全局或其他组件 CSS。
- 只允许为动态、极小且不可复用的样式使用内联 style。
- 拆分 CSS 后必须保证 `/assets/styles.css` 引用到的 `@import` 路径也能由服务端静态路由访问，并补静态资源测试。
- 金额展示必须通过 `src/client/lib/format.ts` 的统一格式化函数；超过 1000 的金额用 K/M/B 缩写并保留两位小数，不要在组件里手写本地规则。
- 后端接口逻辑必须放在 `src/server/api/`，`app.ts` 不承载具体业务路由实现。
- 后端每个接口必须单独文件维护，例如 `records/create-record.ts`、`records/delete-record.ts`；不要把同一资源的多个 endpoint 继续堆在一个大文件里。
- Hono app 必须通过 `createApp(store)` 支持注入 `AssetStore`；不要在测试路径 import 时隐式打开默认 `data/assets.sqlite`。
- 默认 SQLite store 只能在运行入口或显式默认 app 工厂中创建，避免模块加载副作用污染本地账本。
- 测试不得放回 `src/` 根目录；保持运行时代码与验证代码分离。
- 不要为了当前规模引入更深目录层级，除非同类文件已经明显超过一个文件的承载能力。

## 数据与隐私

- 默认数据库路径是 `data/assets.sqlite`。
- `data/*.sqlite*`、`data/*.db*` 必须保持 git ignored。
- 数据不上传云端；页面通过本地 Hono API 读写 SQLite。
- 业务时间统一采用东八区（GMT+8）时间；SQLite 写入不得使用 UTC 默认 `datetime('now')`，前端默认月份也不能依赖运行机器本地时区。
- 修改数据模型时，必须同时更新数据层测试和 `docs/knowledge-base/project-overview.md`。
- 删除、批量更新、恢复等高风险数据操作必须先写清楚恢复策略，并在 UI 上提供明确的二次确认或状态反馈。
- 可恢复删除必须写入操作日志，日志中保留足够恢复的操作前快照；恢复时不得覆盖用户后续新建或更新的数据。
- 资产类型是全局维度，不能为了让某个月显示该类型而重复创建资产类型或插入无价值的占位记录；月度视图应使用 `hasRecord: false` 这类状态表达未记录。
- 增值金额和增值率必须有明确对比月份；新增或修改汇总逻辑时，要同时覆盖默认最近历史对比和指定任意月份对比。
- 自动化测试、接口 smoke、浏览器冒烟测试必须使用临时 SQLite 路径，例如 `ASSETS_DB_PATH=/tmp/assets-accretion-e2e.sqlite`。
- 如果验证过程误写入默认 `data/assets.sqlite`，必须只清理自己生成且可精确识别的测试数据，并在最终报告中说明。

## 依赖与包管理

- 使用 Bun 运行、安装和测试。
- `.npmrc` 与 `bunfig.toml` 固定 registry 为 `https://registry.npmjs.org/`。
- 不要使用内部 `bnpm` 或其他镜像源生成 lockfile。
- 新增依赖前先确认标准库、Bun、Hono、React 是否已经足够。

## 代码规范

### TypeScript

- 避免 `any`，优先定义具体类型。
- API 入参必须做运行时校验，不只依赖 TypeScript。
- 数据库 row 类型与 API/domain 类型分离，避免把 snake_case 泄露到客户端。

### React

- 使用函数式组件与 hooks。
- 使用 `components/ui/` 中的 shadcn/ui 风格组件作为表单、按钮、表格、抽屉等基础控件。
- 每个业务组件单独文件维护，组件 props 明确表达依赖，避免通过全局状态或跨层 import 偷懒。
- 网络请求留在事件处理或 effect 中，渲染阶段不得产生副作用。
- 用户输入渲染必须走 React 文本渲染，不使用 `innerHTML`。
- 保持控件可访问：输入框需要 label，按钮文案表达动作。
- 删除按钮不得直接执行 API 调用；必须先打开二次确认弹窗，再由确认动作触发删除。
- 操作记录、恢复、审计类页面应放在独立业务组件和 hook 中，不要堆入 `App.tsx` 或明细表组件。

### 服务端

- `app.ts` 保持 app 组装和错误处理集中。
- `api/` 保持接口逻辑集中，按资源拆分路由文件。
- `db/store.ts` 只放 SQLite schema、查询和领域计算；不要把 Hono `Context`、HTTP 状态码或请求体解析放进数据库层。
- `server.ts` 保持薄入口，不放业务逻辑。
- 新增 API 时同步补测试，并在 README/API 文档中列出。
- 删除和恢复接口必须覆盖重复删除、重复恢复、冲突恢复、非法 id、不可恢复日志等失败路径。
- 服务端测试应创建临时 store 并传入 `createApp(store)`；不得复用默认 app 单例或共享默认数据库。

## 验证闭环

测试要求：

- 测试目标是发现问题，不是只证明 happy path 能跑。
- 新增或修改 API 时，至少覆盖成功路径、输入校验失败、资源不存在、唯一约束/冲突和状态变化后的再次查询。
- 新增或修改 SQLite 行为时，至少覆盖边界月份、删除/更新后的对比关系、空结果和特殊数值，例如上期值为 `0`。
- 涉及操作记录时，不能只验证日志数量；还要验证 `beforePayload`/`afterPayload`、`reversible`、`restoredAt` 和恢复后的业务查询结果。
- 涉及展示格式时，给纯格式化函数补单元测试，覆盖边界值、负数和缩写单位。
- 静态资源和页面壳测试要断言关键响应头与资源引用，避免 CSS/JS 缓存或漏挂载问题再次出现。
- 不要只断言 HTTP 状态码；还要断言响应体、数据库结果或汇总结果确实符合预期。

提交前默认执行：

```bash
bun test
bun run typecheck
```

涉及客户端入口、React 页面或 bundle 服务时追加：

```bash
bun build src/client/main.tsx --target browser --outfile /tmp/assets-accretion-client-check.js
```

涉及运行入口或 API 时追加 smoke：

```bash
ASSETS_DB_PATH=/tmp/assets-accretion-smoke.sqlite PORT=3018 bun src/server/server.ts
curl -s http://localhost:3018/api/health
curl -s -o /tmp/assets-accretion-root.html -w '%{http_code} %{content_type}\n' http://localhost:3018/
curl -s -o /tmp/assets-accretion-client.js -w '%{http_code} %{content_type}\n' http://localhost:3018/assets/app.js
```

Smoke 规则：

- 如果默认端口 `3000` 已有服务，使用其他端口；不要随意停止用户已有进程。
- API 和浏览器冒烟都必须显式设置 `ASSETS_DB_PATH` 到 `/tmp` 下的临时文件。
- 冒烟结束后清理 `/tmp/assets-accretion-*.sqlite*` 和 `/tmp/assets-accretion-*.js/html` 临时产物。
- Playwright 严格模式下选择器要限定到具体区域或行，避免同一文本同时出现在汇总卡、表格和图表导致误判。

## 提交前检查

- `git status --short --ignored` 中只有预期代码变更和 ignored 本地文件。
- lockfile 中不得出现 `bnpm`、`byted`、`npmmirror`、`taobao`。
- 数据库文件没有进入暂存区。
- 提交前用 `git diff --cached --name-only` 确认暂存区只包含预期源码、测试和文档文件。
- 若项目结构、脚本、API 或数据契约变化，已同步更新 `docs/` 与 `README.md`。
