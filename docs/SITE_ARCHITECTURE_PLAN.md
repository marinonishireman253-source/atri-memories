# ATRI Memories 网站整体架构规划

说明：本文件负责模块边界、数据模型和技术架构；总体阶段顺序、完成定义和固定推进路线以 [MASTER_DELIVERY_PLAN.md](./MASTER_DELIVERY_PLAN.md) 为准。

目标：把当前图片画廊升级为一个可长期扩展、权限清晰、管理闭环的 ATRI 主题图片站。后续新增功能必须优先落在清晰模块和数据模型上，避免继续把逻辑堆在单个组件里。

## 当前基线

当前已实现能力：

- 公开画廊：访客可浏览、搜索、筛选、分页加载、放大查看、下载原图。
- 标签发现：首页提供基于标签的公开浏览入口，标签不再只出现在筛选下拉框里。
- 图片上传：登录用户可批量上传，图片存入 Supabase Storage `atri-images`。
- 个人收藏：登录用户可收藏公开图片或自己的图片，并切换到独立收藏范围回看。
- 图片管理：用户管理自己的图片，管理员管理全部图片。
- 标签：`memories.tags text[]`，支持上传、编辑、筛选。
- 分享：`/memory/<id>` 可直达单图大图查看器。
- 管理后台：图片管理、批量下载、批量删除、用户管理、设置/取消管理员。
- 内容治理：管理员可下架/恢复图片，公开画廊只展示公开内容。
- 举报治理：访客或用户可举报公开图片，管理员在后台处理举报并记录审计日志。
- 后台规模化管理：管理员图片列表已拆为服务端分页、服务端筛选、服务端排序和容量统计。
- 权限后端：RLS + Edge Functions，删除、编辑、用户管理不依赖前端隐藏按钮。

当前主要技术栈：

