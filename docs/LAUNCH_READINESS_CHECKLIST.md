# ATRI Memories 上线前检查表

说明：本文件只负责未来公开部署前的配置与验收。整体阶段顺序与当前优先级以 [MASTER_DELIVERY_PLAN.md](./MASTER_DELIVERY_PLAN.md) 为准。

当前状态：先不上线。本文件只记录未来公开部署前必须确认的配置和风险点。

建议先运行：

```bash
npm run release:preflight
npm run product:doctor
npm run deploy:doctor
npm run launch:doctor
npm run aliyun:runtime:doctor -- --strict
```

`release:preflight` 会汇总 `verify`、`deploy:doctor`、`launch:doctor`、`smoke:doctor`、`qa:doctor` 和 `smoke` 的结果，生成 `output/release/` 下的预发布报告；真正发布前用 `npm run release:preflight -- --strict`，让任何 warning / 跳过项都阻断发布。`product:doctor` 会单独复核用户侧、管理侧、数据权限和交接文档这些本地产品主路径是否仍完整；`deploy:doctor` 会检查 Supabase CLI、project ref、生产域名和 `share-memory` 部署命令提示；`launch:doctor` 会单独检查本地环境变量，读取一张远端公开图片，并验证云端 `share-memory` 能否为真实图片输出 OG/Twitter meta；`aliyun:runtime:doctor -- --strict` 会检查固定规格阿里云上的内存、负载、SSH 默认端口阻断、管理端口限速、fail2ban、证书续期、snapd、Docker 日志轮转、Supabase 容器、DB readiness 和 Auth 到 DB 的解析状态。跑完后再回到本清单逐项核对需要在 Dashboard 完成的配置。

## 1. 部署目标

- 选择部署平台：Vercel、Netlify 或 Supabase Hosting。
- 确认生产域名，例如 `atri.example.com`。
- 前端环境变量只允许使用公开 key：
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- 部署 `share-memory` 前先运行 `npm run deploy:doctor`，确认 Supabase CLI、project ref 和 `PUBLIC_SITE_URL` secret 提示都明确。
- 当前固定部署在阿里云时，部署后必须运行 `npm run aliyun:runtime:doctor -- --strict`；如果因紧急维护跳过，必须在同一轮收口里补跑，并确认 SSH 与 Docker 后端端口收口未被覆盖。
- 禁止把 service role key 放入前端环境变量。

## 2. Supabase Auth

- `site_url` 改为生产域名。
- Auth redirect URLs 增加：
  - `https://<生产域名>`
  - `https://<生产域名>/`
- 确认邮箱确认策略：
  - 公开注册开启时，保留邮箱确认。
  - 只邀请用户时，可以关闭公开注册或手工创建账号。
- 后台 `站点设置` 的 `公开注册` 开关应与 Supabase Auth 的实际开放策略保持一致。
- 如果关闭公开注册，应确认管理员邀请邮件模板、`site_url` 和重定向地址已经可用。

## 3. Storage 与容量

- `atri-images` bucket 保持 private，通过 `media-urls` 签名 URL 读取。
- 文件大小限制与后台 `站点设置` 的单图上限一致。
- 批量上传张数与后台 `站点设置` 的单次数量一致。
- 如果启用了每小时上传上限 / 每日上传上限，应确认后台设置值与实际站点策略一致。
- 普通用户上传开关与后台 `站点设置` 一致；关闭时管理员仍可维护上传。
- 免费额度内需要定期检查：
  - Storage 使用量。
  - 数据库大小。
  - 月流量。
- 历史图片上线前先在管理后台点 `回填大小`，减少容量统计未知项。

## 4. 权限

- 匿名用户只能读取 `visibility_status = public` 的图片和站点设置。
- 登录用户只能上传到 `public/<user_id>/`。
- 登录用户只能管理自己的图片。
- 举报提交应保持服务端限频与同图重复抑制有效，不能只依赖前端按钮禁用。
- 管理员能力必须走 Edge Functions：
  - `manage-memories`
  - `manage-overview`
  - `manage-users`
  - `submit-report`
  - `manage-reports`
  - `manage-audit-logs`
  - `media-urls`
  - `delete-memory`
  - `update-memory`
- 普通客户端直连更新 `memories` 只能更新 `title`、`caption`、`tags`。
- 图片展示、下载和 ZIP 应优先使用 `media-urls` 返回的 signed URL，公开 URL 只作为当前 public bucket 的兼容兜底。
- `storage.objects` 不允许匿名直读 `atri-images`，匿名展示必须走 `media-urls`。

