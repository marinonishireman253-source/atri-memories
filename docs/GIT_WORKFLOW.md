# Git 标准体系

这份规则用于让 ATRI Memories 的改动可追踪、可验证、可回滚。所有代码、样式、数据库迁移、部署脚本和文档改动都按同一套流程处理。

## 分支规则

- `main` 是受保护主线，只保留已验证、可部署的状态。
- 日常开发从 `main` 拉新分支，不直接在 `main` 上堆多项改动。
- 分支名使用小写英文、数字和短横线，格式为 `<类型>/<简短主题>`。
- 推荐类型：`codex`、`feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`build`、`ci`、`chore`、`release`、`hotfix`。
- 示例：`codex/git-standard`、`fix/blog-tags`、`perf/gallery-cache`、`release/2026-06-30`。
- 一条分支只解决一个目标。移动端适配、博客数据修复、部署脚本调整应拆成不同分支。

## 开工前流程检查

开始实现、合并、发布或交接前，先运行：

```bash
npm run flow:doctor
```

它只读取本地 Git、worktree、`main...origin/main` 和依赖目录状态，不会 pull、push、merge、stash 或改动文件。默认模式用于日常开工：发现脏工作区、远端分叉或缺依赖时会给出下一步建议，但不阻断普通开发。

合并、发布或交接前使用严格模式：

```bash
npm run flow:doctor -- --strict
```

严格模式遇到未提交改动、`main` 与 `origin/main` 分叉、两条主线没有共同祖先、Node 依赖缺失或 Git 状态不可判定时会失败退出。先处理这些流程风险，再运行构建、doctor、smoke 或发布命令。

如果 `flow:doctor` 报告 `main` 与 `origin/main` 没有共同祖先，说明远端可能是独立公开快照历史。此时不要用普通 `git pull` 或 `git merge origin/main` 强行混合两条主线；先阅读 [公开仓库双轨流程](./PUBLIC_REPO_WORKFLOW.md)，并运行：

```bash
npm run public:snapshot:doctor
```

确认目标是继续维护本地完整历史、更新公开快照主线，还是重建远端公开仓库。

## 提交规则

- 提交标题使用 Conventional Commits：`<类型>(可选范围): <说明>`。
- 标题最长 72 个字符，使用动词开头，描述实际改动结果。
- 常用类型：`feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`build`、`ci`、`chore`、`revert`。
- 示例：`fix(blog): remove stale anime tag`、`ci: run verification on pull requests`。
- 一个提交应保持可审查：同一提交里不要混入无关 UI、数据、脚本和文档改动。

## 合并前检查

每个准备合并的分支至少执行：

```bash
npm run flow:doctor -- --strict
npm run git:check
npm run check
npm run build
```

涉及 Supabase Edge Functions、数据库迁移、部署或上线前收口时，继续执行：

```bash
npm run functions:check
npm run verify
npm run deploy:doctor
npm run launch:doctor
npm run aliyun:runtime:doctor -- --strict
```

涉及页面体验、移动端、图库、博客或后台界面时，补充 Playwright 截图或 smoke 证据，并在 PR 里写明视口和路径。

## Pull Request 标准

PR 必须说明：

- 变更摘要：这次解决什么问题。
- 影响范围：前端、函数、迁移、部署、文档或数据。
- 验证结果：实际跑过的命令和结论。
- 风险与回滚：失败后如何撤回或降级。
- 截图/录屏：UI 或移动端改动必须附带。

PR 不能包含本机 `.env`、服务器地址、私钥路径、账号令牌、生产会话 JSON 或其他敏感信息。公开文档只能使用占位符。

## 发布与回滚

- 发布前先执行 `npm run release:preflight -- --strict`，或至少执行 `npm run verify`、`npm run deploy:doctor` 与 `npm run aliyun:runtime:doctor -- --strict`。
- 阿里云部署只通过本机环境变量读取目标、端口、用户和 SSH key，不把连接细节写进仓库。
- 固定规格阿里云必须保留 SSH 默认端口阻断、管理端口来源限速、fail2ban sshd jail 和 Docker 后端端口公网阻断；这些由 `aliyun:runtime:doctor -- --strict` 作为发布门禁检查。
- 发布后用 `aliyun:runtime:doctor`、live URL、关键 API 路径和移动端页面做一次最小验证。
- 回滚优先使用 Git 提交或上一次构建产物，不在服务器上手改线上文件作为长期状态。

## 敏感信息

- `.env`、本机会话、部署密钥、账号密码、真实服务器连接参数不进入 Git。
- `.env.example` 只保留占位符，不能出现真实项目引用、真实域名或可复用凭据。
- 新增 README、部署说明、PR 描述和截图前，先检查是否暴露连接信息。

## 本地 Hook

仓库提供可选 hook：

```bash
git config core.hooksPath .githooks
```

启用后：

- `commit-msg` 会检查提交标题。
- `pre-push` 会执行 `npm run git:check` 和 `npm run check`。

这不是 CI 的替代品。CI 仍然负责 PR 和 `main` 的最终验证。