- 前端：React + Vite，单页应用。
- 样式：`src/styles.css` 作为入口，按 `styles/`、`features/`、`features/admin/` 分层拆分视觉系统。
- 数据：Supabase Postgres。
- 图片文件：Supabase Storage `atri-images`，bucket 为 private，通过 signed URL 访问。
- 鉴权：Supabase Auth。
- 服务端逻辑：Supabase Edge Functions。
- 媒体 URL：前端统一通过 `src/lib/memoryMedia.js` 读取图片展示、下载和分享预览 URL，并通过 `media-urls` Edge Function 补全签名 URL。
- 内容模型：前端统一通过 `src/lib/memoryContent.js` 管理图片字段、标题/描述兜底、公开/下架/精选状态判断，以及公开画廊和后台的筛选模型。后台图片管理页已经把标签筛选接到同一套服务端筛选边界，标签选项由站点预设和当前管理列表共同生成，后续扩展专题标签或运营标签不需要重写列表查询。
- 公开内容查询：公开画廊的搜索、时间筛选、标签筛选和排序统一通过 `src/lib/memoryContent.js` 下发到本地预览数据和 Supabase 查询，保证首页、示例模式和真实云端数据口径一致。公开排序已覆盖最新/最早、标题、上传者和文件大小，后续新增排序字段只扩展 `PUBLIC_MEMORY_SORT_OPTIONS` 与排序 key 语义。
- 记忆查询边界：`src/lib/memoryQueries.js` 统一处理公开列表分页、收藏范围查询、单图读取、媒体 URL 补全和管理员举报汇总；`useMemories` 负责 React 状态、loading/error、刷新与写操作编排，避免收藏分页、权限读取和举报汇总继续散落在 hook 主体里。
- 记忆写操作边界：`src/lib/memoryMutations.js` 统一封装 `delete-memory`、批量删除结果汇总、`update-memory`、更新后媒体 URL 补全和管理员举报汇总回填；`useMemories` 只做权限预检、loading/error 和刷新编排，避免后续增加批量改标签、批量可见性或审核动作时继续堆进 hook。
- 画廊筛选摘要模型：公开画廊通过 `src/features/gallery/galleryFilterSummaryModel.js` 统一生成搜索、标签、时间和排序 chip，并为每个条件提供单项清除 patch，避免范围栏、快捷筛选和未来筛选项各自拼装当前状态。
- 画廊快速浏览模型：公开画廊通过 `src/features/gallery/galleryQuickFilterModel.js` 把最近内容、标题排序和常用标签封装成可扩展筛选预设，供 `GalleryQuickFilters` 渲染，避免后续专题/系列/运营入口直接堆进 `Gallery.jsx`。
- 画廊整理状态边界：用户侧“我的图片”批量选择、全选、删除确认、删除结果反馈和卡片临时活动标记由 `src/features/gallery/useGalleryManagement.js` 管理，首页模型只接线当前用户、可见列表和刷新动作；后续加入批量改标签、批量设公开/隐藏或系列整理时优先扩展这层，而不是继续膨胀 `useHomePageModel.js`。
- 单图读取模型：单图详情、分享链接和页面 meta 统一通过 `src/lib/memoryDetail.js` 生成 read model，避免查看器、分享入口和 meta 各自拼装标题、描述、状态和链接。
- 单图信息摘要：查看器通过 `ViewerInfoGrid` 渲染 `memoryDetailModel.infoItems`，把当前位置、上传者、可见性、文件大小和分享策略收口为可扩展摘要层；详情标签可直接回到公开画廊同标签范围，避免标签只作为静态装饰。后续增加 EXIF、尺寸、系列归属或审核状态时优先扩 read model，而不是继续改详情页布局。
- 单图链接动作：查看器通过 `memoryDetailModel.linkActions` + `ViewerLinkActions` 统一渲染分享链接、Markdown 链接和图片 URL 复制动作，让后续增加复制缩略图、复制嵌入代码这类动作时不再改查看器主体。
- 服务端分享模型：`src/lib/routes.js` 统一管理主站单图链接、服务端分享预览链接和复制策略；`supabase/functions/share-memory/index.ts` 为公开图片输出带 OG/Twitter meta 的 HTML，并在浏览器打开时回跳到主站单图页，作为 Phase 5 的服务端分享预览边界。
- 展示摘要模型：公开画廊卡片、精选卡片、后台图片表、后台概览最近上传和举报图片摘要统一通过 `src/lib/memoryPresentation.js` 生成展示字段，避免标题、日期、上传者、大小和可见性标签在多个页面重复拼装。
- 举报状态模型：举报原因、待处理/已处理/已驳回状态、后台徽标语义和概览统计口径统一通过 `src/lib/reporting.js` 收口，避免后台列表、日志和概览各自维护一套状态解释。
- 举报队列模型：后台举报处理页通过 `src/features/admin/adminReportsModel.js` 统一生成队列摘要，并支持按图片、举报者、说明、处理备注和举报原因进行本地过滤，避免管理员在同一状态下只能线性翻表。
- 内容治理摘要：管理员入口中的图片列表和最近上传会直接携带 `report_summary`，让“有待处理举报 / 有举报记录”成为图片自己的治理状态，而不是只有举报队列表知道这件事。
- 单图治理上下文：管理员打开单图详情时，查看器会直接显示该图片的举报汇总和待处理状态，避免在图片详情和举报处理页之间来回切换才知道治理上下文。
- 单图交互状态边界：查看器主体保留图片展示、导航、下载、分享、收藏和删除确认编排；编辑表单状态由 `src/features/viewer/useViewerEditForm.js` 管理，举报表单状态由 `src/features/viewer/useViewerReportForm.js` 管理，避免后续继续把编辑、举报、审核动作都堆进 `ImageViewer.jsx`。
- 运营摘要模型：后台顶部统计条、运维概览指标卡片和相关说明文案统一通过 `src/lib/adminOverview.js` 生成，避免同一组运营指标在不同组件里重复拼接。
- 用户反馈模型：上传弹窗、登录弹窗、个人中心和公开画廊的预览提示、注册关闭提示、上传受限提示、上传结果和空状态统一通过 `src/lib/userFeedback.js` + `src/components/StatusNotice.jsx` 渲染，避免用户侧不同入口各自维护一套消息样式和语义。
- 用户路径模型：首页层通过 `src/app/useHomePageStatus.js` + `src/lib/userJourney.js` 统一编排“上传完成回流、我的图片范围提示、首页同步错误、分享图片加载中”这类跨 feature 状态，避免 `App.jsx`、Header 行为和 Gallery owner filter 各自散落处理。
- 首页画廊范围动作边界：`src/app/useHomePageGalleryScope.js` 统一管理“我的图片、我的收藏、标签发现、查看器标签回流、清空 owner/favorites 筛选、未登录自动回到公开范围”这些首页范围动作，让 `useHomePageModel` 保持数据编排，不再继续堆筛选流程细节。
- 首页 props 组装边界：`src/app/homePagePropsModel.js` 负责把首页动作模型、状态条项目和 actionKey 映射成组件 props；`useHomePageModel` 只传入具体动作实现和数据上下文，避免后续增加专题入口、标签页入口或用户整理入口时继续在返回对象里堆三元分支。
- 首页弹窗 props 合约：`src/app/homePageOverlayPropsModel.js` 负责收口上传、用户中心、认证、主题、后台和查看器的全局弹窗 props 形状；`useHomePageModel` 继续负责具体动作接线，但后续新增弹窗、拆分查看器或扩展后台入口时优先扩展这层契约，而不是继续扩大 hook 的返回对象。
- 用户空间模型：个人中心通过 `src/lib/userSpace.js` 把“个人上传统计、收藏数量、已知容量”和“当前画廊范围”收口成同一套 read model，让“我上传了多少、占用多少、现在正在看哪一批图”处于同一层上下文，而不是分别散落在用户中心和首页筛选栏。
- 用户标签整理入口：个人中心通过 `UserTagStatsCard` 把常用标签从静态统计升级为快捷筛选入口，点击后进入“我的图片 + 该标签”范围，后续若扩展专题、系列或批量整理动作，也优先挂在用户空间动作模型上。
- 用户上传权限摘要：个人中心通过 `userUploadPolicyModel` 消费 `upload_policy_state()`，把站点上传开关、账号上传权限、总额度、最近 1 小时和最近 24 小时窗口统一展示，避免普通用户只能在点击上传失败后才知道受限原因。
- 认证入口策略模型：登录/注册弹窗通过 `src/features/auth/authFlowModel.js` 统一生成登录、注册、公开注册开放和邀请制文案，并由 `AuthAccessPolicyCard` 展示账号入口策略，避免后续加 OAuth、邀请码或管理员邀请说明时继续散落在弹窗组件里。
- 用户 onboarding 模型：首次登录、零上传用户、上传暂停用户，以及“我的图片”范围因附加筛选变空这几类分支统一通过 `src/lib/userOnboarding.js` 建模，并由首页状态条和个人中心下一步卡片共同消费，避免不同入口对同一类用户给出不一致的引导。
- 站点健康模型：后台通过 `src/lib/adminHealth.js` 基于运维概览数据生成统一健康检查项，把“待处理举报、历史图片、大小未知、未确认用户、邀请待确认、本地 Site URL”等运行/配置风险集中为一层 read model，供运维概览和站点设置共同消费。
- 备份策略模型：后台通过 `src/lib/adminBackup.js` 基于运维概览数据整理“Postgres 业务数据、Storage 图片文件、Auth 账号状态、部署与站点配置”四类关键资产，统一下发建议备份频率、导出方式、恢复顺序和当前特殊注意事项，避免备份只停留在散乱文档描述。
- 运行监控模型：后台通过 `src/lib/adminMonitoring.js` 把“内容流入、账号活跃、注册/邀请入口压力、治理负载、容量账面”统一建模，并同时下发监控定义与告警信号，避免运维概览只剩原始计数而没有可执行解释。
- 数据留存模型：后台通过 `src/lib/adminRetention.js` 统一定义“公开图片、下架内容、举报上下文、账号确认积压、审计历史、容量账面”六类数据该如何保留、多久复核、清理前先看什么上下文，并同时下发给运维概览和站点设置，避免未来做清理时只凭感觉删数据。
- 反滥用策略模型：后台通过 `src/lib/adminAbuse.js` 把“当前已落地的保护层”和“仍缺失的服务端反滥用策略”统一建模，固定展示上传权限约束、上传大小/批次限制、邀请制入口、举报基础校验，以及举报限频、上传时间窗口限制、注册/邀请异常信号这类待补风控口径，避免这些风险继续分散在临时讨论里。
- 账号入口异常信号：后台通过 `src/lib/adminAuthSignals.js` 基于运维概览原始计数统一判断“近 24 小时注册峰值、邀请峰值、未确认新注册、超过 72 小时的待确认邀请和未确认注册积压”，并把这层信号同时下发给运维概览、健康检查和反滥用面板，避免注册/邀请风控继续停留在静态文案。
- 邀请发送策略：后台通过 `src/lib/adminInvitePolicy.js` 统一处理邀请时间窗口上限、当前已用额度和服务端限频错误文案；服务端通过 `public.admin_invite_policy_state()` + `manage-users` Edge Function 对管理员邀请发放进行真正的时间窗口限制，而不是只在概览里提示异常信号。
- 后台用户分组模型：用户管理页通过 `src/features/admin/adminUsersModel.js` 统一处理搜索与“管理员、待确认、暂停上传、有上传上限”等状态分组，避免用户表继续只靠搜索框承担所有日常排查入口。
- 后台操作日志模型：操作日志页通过 `src/features/admin/adminLogsModel.js` 统一生成最近操作摘要，并支持按操作者、动作、目标和详情关键词过滤，让审计追溯不再只能线性查看最近 100 条。
- 后台容器状态边界：`AdminPanel` 保留页签状态、跨页刷新接线和后台动作编排，反馈消息由 `src/features/admin/AdminPanelMessages.jsx` 渲染，页签切换渲染由 `src/features/admin/AdminPanelTabContent.jsx` 承担，用户 / 举报 / 日志的筛选状态和派生列表由 `src/features/admin/useAdminPanelFilters.js` 管理，图片选择 / 删除确认由 `src/features/admin/useAdminMemorySelection.js` 管理，站点设置表单同步 / 保存 payload 由 `src/features/admin/useAdminSettingsForm.js` 管理；`src/features/admin/AdminSettingsSections.jsx` 负责站点设置表单区、上线准备、Auth 提醒和高级运维区块，避免后续继续把批量操作、设置项 state 和大型设置视图都堆进后台容器。
- 上线准备模型：后台通过 `src/lib/adminLaunchReadiness.js` 把生产域名、Auth redirect、账号发放方式、上传/邀请限速、分享预览方案和手工验收动作收口成一层统一的 readiness model，同时供运维概览和站点设置消费，避免 Phase 5 再退回一堆散落提醒。
- 上线自检脚本：`scripts/share-preview-diagnostics.mjs` 统一提供云端 `share-memory` 真实图片预览检查，`launch-doctor`、`smoke:doctor` 和 `smoke` 都复用这套诊断来验证 OG/Twitter meta、canonical 和响应头，避免上线前检查口径在多个脚本里分裂。`scripts/launch-doctor.mjs` 继续负责 `VITE_PUBLIC_SITE_URL`、`VITE_SHARE_LINK_MODE` 和前端公开 Supabase 配置诊断。
- 架构边界自检：`scripts/architecture-doctor.mjs` 固定检查 `app / features / components / hooks / lib` 目录、六个 feature 合约、业务组件是否退回 `components/`、`src/styles.css` 是否只做分层导入、`App.jsx` 是否维持页面编排边界，以及懒加载入口是否仍由 `lazyPanels` 承担；该检查已接入 `npm run verify`，后续扩展功能前应先保证它通过。
- 产品流程自检：`scripts/product-doctor.mjs` 固定检查用户侧路径、管理侧路径、数据与权限边界、验证与交接文档是否仍然完整；该检查已接入 `npm run verify`，用于在继续扩展功能时尽早发现主路径组件、Edge Function 或交接文档断线。
- 举报限频与去重：`submit-report` 现在会为每次举报生成 `reporter_fingerprint`，并通过数据库唯一索引和服务端检查同时拦截“同一举报者对同一图片的重复待处理举报”；同图重复举报存在冷却时间，短时间连续多次举报还会触发限频。前端通过 `src/lib/reporting.js` 统一把这些服务端错误码翻译成用户可读提示。
- 上传速率策略：上传链路现在通过 `public.upload_policy_state()` 统一提供“全站上传开关、用户暂停状态、总上传上限、每小时上传上限、每日上传上限及当前计数”，前端预检和 `public.can_upload_memory()` 都复用这层语义，避免上传风控再次分裂成前端一套、RLS 一套。该函数只应供已登录上传流程和服务端维护逻辑使用，匿名访客不能直接执行。
- 上传数据边界：`src/lib/memoryUpload.js` 负责读取上传策略、校验单条上传、写入 Storage 和插入 `memories` 行；`useMemories` 只编排列表刷新、进度回调和结果汇总。后续扩展缩略图生成、原图保留策略、跨账号重复检测或服务端预签上传时，优先扩展 `memoryUpload.js`，避免把上传细节重新堆回数据 hook。
- 上传草稿模型：上传弹窗通过 `src/features/upload/uploadDraftModel.js` 在提交前生成批次摘要、整体进度、文件大小展示、同批重复文件检测和本地阻断原因，`UploadModal` 只负责预览 URL 生命周期与提交流程，`UploadProgressMeter` 只渲染批次进度，`UploadBatchList` 只展示每张图的缩略图、状态、标题和错误，避免后续加入跨账号重复检测、容量提示或压缩选项时继续堆进一个组件。
- 上传选择状态边界：`src/features/upload/useUploadDraftSelection.js` 统一管理批量选择、预览 URL 创建 / 释放、单项更新 / 移除、待上传条目筛选和草稿进度模型，`UploadModal` 保留表单输入与提交编排；后续扩展容量提示、跨批次重复检测或可选压缩时优先扩展这个 hook 和 `uploadDraftModel.js`。

