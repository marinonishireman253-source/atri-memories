import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportsDir = join(root, 'output', 'release');

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = 'true';
      continue;
    }
    options[key] = next;
    index += 1;
  }
  return options;
}

function printHelp() {
  console.log(`用法：
  npm run release:preflight
  npm run release:preflight -- --env staging --slug prelaunch
  npm run release:preflight -- --skip-smoke
  npm run release:preflight -- --strict

可选参数：
  --env <name>      预发布环境名，默认 local
  --slug <text>     追加到报告文件名里的短标识
  --skip-smoke      只跑 verify 和 doctor，不跑浏览器 smoke
  --strict          有任何 warning / 跳过项时以失败退出
  --help            显示帮助

默认执行：
  npm run verify
  npm run deploy:doctor
  npm run launch:doctor
  npm run smoke:doctor
  npm run qa:doctor
  npm run smoke
`);
}

function sanitizeSegment(value, fallback) {
  return (value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || fallback;
}

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function stripAnsi(value) {
  return String(value ?? '').replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
}

function runCommand(label, command, args) {
  const startedAt = new Date();
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      FORCE_COLOR: '0',
    },
    maxBuffer: 1024 * 1024 * 30,
  });
  const endedAt = new Date();
  const output = stripAnsi(`${result.stdout ?? ''}${result.stderr ?? ''}`);
  const warningLines = output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) =>
      line.startsWith('[WARN]')
      || line.startsWith('!')
    );

  return {
    label,
    command: [command, ...args].join(' '),
    status: result.status ?? 1,
    ok: result.status === 0,
    startedAt,
    endedAt,
    durationMs: endedAt.getTime() - startedAt.getTime(),
    output,
    warningLines,
    error: result.error?.message ?? '',
  };
}

function renderCommandSummary(result) {
  const status = result.ok ? 'PASS' : 'FAIL';
  const warningCount = result.warningLines.length;
  return `| ${result.label} | ${status} | ${warningCount} | ${Math.round(result.durationMs / 1000)}s |`;
}

function renderCommandDetail(result) {
  const warnings = result.warningLines.length
    ? result.warningLines.map((line) => `- ${line}`).join('\n')
    : '- 无';

  return `### ${result.label}

- 命令：\`${result.command}\`
- 状态：${result.ok ? 'PASS' : 'FAIL'}
- 耗时：${Math.round(result.durationMs / 1000)}s
- 警告 / 跳过：
${warnings}

<details>
<summary>完整输出</summary>

\`\`\`text
${result.output.trim() || '(empty output)'}
\`\`\`

</details>
`;
}

function renderReport({ envName, generatedAt, results, skippedSmoke, strictMode }) {
  const failed = results.filter((result) => !result.ok);
  const warnings = results.flatMap((result) =>
    result.warningLines.map((line) => ({ command: result.label, line })),
  );
  const status = failed.length || (strictMode && warnings.length)
    ? 'FAIL'
    : (warnings.length ? 'PASS_WITH_WARNINGS' : 'PASS');
  const nextActions = [];

  if (warnings.some((item) => item.line.includes('Supabase CLI'))) {
    nextActions.push('安装并登录 Supabase CLI，然后重新运行 `npm run deploy:doctor`。');
  }
  if (warnings.some((item) => item.line.includes('VITE_PUBLIC_SITE_URL'))) {
    nextActions.push('配置生产环境 `VITE_PUBLIC_SITE_URL`。');
  }
  if (warnings.some((item) => item.line.includes('content-type'))) {
    nextActions.push('部署最新 `share-memory` Edge Function，并确认远端响应头为 `text/html; charset=utf-8`。');
  }
  if (warnings.some((item) => item.line.includes('已登录 smoke') || item.line.includes('SMOKE_ADMIN') || item.line.includes('SMOKE_USER'))) {
    nextActions.push('生成或配置管理员 / 普通用户 smoke 会话，补齐 Cloud linked 已登录回归。');
  }
  if (warnings.some((item) => item.line.includes('完成证据状态') || item.line.includes('未勾选项目') || item.line.includes('空白字段') || item.line.includes('可作为完成审计证据'))) {
    nextActions.push('继续填写最新手工 QA 记录，并运行 `npm run qa:doctor` 确认它可作为完成审计证据。');
  }
  if (warnings.some((item) => item.line.includes('Supabase Auth') || item.line.includes('PUBLIC_SITE_URL'))) {
    nextActions.push('到 Supabase Dashboard 核对 Auth redirect URLs 和 Edge Function Secret `PUBLIC_SITE_URL`。');
  }
  if (!nextActions.length && failed.length === 0) {
    nextActions.push('自动化预发布检查已通过；继续填写手工 QA 记录。');
  }

  return `# ATRI Memories Release Preflight

- 生成时间：${generatedAt.toISOString()}
- 环境：${envName}
- 总体状态：${status}
- Smoke：${skippedSmoke ? '已跳过' : '已执行'}
- Strict：${strictMode ? '已启用' : '未启用'}

## 命令摘要

| 检查项 | 结果 | 警告数 | 耗时 |
| --- | --- | ---: | ---: |
${results.map(renderCommandSummary).join('\n')}

## 待处理项

${nextActions.map((item) => `- ${item}`).join('\n')}

## 详细结果

${results.map(renderCommandDetail).join('\n')}
`;
}

const options = parseArgs(process.argv.slice(2));
if (options.help === 'true') {
  printHelp();
  process.exit(0);
}

const envName = sanitizeSegment(options.env, 'local');
const slug = options.slug ? sanitizeSegment(options.slug, '') : '';
const skippedSmoke = options['skip-smoke'] === 'true';
const strictMode = options.strict === 'true';
const commands = [
  ['verify', 'npm', ['run', 'verify']],
  ['deploy:doctor', 'npm', ['run', 'deploy:doctor']],
  ['launch:doctor', 'npm', ['run', 'launch:doctor']],
  ['smoke:doctor', 'npm', ['run', 'smoke:doctor']],
  ['qa:doctor', 'npm', ['run', 'qa:doctor']],
];

if (!skippedSmoke) {
  commands.push(['smoke', 'npm', ['run', 'smoke']]);
}

const results = commands.map(([label, command, args]) => {
  console.log(`Running ${label}...`);
  return runCommand(label, command, args);
});

const generatedAt = new Date();
const filenameParts = [timestampForFile(generatedAt), envName];
if (slug) filenameParts.push(slug);
filenameParts.push('release-preflight.md');

mkdirSync(reportsDir, { recursive: true });
const outputPath = join(reportsDir, filenameParts.join('-'));
writeFileSync(outputPath, renderReport({ envName, generatedAt, results, skippedSmoke, strictMode }), 'utf8');

const failed = results.filter((result) => !result.ok);
const warningCount = results.reduce((sum, result) => sum + result.warningLines.length, 0);
const relativePath = relative(root, outputPath);
console.log(`Release preflight report: ${relativePath}`);
if (failed.length) {
  console.error(`Release preflight failed: ${failed.map((result) => result.label).join(', ')}`);
  process.exit(1);
}
if (strictMode && warningCount > 0) {
  console.error(`Release preflight strict failed: ${warningCount} warning(s) remain.`);
  process.exit(1);
}
console.log('Release preflight completed.');
