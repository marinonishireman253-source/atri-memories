# Smoke 测试接入指南

目标：把 `npm run smoke` 从“知道怎么跑的人才能跑”变成“任何接手项目的人都能复现”的正式流程。

本文件只说明回归测试接入，不替代：

- [MASTER_DELIVERY_PLAN.md](./MASTER_DELIVERY_PLAN.md)：总体交付顺序
- [SITE_ARCHITECTURE_PLAN.md](./SITE_ARCHITECTURE_PLAN.md)：模块边界
- [LAUNCH_READINESS_CHECKLIST.md](./LAUNCH_READINESS_CHECKLIST.md)：上线前验收

## 1. 当前 smoke 覆盖范围

`npm run smoke` 当前会覆盖三层：

1. 访客桌面端
2. 访客手机视口
3. 云端 `share-memory` 服务端预览页

其中本地浏览器路径会额外覆盖：

- 项目案例页：`/case-study`、`权限模型`、`部署与验证`、`产品浏览路径`，并输出 `smoke-case-study.png` / `smoke-mobile-case-study.png`

在提供已登录凭据后，还会继续覆盖：

4. Cloud linked 普通用户路径
5. Cloud linked 管理员路径

管理员路径会额外覆盖：

- 后台运营管理路径：`运营管理路径`、`内容运营`、`账号权限`、`治理队列`

如果当前阶段只需要证明本地功能完整、暂时不处理发布和云端账号，可以运行 `npm run smoke:local`。它只覆盖上面的第 1、2 层，不访问远端分享页，也不要求真实 Supabase 会话。

## 2. 前置条件

本地需要：

- `npm install`
- `.env` 中至少存在：
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- 本机可执行 Chrome：
  - 默认使用 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
  - 若路径不同，可设置 `SMOKE_BROWSER_PATH`

## 3. 基础命令

### 3.1 只跑访客与分享页

```bash
npm run smoke
```

这会自动：

- 用 demo 模式构建本地预览站
- 验证桌面端首页主操作、标签发现、快速浏览、搜索筛选、画廊、大图查看器、举报表单校验、详情标签筛选回流、认证弹窗登录 / 注册切换 / 邮箱必填提示
- 验证项目案例页 `/case-study`，包括 `权限模型`、`部署与验证`、`npm run verify` 和 `产品浏览路径`
- 验证手机视口首页、查看器、认证弹窗登录 / 注册切换和项目案例页
- 验证云端 `share-memory` 的 HTML / OG meta / canonical

### 3.2 只跑本地访客主流程

```bash
npm run smoke:local
```

这会使用同一个 Playwright 脚本，但追加 `--local-only`：

- 强制使用 demo 数据模式构建本地预览站
- 验证桌面端首页主操作、标签发现、快速浏览、搜索筛选、画廊、大图查看器、举报表单校验、详情标签筛选回流、认证弹窗登录 / 注册切换 / 邮箱必填提示
- 验证项目案例页 `/case-study`，包括 `权限模型`、`部署与验证`、`npm run verify` 和 `产品浏览路径`
- 验证手机视口首页、查看器、认证弹窗登录 / 注册切换和项目案例页
- 跳过远端 `share-memory` 和 Cloud linked 已登录场景

这个命令适合日常本地功能回归，也适合当前“先不发布”的阶段。

### 3.3 先做静态门禁

```bash
npm run verify
```

这只覆盖构建和质量检查，不覆盖浏览器行为。

### 3.4 先做环境诊断

```bash
npm run smoke:doctor
```

这会直接告诉你：

- `.env` 里的 Supabase 前端配置是否齐全
- Chrome 路径是否可用
- `share-memory` 远端真实预览是否能读取公开图片并输出 OG/Twitter meta
- 管理员 / 普通用户已登录 smoke 会不会被跳过
- 下一步应该去生成会话还是直接跑 `smoke`

## 4. 已登录 smoke 接入方式

已登录 smoke 有两种接入方式，优先级固定如下：

1. `SMOKE_ADMIN_SESSION_JSON` / `SMOKE_USER_SESSION_JSON`
2. `SMOKE_ADMIN_EMAIL` / `SMOKE_ADMIN_PASSWORD`
3. `SMOKE_USER_EMAIL` / `SMOKE_USER_PASSWORD`

建议优先使用会话 JSON，因为它更稳定，不依赖当下登录流程。

### 4.1 用脚本生成会话

管理员：

```bash
npm run smoke:session -- --role admin --email admin@example.com --password 'secret'
```

普通用户：