## 产品角色

长期只保留三个访问层级：

- 访客：浏览公开内容、打开大图、下载、复制分享链接。
- 用户：访客能力 + 上传图片 + 编辑/删除自己的图片 + 查看个人图片。
- 管理员：用户能力 + 管理全部图片 + 管理用户 + 查看审计日志 + 全站设置。

不要再引入口令式管理，也不要让前端承担权限判断的最终责任。

## 目标模块

### 1. 公开画廊

职责：

- 展示公开图片。
- 搜索标题、描述、上传者、标签。
- 时间筛选、标签筛选、用户筛选。
- 分页或无限滚动。
- 打开单图详情。

扩展方向：

- 精选图片。
- 排序：最新、最早、标题、上传者、标签。
- 单图详情页 SEO 预览。

### 2. 上传中心

职责：

- 批量选择图片。
- 标题、描述、标签录入。
- 单项失败重试。
- 上传到 `public/<user_id>/<uuid>.<ext>`。

扩展方向：

- 总进度条。
- 重复检测。
- 每日上传限额。
- 用户容量限制。
- 上传前预览。

明确约束：

- 用户当前要求不压缩图片，所以不要默认加入压缩。
- 如果以后需要优化流量，应新增“可选压缩/生成缩略图”，不能替换原图。