## 5. 分享预览

当前浏览器侧仍会做 SPA 客户端 meta 更新：

- 浏览器里打开单图后标题、描述、OG 图片会更新。
- 社交平台爬虫可能只看到 `index.html` 初始 meta。

当前代码里已经准备了 `share-memory` Edge Function 作为服务端分享预览方案。它负责为公开图片返回带 OG/Twitter meta 的 HTML；要真正生效，还需要部署时把主站域名、函数配置和分享策略一起对齐。

上线时至少确认：

- 前端 `VITE_PUBLIC_SITE_URL` 已指向生产域名。
- 前端 `VITE_SHARE_LINK_MODE` 已按站点策略设置为：
  - `app`：继续复制主站 `/memory/<id>`。
  - `preview`：复制 `share-memory` 服务端分享链接。
- Supabase Edge Function Secret `PUBLIC_SITE_URL` 已设置，`share-memory` 打开后能自动回跳到主站单图页。
- `npm run launch:doctor` 的 `share-memory 真实预览` 和 `share-memory OG/Twitter meta` 均为 OK；若只有 `content-type` 仍是 `text/plain`，说明 HTML 内容已正确输出但远端函数响应头仍需在部署侧收口为 `text/html`。

如果不用 `share-memory`，仍需上线时追加其中一种方案：

- SSR/SSG 单图详情页。
- Edge Function 根据 `/memory/<id>` 返回动态 HTML。
- 部署平台 middleware 动态注入 meta。

## 6. 上线前手工验收

执行时不要直接在本文件里勾选，优先运行：

```bash
npm run qa:init -- --env staging
```

或按实际环境生成记录文件，再填写 [MANUAL_QA_TEMPLATE.md](./MANUAL_QA_TEMPLATE.md) 对应结构。

- 访客：浏览、搜索、筛选、打开大图、下载原图、复制分享链接、举报公开图片；重复举报同图或短时间连续举报时应看到明确限频提示。
- 用户：注册、邮箱确认、重发确认邮件、忘记密码邮件、登录、批量上传、编辑自己的图片、删除自己的图片、查看我的图片，被暂停上传或超过上限时应看到明确错误。
- 用户：如果命中每小时上传上限或每日上传上限，应看到明确错误，而且后端必须拒绝继续上传。
- 管理员：运维概览、图片后台搜索、状态筛选、排序、批量 ZIP、批量删除、回填大小、设置精选、下架/恢复图片、用户管理、暂停/恢复用户上传、设置用户上传上限、举报处理、操作日志、站点设置。
- 手机端：顶部按钮横向滚动、筛选栏单列、大图查看器可关闭、上传列表可滚动、后台表格可横向滚动。
- 构建：`npm run build` 必须通过。
- 本地总验证：`npm run verify` 必须通过。
- 本地产品主路径：`npm run product:doctor` 必须通过，确认用户侧、管理侧、数据权限和交接文档没有断线。
- 本地浏览器回归：当前不发布时至少运行 `npm run smoke:local`，确认 demo 模式桌面端和手机视口主流程仍可用。
- 预发布报告：`npm run release:preflight` 应生成 `output/release/*-release-preflight.md`，并列出所有 warning / 跳过项和下一步；最终公开发布前应运行 `npm run release:preflight -- --strict`，不能留下 warning 或跳过项。
- 完成度审计：`npm run completion:audit` 应生成 `output/release/*-completion-audit.md`，并按 `MASTER_DELIVERY_PLAN.md` 的完成定义逐项说明哪些要求已证明、哪些仍缺真实证据。
- 手工 QA 诊断：`npm run qa:doctor` 应能读取最新 `docs/manual-qa-runs/*-manual-qa.md`，也能通过 `-- --file <记录路径>` 复核指定记录，并确认状态标记、未勾选项和空白字段是否已经足以作为完成审计证据。
- 核心回归烟测：`npm run smoke` 必须通过，覆盖桌面端与手机视口下的首页、公开画廊、大图查看器、登录弹窗和 `share-memory` 预览页；若已准备测试账号，优先提供 `SMOKE_ADMIN_SESSION_JSON` / `SMOKE_USER_SESSION_JSON`，否则带上 `SMOKE_ADMIN_*` / `SMOKE_USER_*` 邮箱密码跑通管理员和普通用户路径。
- 如需准备已登录 smoke，会话优先通过 `npm run smoke:session -- --role admin|user --email ... --password ...` 生成，再写入 `.env`。
