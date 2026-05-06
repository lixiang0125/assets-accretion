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
  - `main.tsx` 是客户端入口。
  - `document.tsx` 是服务端返回的 HTML document 壳。
- `src/server/`：服务端运行时代码。
  - `app.ts` 定义 Hono app、API 路由和客户端 bundle 服务。
  - `server.ts` 只负责读取端口并启动 `Bun.serve`。
  - `db/store.ts` 封装 SQLite 表结构、查询和汇总计算。
- `tests/`：测试代码。
  - `tests/server/` 覆盖 Hono app 与页面/bundle 服务。
  - `tests/server-db/` 覆盖 SQLite 数据层。

边界要求：

- 客户端不得直接访问 SQLite 或 `bun:sqlite`。
- 服务端可以服务 React document 和 bundle，但业务 UI 状态必须留在 `src/client/`。
- 测试不得放回 `src/` 根目录；保持运行时代码与验证代码分离。
- 不要为了当前规模引入更深目录层级，除非同类文件已经明显超过一个文件的承载能力。

## 数据与隐私

- 默认数据库路径是 `data/assets.sqlite`。
- `data/*.sqlite*`、`data/*.db*` 必须保持 git ignored。
- 数据不上传云端；页面通过本地 Hono API 读写 SQLite。
- 修改数据模型时，必须同时更新数据层测试和 `docs/knowledge-base/project-overview.md`。

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
- 网络请求留在事件处理或 effect 中，渲染阶段不得产生副作用。
- 用户输入渲染必须走 React 文本渲染，不使用 `innerHTML`。
- 保持控件可访问：输入框需要 label，按钮文案表达动作。

### 服务端

- `app.ts` 保持路由和错误处理集中。
- `server.ts` 保持薄入口，不放业务逻辑。
- 新增 API 时同步补测试，并在 README/API 文档中列出。

## 验证闭环

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
bun run dev
curl -s http://localhost:3000/api/health
curl -s -o /tmp/assets-accretion-root.html -w '%{http_code} %{content_type}\n' http://localhost:3000/
curl -s -o /tmp/assets-accretion-client.js -w '%{http_code} %{content_type}\n' http://localhost:3000/assets/app.js
```

## 提交前检查

- `git status --short --ignored` 中只有预期代码变更和 ignored 本地文件。
- lockfile 中不得出现 `bnpm`、`byted`、`npmmirror`、`taobao`。
- 数据库文件没有进入暂存区。
- 若项目结构、脚本、API 或数据契约变化，已同步更新 `docs/` 与 `README.md`。