### 3. 图片详情

职责：

- 原图查看。
- 上一张/下一张浏览。
- 键盘方向键切换。
- 下载原图。
- 复制分享链接。
- 举报公开图片。
- 编辑标题、描述、标签。
- 删除图片。

扩展方向：

- 复制图片 URL。
- 单图公开详情页的 meta 信息。

### 4. 管理后台

分为六个页签：

- 运维概览：总量、容量、用户确认状态、最近上传、最近操作和待处理项。
- 图片管理：批量选择、批量删除、批量下载、按上传者和可见性筛图。
- 用户管理：用户列表、管理员切换、上传数量、邮箱确认状态。
  在关闭公开注册后，管理员应能通过邀请制继续发放账号。
- 举报处理：举报队列、状态筛选、处理备注和重新打开。
- 审计日志：管理员和用户关键操作记录。
- 站点设置：上传限制、预设标签、背景资源、公开开关。

当前管理后台已覆盖 `运维概览`、`图片管理`、`用户管理`、`举报处理`、`审计日志` 和 `站点设置`。

### 5. 用户中心

职责：

- 当前登录用户资料。
- 我的图片。
- 我的上传数量。
- 我的标签统计。
- 退出登录。
- 登录弹窗提供注册、邮箱确认重发、密码重置邮件入口。

