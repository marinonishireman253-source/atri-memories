# ATRI Memories

ATRI Memories 是一个面向个人图片记忆整理的 React 网站。它提供公开画廊、图片详情、标签筛选、登录上传、个人空间、收藏、举报和独立管理后台，适合用来维护一个带权限和内容治理能力的个人图片站。

项目在没有后端配置时可以用示例数据本地预览；接入 Supabase 兼容后端后，可启用真实账号、Storage、RLS 权限、Edge Functions 和后台管理能力。

## 功能概览

- 公开画廊：响应式图片网格、精选内容、标签发现、搜索、时间筛选、排序和单图分享。
- 图片查看器：上一张 / 下一张浏览、原图下载、分享链接、Markdown 链接、标签回流和移动端布局。
- 账号空间：邮箱登录 / 注册、我的图片、我的收藏、个人资料、上传统计和上传限制提示。
- 批量上传：多图选择、文件校验、缩略图预览、批次进度、标签录入和失败项重试。
- 内容治理：图片举报、公开 / 下架状态、精选标记、举报处理和审计日志。
- 管理后台：独立 `/admin` 路由，包含运营概览、图片管理、用户管理、举报处理、操作日志和站点设置。
- 响应式体验：首页、画廊、上传弹窗、大图查看器和管理后台均覆盖桌面端与手机端。
- 本地质量检查：构建、架构检查、产品主路径检查、Edge Function 类型检查、移动端布局检查和浏览器 smoke 测试。

## 技术栈

- React 19
- Vite 6
- Supabase JS
- PostgreSQL / Row Level Security
- Supabase Storage
- Supabase Edge Functions
- Playwright Core
- Node.js test runner
- GSAP
- JSZip

## 快速开始

```bash
npm install
cp .env.example .env
npm run dev
```

如果 `.env` 中没有配置 Supabase 连接信息，网站会进入本地预览模式并使用示例数据，适合先检查页面、动效和移动端布局。

## 环境变量

仓库只保留占位符示例。真实域名、服务器、账号、会话 JSON、部署路径和密钥都应只放在本机 `.env`、CI Secret 或服务器环境变量中。

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_PUBLIC_SITE_URL=https://your-site.example.com
VITE_SHARE_LINK_MODE=app
```

常用变量：

| 变量 | 用途 |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase 兼容 API 地址 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | 前端公开 publishable key |
| `VITE_PUBLIC_SITE_URL` | 生成分享链接和服务端预览时使用的公开站点地址 |
| `VITE_SHARE_LINK_MODE` | `app` 使用前端单图页，`preview` 使用服务端分享预览页 |
| `SMOKE_ADMIN_*` / `SMOKE_USER_*` | 可选的本地 smoke 登录测试账号或会话 |
| `ALIYUN_*` | 可选的 SSH 部署参数，只应存在于本机或 CI Secret |

## 后端初始化

1. 创建或准备一个 Supabase 兼容项目。
2. 按顺序执行 `supabase/migrations/` 下的迁移。
3. 部署 `supabase/functions/` 下的 Edge Functions。
4. 将 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY` 写入本机 `.env`。
5. 重启开发服务并确认页面进入云端连接模式。

管理员账号需要先完成注册或登录，再由数据库写入管理员表。示例中的邮箱必须替换为自己的管理员邮箱：

```sql
insert into public.admin_users (user_id)
select id
from auth.users
where email = 'admin@example.com'
on conflict do nothing;
```

## 本地验证

常用检查命令：

```bash
npm run flow:doctor
npm run public:snapshot:doctor
npm run public:snapshot:export -- --dry-run
npm run build
npm run functions:check
npm run verify
npm run project:check
npm run mobile:check
npm run smoke:local
```

说明：

