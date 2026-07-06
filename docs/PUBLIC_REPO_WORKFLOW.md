# 公开仓库双轨流程

这份文档定义 ATRI Memories 的本地开发历史与公开 GitHub 快照之间的边界。当前仓库采用双轨主线：

- 本地 `main`：完整开发历史，只保留已验证、可部署的内部工作状态。
- `origin/main`：公开脱敏快照历史，只承载可公开展示的项目结构、代码和文档。

两条历史没有共同祖先是刻意隔离，不是需要用普通合并修复的异常。

## 目标

- 保护真实部署、账号、会话、服务器和私有项目细节。
- 保留本地完整开发历史的可追踪性。
- 让公开仓库只通过受控脱敏快照更新。
- 避免误用 `git pull`、`git merge` 或强推把两条主线混在一起。

## 当前合同

- 日常开发只从本地 `main` 拉分支，在隔离 worktree 中实现、验证、提交，再快进回本地 `main`。
- 公开仓库不参与日常开发分支合并。
- `origin/main` 只代表最近一次公开脱敏快照；它不要求与本地 `main` 有共同历史。
- 如果要刷新公开仓库，必须先生成一个只含公开安全内容的快照，再用专门的公开发布步骤更新 `origin/main`。

## 必跑检查

开工、合并或交接前：

```bash
npm run flow:doctor
```

涉及公开仓库、GitHub 展示、README、部署说明、示例配置或远端主线状态时：

```bash
npm run public:snapshot:doctor
npm run public:snapshot:export -- --dry-run
```

合并、发布或交接前建议再运行：

```bash
npm run verify
npm run project:check
```

`public:snapshot:doctor` 是只读检查。它只读取本地 Git 状态、`main`、`origin/main` 和公开流程文档是否存在，不会 pull、push、merge、rebase、checkout、reset 或写文件。

`public:snapshot:export -- --dry-run` 会读取当前 Git 已跟踪文件，排除 `docs/superpowers/`、`output/`、`dist/` 和 `.env*` 等内部产物，并在写入公开快照前扫描真实本机路径、公网地址、Supabase 项目地址、SSH 命令和凭据形态。

## 禁止操作

不要把本地完整历史和公开快照历史直接混合：

```bash
git pull origin main
git merge origin/main
git rebase origin/main
```

不要把本地完整开发历史强推到公开快照主线：

```bash
git push --force origin main
```

不要在公开 README、部署文档、示例配置、Issue、PR 或截图中暴露：

- 真实域名、服务器地址、SSH 用户、端口、密钥路径或私有部署目录。
- 真实 Supabase 项目引用、服务端密钥、会话 JSON、访问令牌或账号信息。
- 本机 Keychain 项、私有脚本路径、未脱敏日志和可复用命令历史。

公开文档只能使用占位符，例如 `your-site.example.com`、`your-server-host`、`your-project-ref`。

## 刷新公开快照前

刷新公开仓库前至少确认：

- `npm run flow:doctor` 结果可解释。
- `npm run public:snapshot:doctor` 通过或只有已记录、可解释的警告。
- `npm run public:snapshot:export -- --dry-run` 没有泄漏阻断。
- `npm run verify` 和必要的页面 smoke 已通过。
- Git diff 中没有真实环境信息、凭据、会话、服务器、项目引用或私有路径。
- README、`.env.example`、部署说明和截图只包含公开安全内容。

如果 `public:snapshot:doctor` 报告 `main` 与 `origin/main` 共享历史，先停止公开发布，确认公开远端是否被错误地推送了本地完整历史。

## 故障处理

- `main` 与 `origin/main` 没有共同祖先：这是当前双轨形态。继续使用公开快照流程，不要用普通 pull/merge 修复。
- 工作区不干净：先提交、暂存或换到干净 worktree，再做公开快照判断。
- 缺少 `origin/main`：先确认远端配置和公开仓库是否存在，不要创建未脱敏主线顶上去。
- 缺少本地 `main`：先恢复完整开发主线，再考虑任何公开仓库操作。

## 交接说明

交接时说明两条主线的角色即可，不需要暴露任何真实连接信息：

- 本地 `main` 是完整开发主线。
- `origin/main` 是脱敏公开快照。
- 两者无共同祖先属于预期状态。
- 用 `npm run flow:doctor` 和 `npm run public:snapshot:doctor` 判断当前状态。