第一版可以不用独立页面，只在登录后提供“我的图片”筛选入口；后续再拆出完整用户中心。

## 数据模型规划

### 已有表

`public.memories`

- `id`
- `title`
- `caption`
- `image_url`
- `storage_path`
- `owner_id`
- `owner_email`
- `tags`
- `file_size_bytes`
- `is_featured`
- `visibility_status`
- `created_at`

`public.admin_users`

- `user_id`
- `created_at`

`public.user_profiles`

- `user_id`
- `display_name`
- `bio`
- `can_upload`
- `upload_limit_total`
- `created_at`
- `updated_at`

### 已新增表

#### `public.admin_audit_logs`

用途：记录关键管理操作，补齐后台安全闭环。

字段：

- `id uuid primary key`
- `actor_user_id uuid`
- `actor_email text`
- `action text`
- `target_type text`
- `target_id text`
- `target_label text`
- `details jsonb`
- `created_at timestamptz`

动作类型：

- `delete_memory`
- `update_memory`
- `grant_admin`
- `revoke_admin`
- `update_user_upload_policy`
- `resolve_report`

#### `public.memory_reports`

用途：记录访客或用户对公开图片的举报，并支持管理员处理状态流转。

字段：

- `id uuid primary key`
- `memory_id uuid`
- `reporter_user_id uuid`
- `reporter_email text`
- `reporter_fingerprint text`
- `reason text`
- `note text`
- `status text`
- `resolution_note text`
- `resolved_by uuid`
- `resolved_at timestamptz`
- `created_at timestamptz`