| 命令 | 覆盖范围 |
| --- | --- |
| `npm run flow:doctor` | 开工、合并或发布前检查 Git/worktree、主线差异和依赖状态 |
| `npm run public:snapshot:doctor` | 检查本地完整历史与 `origin/main` 公开快照历史是否保持双轨隔离 |
| `npm run public:snapshot:export -- --dry-run` | 从当前开发树模拟导出公开快照，并阻断真实路径、主机、Supabase 项目引用和凭据形态 |
| `npm run build` | 前端生产构建 |
| `npm run functions:check` | Edge Functions TypeScript / Deno 检查 |
| `npm run verify` | Git 规则、构建、函数检查、架构检查和产品检查 |
| `npm run project:check` | 项目级完整本地检查，包含移动端和 smoke 脚本测试 |
| `npm run aliyun:runtime:doctor` | 通过本机环境变量连接阿里云，检查固定规格运行时、SSH 收口与限速、fail2ban、证书续期、snapd、Docker 与 Supabase 容器健康 |
| `npm run mobile:check` | 使用真实手机视口检查关键页面布局 |
| `npm run smoke:local` | 本地 demo 模式浏览器回归，不依赖真实账号 |
| `npm run smoke` | 本地浏览器回归，并在环境允许时补充云端分享页与登录场景 |

## 部署

项目提供一个基于 SSH/SCP 的部署脚本：

```bash
npm run deploy:aliyun
```

脚本会在本地构建 `dist/`，打包前端产物和 Edge Functions，并同步到目标服务器。部署成功后默认继续运行 `npm run aliyun:runtime:doctor -- --strict`，用固定规格服务器的运行时健康、SSH 暴露面和后端端口收口状态阻断有风险的发布。部署目标、SSH 用户、端口、密钥、站点目录、函数目录和公开站点 URL 都必须通过本机环境变量或未提交的 `.env` 提供。

示例只使用占位符：

```bash
VITE_PUBLIC_SITE_URL=https://your-site.example.com \
ALIYUN_HOST=your-server-host \
ALIYUN_PORT=your-ssh-port \
ALIYUN_USER=your-ssh-user \
ALIYUN_SSH_KEY="$HOME/.ssh/your-deploy-key" \
ALIYUN_SITE_ROOT=/path/to/site-directory \
ALIYUN_SUPABASE_FUNCTIONS_ROOT=/path/to/functions-directory \
npm run deploy:aliyun
```

仅检查部署动作而不执行远端写入：

```bash
npm run deploy:aliyun -- --dry-run
```

紧急维护时可以显式跳过部署后的运行时门禁，但需要随后单独补跑：

```bash
npm run deploy:aliyun -- --skip-runtime-doctor
npm run aliyun:runtime:doctor -- --strict
```

## 项目结构

```text
src/
  app/              全局页面编排、路由和弹窗接线
  components/       通用 UI 组件
  data/             本地预览数据和背景配置
  features/         gallery / viewer / upload / auth / user / admin
  hooks/            Supabase 读写 hooks
  lib/              内容模型、权限模型、媒体 URL、后台 read models
  styles/           全局样式、响应式样式和壳层样式
supabase/
  migrations/       数据库、RLS、Storage 策略迁移
  functions/        服务端权限校验、分享预览、管理和治理函数
scripts/            构建、验证、部署、smoke 和质量检查脚本
tests/              Node.js 测试和脚本回归测试
docs/               架构、上线、手工 QA 和协作说明
```

## 文档

- [协作与提交规则](./docs/GIT_WORKFLOW.md)
- [公开仓库双轨流程](./docs/PUBLIC_REPO_WORKFLOW.md)
- [架构规划](./docs/SITE_ARCHITECTURE_PLAN.md)
- [交付路线](./docs/MASTER_DELIVERY_PLAN.md)
- [上线检查清单](./docs/LAUNCH_READINESS_CHECKLIST.md)
- [Smoke 测试说明](./docs/SMOKE_TESTING_GUIDE.md)
- [手工 QA 模板](./docs/MANUAL_QA_TEMPLATE.md)

## 公开仓库注意事项

- 不要提交 `.env`、真实账号、会话 JSON、服务端密钥、SSH key、服务器地址或私有部署路径。
- 不要提交 `dist/`、`output/`、`artifacts/`、`tmp/` 等本地构建或检查产物。
- README 和示例配置只应使用占位符。
- 发布或刷新公开快照前建议运行 `npm run flow:doctor -- --strict`、`npm run public:snapshot:doctor`、`npm run public:snapshot:export -- --dry-run` 和 `npm run project:check`，并确认 Git diff 中没有真实环境信息。