```bash
npm run smoke:session -- --role user --email user@example.com --password 'secret'
```

默认输出格式是可直接写入 `.env` 的一行：

```bash
SMOKE_ADMIN_SESSION_JSON='{"access_token":"...","refresh_token":"..."}'
```

如果你只想拿纯 JSON：

```bash
npm run smoke:session -- --role admin --email admin@example.com --password 'secret' --format json
```

### 4.2 写入 `.env`

示例：

```dotenv
SMOKE_ADMIN_SESSION_JSON='{"access_token":"...","refresh_token":"...","expires_at":0,"expires_in":0,"token_type":"bearer","user":{"id":"...","email":"admin@example.com"}}'
SMOKE_USER_SESSION_JSON='{"access_token":"...","refresh_token":"...","expires_at":0,"expires_in":0,"token_type":"bearer","user":{"id":"...","email":"user@example.com"}}'
```

写入后再次运行：

```bash
npm run smoke
```

脚本会优先注入这些会话，而不是再走登录表单。

## 5. 已登录 smoke 当前会验证什么

### 普通用户

- `Cloud linked` 已出现
- 登录态可建立
- `我的图片` 按钮可见
- `我的空间` 弹窗可打开
- 个人中心里的 `当前画廊范围` 可见
- `批量上传` 按钮存在

### 管理员

- `Cloud linked` 已出现
- 登录态可建立
- `管理后台` 按钮可见
- 后台弹窗可打开
- 管理后台首页可见 `运营管理路径`，并覆盖 `内容运营`、`账号权限`、`治理队列`
- `用户管理` 页签可进入
- `邀请用户` 区块可见
- `站点设置` 页签可进入
- `上线准备` 区块可见

## 6. 运行产物

所有 smoke 截图都写到：

```text
output/playwright/
```

`smoke:local` 和 `smoke` 都会写入机器可读报告：

- `smoke-local-report.json`

`completion:audit` 会读取这份报告，判断最近一次本地桌面端和手机端 smoke 是否真的通过，以及截图产物是否存在且非空。

如果 `src/`、`public/`、`package.json` 或 `scripts/smoke-check.mjs` 在这份报告之后发生变化，`completion:audit` 会把报告视为过期证据，需要重新运行 `npm run smoke:local`。

当前还会输出：

- `smoke-home.png`
- `smoke-home-actions.png`
- `smoke-gallery-search.png`
- `smoke-viewer.png`
- `smoke-report-form.png`
- `smoke-viewer-tag-filter.png`
- `smoke-case-study.png`
- `smoke-auth.png`
- `smoke-auth-register.png`
- `smoke-auth-email-required.png`
- `smoke-mobile-home.png`
- `smoke-mobile-viewer.png`
- `smoke-mobile-auth.png`
- `smoke-mobile-auth-register.png`
- `smoke-mobile-case-study.png`
- 若启用已登录 smoke，还会追加：
  - `smoke-admin-admin.png`
  - `smoke-user-user.png`

## 7. 已知告警

当前 `share-memory` 仍可能输出：

- `content-type: text/plain`

现状是：

- smoke 会把它记为 warning
- 只要 HTML 正文和 OG meta 校验通过，就不会判失败
- `smoke:doctor` 和 `launch:doctor` 共用同一套真实图片预览诊断，因此两边看到的 `share-memory 真实预览` / `OG/Twitter meta` 结论应保持一致

这不是理想状态，但目前不阻断主流程回归。

## 8. 推荐执行顺序

日常改动后：

```bash
npm run verify
npm run smoke:local
npm run smoke
```

准备上线前：

```bash
npm run release:preflight
npm run smoke:doctor
npm run verify
npm run smoke
# 若需要已登录回归
npm run smoke:session -- --role admin --email ...
npm run smoke:session -- --role user --email ...
npm run smoke
```

如果只是要归档一次完整预发布证据，优先跑 `release:preflight`。它会顺序执行 `verify`、`deploy:doctor`、`launch:doctor`、`smoke:doctor`、`qa:doctor` 和 `smoke`，并在 `output/release/` 生成报告；最终发布前可追加 `-- --strict`，让 warning / 跳过项直接失败。后面几条命令适合针对某个失败或告警单独复核。

## 9. 判定标准

以下情况视为 smoke 已真正可接手：

- 新接手的人只看本文件，就知道如何生成会话
- 不需要手工去浏览器 localStorage 抠 session
- 不需要猜测哪些截图是正常产物
- 不需要猜测已登录 smoke 为何被跳过