#### `public.memory_favorites`

用途：记录登录用户收藏过的图片，让“我的收藏”成为独立内容范围，而不是只靠标签模拟。

字段：

- `user_id uuid references auth.users(id)`
- `memory_id uuid references public.memories(id)`
- `created_at timestamptz`

#### `public.user_profiles`

用途：扩展用户状态，不直接修改 `auth.users`。

字段：

- `user_id uuid primary key references auth.users(id)`
- `email text`
- `display_name text`
- `can_upload boolean default true`
- `upload_limit_total int`
- `created_at timestamptz`
- `updated_at timestamptz`

上传权限已由 `public.can_upload_memory()` 和 RLS 强制执行，前端只负责提前提示。

#### `public.site_settings`

用途：让管理员在网页里调整站点配置。

字段建议：

- `key text primary key`
- `value jsonb`
- `updated_at timestamptz`
- `updated_by uuid`

已接入配置项：

- 默认标签列表。
- 每张图片最大大小。
- 单次上传最大张数。
- 每小时上传上限。
- 每日上传上限。
- 每小时邀请上限。
- 每日邀请上限。
- 普通用户上传开关。
- 公开注册开关。
- 管理员邀请用户入口。

- 站点设置已成为权限策略的公开配置层，适合继续承载轻量级访问规则。
- 当采用邀请制时，后台应能看到邀请待确认用户数，并给出 Auth 配置对齐提醒。

## 服务端边界

高风险操作必须走 Edge Function：

- `manage-memories`：管理员图片列表、服务端筛选、排序、分页和容量统计。
- `manage-overview`：管理员运维概览、近期上传、近期操作、用户确认状态和待处理项。
- `delete-memory`：删除 Storage 对象 + 删除 DB 记录 + 写审计日志。
- `update-memory`：编辑图片信息、精选、可见性 + 写审计日志。
- `manage-users`：读取用户列表、设置管理员、调整上传权限 + 写审计日志。
- `submit-report`：接收访客或用户对公开图片的举报。
- `manage-reports`：管理员读取举报队列、更新处理状态 + 写审计日志。
- `media-urls`：按图片可见性、owner、管理员身份返回 Storage signed URL。
- `storage.objects`：不开放匿名 select；直读仅限对象路径 owner 和管理员。

低风险配置读写可以直接走 Supabase RLS：

- `site_settings`：公开读取，只有管理员可插入/更新。

RLS 仍作为第一层防线：

