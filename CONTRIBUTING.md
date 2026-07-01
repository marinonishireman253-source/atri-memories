# Contributing

ATRI Memories 的改动按 [Git 标准体系](./docs/GIT_WORKFLOW.md) 执行。

提交前至少运行：

```bash
npm run git:check
npm run check
npm run build
```

涉及函数、迁移、部署或上线前检查时，运行：

```bash
npm run verify
```

准备合并或交接前，优先运行 `npm run project:check`，它会额外覆盖 Git 规则测试和移动端布局回归。

UI 或移动端改动需要附截图或 smoke 证据。任何真实密钥、服务器连接参数、账号令牌和本机会话都不能写入仓库。