- 访客只读公开图片。
- 登录用户只能插入自己的图片。
- 登录用户只能编辑自己的图片。
- 管理员通过 `is_admin(auth.uid())` 管理全部图片。
- 下架图片仍保留文件和记录，但不会进入匿名公开画廊或精选列表。
- 前端组件不要直接读取 `memory.image_url` 渲染图片，应走媒体 URL 适配层，方便后续切换 signed URL 或 private bucket。

不要在客户端暴露 service role key。不要让客户端直接访问 `auth.users`。

## 前端架构规划

当前文件还能继续工作，但后续应逐步拆分：

```text
src/
  app/              App 级状态、路由状态、全局布局
  components/       通用 UI 组件
  styles/           全局基础样式、壳层样式、响应式入口
  features/
    gallery/        公开画廊、筛选、分页
    viewer/         大图查看器、下载、分享
    upload/         批量上传
    admin/          管理后台
    auth/           登录注册
  hooks/            数据 hooks
  lib/              Supabase、下载、路由、标签等工具
  data/             静态预设
```

拆分原则：

- `App.jsx` 只负责组合模块、全局弹窗、URL 状态。
- 每个 feature 自己管理 UI 子组件。
- Supabase 读写集中在 hooks 或服务层，不散落在组件里。
- 管理员相关 UI 和普通画廊 UI 分离。
- 每次结构性改动后运行 `npm run verify`，保证构建、关键文件、权限边界、移动端样式和旧口令残留检查通过。
- 对访客主路径和分享页回归，补充运行 `npm run smoke`：它会以 demo 数据模式起本地预览站，并自动验证桌面端与手机视口下的首页、画廊、大图查看器、登录弹窗和云端 `share-memory` 预览页；若提供 `SMOKE_ADMIN_SESSION_JSON` / `SMOKE_USER_SESSION_JSON` 会话，脚本会优先直接注入登录态；否则再退回 `SMOKE_ADMIN_*` / `SMOKE_USER_*` 邮箱密码，从而继续验证已登录用户和管理员路径。
- 对已登录 smoke 接入，补充运行 `npm run smoke:session -- --role admin|user --email ... --password ...`：脚本会直接生成可写入 `.env` 的 `SMOKE_*_SESSION_JSON`，避免手工从浏览器 localStorage 提取会话。
- 对 smoke 环境诊断，补充运行 `npm run smoke:doctor`：脚本会检查 Supabase 前端配置、浏览器路径、分享页远端检查前提，以及管理员/普通用户 smoke 是否已具备会话或邮箱密码，避免每次回归前靠人工猜环境是否齐全。
- 对手工验收归档，补充运行 `npm run qa:init -- --env staging|production`：脚本会基于 `docs/MANUAL_QA_TEMPLATE.md` 直接生成 `docs/manual-qa-runs/YYYY-MM-DD-<env>-manual-qa.md`，让每次验收不是只有模板，而是有可提交、可留档的真实记录文件。

当前进展：

- `gallery / viewer / upload / auth / user` 已开始迁入 `src/features/`，公开站前端不再全部挂在 `src/components/` 根目录。
- `gallery` 与 `viewer` 已继续拆出 feature 内部子组件和格式化工具，不再由单文件同时承担状态、渲染和局部表单实现。
- `upload / auth / user` 也已继续拆出 feature 内部表单、批次列表、辅助动作和格式化工具，公开站六个核心模块的结构层级已基本对齐。
- 样式已从单个大文件拆成入口 + 分层文件，当前由 `src/styles.css` 汇总 `styles/`、`features/` 和 `features/admin/` 下的样式资源。
- 首页数据与弹窗编排已继续下沉到 `src/app/useHomePageModel.js`，`App.jsx` 主要负责页面组合，`AppOverlays.jsx` 主要负责分组后的弹窗渲染。
- `AdminPanel.jsx` 已开始按页签拆分到 `src/features/admin/`，概览、图片管理、用户、举报、日志、设置已经独立成子组件。
- 后台顶部统计区和页签导航也已抽成共享组件，`AdminPanel.jsx` 主要保留状态编排。
- `src/app/` 已落地为 App 级边界：`AppOverlays.jsx` 负责全局弹窗编排，`lazyPanels.js` 负责按需加载，`useAppUiState.js` 负责背景、查看器和筛选状态。
- `App.jsx` 已收口为页面组合层，不再直接堆叠弹窗实现细节；后续继续优化时应优先沿着 `app/` 与 `features/` 边界扩展代码分割。

## 实施路线

### Phase 1：补安全闭环（已完成）

目标：每个关键操作都能追踪。

已完成：

- 新增 `admin_audit_logs` 表。
- `delete-memory` 写删除日志。
- `update-memory` 写编辑日志。
- `manage-users` 写授权/取消授权日志。
- 管理后台新增 `操作日志` 页签。

验收：

- 删除图片后能看到日志。
- 修改标题/标签后能看到日志。
- 设置/取消管理员后能看到日志。
- 匿名用户无法读取日志。

### Phase 2：用户中心和用户状态（已完成）

目标：普通用户也有清晰的个人管理入口。

已完成：

- 新增“我的图片”入口。
- 可筛出当前用户上传图片。
- 显示上传数量、标签统计。
- 预留 `user_profiles` 表。
- 支持用户编辑显示名和简介。

验收：

- 普通用户无需进入管理员后台即可管理自己的内容。
- 管理员仍可查看全部。

### Phase 3：站点设置（已完成）

目标：减少手工改代码/SQL。

已完成：

- 新增 `site_settings`。
- 管理后台新增 `站点设置` 页签。
- 管理预设标签。
- 管理单图上传大小和单次批量上传数量。

验收：

- 修改预设标签不需要改前端代码。
- 上传大小和单次批量数量由配置控制。

### Phase 4：规模化图片管理（主体已完成）

目标：图库变大后仍然可用。

已完成：

- 图片排序。
- 管理后台服务端筛选，而不只筛已加载数据。
- 容量统计。
- 新上传图片记录 `file_size_bytes`，历史旧图显示大小未知数量。
- 批量下载 ZIP。
- 管理端显示 ZIP 生成进度。
- 历史图片大小回填。
- 运维概览汇总总量、容量、用户、待处理项、最近上传和最近操作。
- 举报处理队列、处理备注、重新打开和举报审计日志。

后续增强：

- 更细的容量统计，例如按用户分组。
- 服务器端生成 ZIP，避免浏览器一次性处理过多大图。

验收：

- 1000 张图片以内仍然能快速管理。
- 管理员能知道总容量和用户占用。
- 管理员打开后台后能先看到站点是否有异常项。

### Phase 5：公开体验完善（主体已完成）

目标：站点作为公开作品可分享。

已完成：

- 单图详情 meta 预览。
- 精选图片。
- 首页故事/介绍模块。
- 移动端顶部导航、画廊筛选、上传弹窗、大图查看器、管理后台的响应式布局。
- 手机端弹窗使用 `dvh` 高度，避免浏览器地址栏导致操作按钮不可见。
- 横向内容如管理页签、统计胶囊和表格支持触控滚动。
- 补充 `prefers-reduced-motion`，降低系统要求减少动画时的动效。

后续增强：

- 如果未来上线并要求社交平台真实抓取单图缩略图，需要引入 SSR/边缘渲染或部署端动态 meta。
- 真实设备截图回归测试。

验收：

- 分享链接在社交平台有合理标题和缩略图。
- 移动端主要流程可用。

## 下一步立即执行

下一步做上线前配置准备，但当前按你的要求先不上线。

Phase 1 已经补上后台操作日志，Phase 2 已经给普通用户提供独立入口，Phase 3 已经把预设标签、单图大小、批量上传数量和普通用户上传开关放进站点设置，Phase 4 已经解决后台服务端筛选、排序、分页、容量统计、ZIP 下载、历史大小回填、运维概览和举报治理，Phase 5 已经补首页精选、故事模块、客户端 meta、`share-memory` 服务端分享预览模块和移动端主流程布局。接下来如果继续完善，应先做上线前配置清单，并把分享模块真正部署到云端，但不实际公开发布站点。

下一步不实际发布，只做准备项：

- 公开部署前的 `site_url`、Auth redirect URL、生产域名和社交抓取方案。
- 生产环境变量清单。
- 上线前检查表。
- 保持 `npm run verify` 作为本地总验收入口。
- 保持 `npm run smoke` 作为核心访客路径与分享页回归入口。
