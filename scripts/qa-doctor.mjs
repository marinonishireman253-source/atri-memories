import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const runsDir = join(root, 'docs', 'manual-qa-runs');

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

function statusLine(ok, label, detail) {
  const prefix = ok ? '[OK]' : '[WARN]';
  process.stdout.write(`${prefix} ${label}${detail ? `: ${detail}` : ''}\n`);
}

export function latestManualQaRun() {
  if (!existsSync(runsDir)) return null;

  const files = readdirSync(runsDir)
    .filter((name) => name.endsWith('-manual-qa.md'))
    .map((name) => {
      const path = join(runsDir, name);
      return {
        name,
        path,
        mtimeMs: statSync(path).mtimeMs,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return files[0] ?? null;
}

export function stripCodeBlocks(content) {
  return content.replace(/```[\s\S]*?```/g, '');
}

export function qaStatus(content) {
  return stripCodeBlocks(content).match(/^<!--\s*QA_AUDIT_STATUS:\s*([a-z-]+)\s*-->$/im)?.[1]?.toLowerCase() ?? 'unknown';
}

export function countUncheckedItems(content) {
  return (content.match(/- \[ \]/g) ?? []).length;
}

export function blankFieldLabels(content) {
  const labels = [];

  for (const line of content.split('\n')) {
    const match = line.match(/^- ([^:]+)：\s*$/);
    if (match) labels.push(match[1].trim());
  }

  return labels;
}

export function analyzeManualQaRun(path) {
  const content = readFileSync(path, 'utf8');
  const status = qaStatus(content);
  const uncheckedCount = countUncheckedItems(content);
  const blankFields = blankFieldLabels(content);

  return {
    path,
    relativePath: relative(root, path),
    status,
    uncheckedCount,
    blankFields,
    canBeCompletionEvidence: status === 'passed' && uncheckedCount === 0 && blankFields.length === 0,
  };
}

function selectedManualQaRun(options) {
  if (!options.file) return latestManualQaRun();

  const path = resolve(root, options.file);
  if (!existsSync(path)) {
    return {
      missingPath: path,
      relativePath: relative(root, path),
    };
  }

  return {
    name: relative(root, path),
    path,
    mtimeMs: statSync(path).mtimeMs,
  };
}

function printNextAction(analysis) {
  process.stdout.write('\n建议下一步\n');
  process.stdout.write('--------\n');
  if (!analysis) {
    process.stdout.write('- 运行 `npm run qa:init -- --env staging` 生成一份验收记录。\n');
  } else if (analysis.status === 'pending') {
    process.stdout.write('- 继续填写这份 QA 记录，完成后把 `QA_AUDIT_STATUS` 改成 `passed`、`blocked` 或 `failed`。\n');
  } else if (analysis.status === 'passed' && !analysis.canBeCompletionEvidence) {
    process.stdout.write('- 这份 QA 已标记 passed，但仍有未勾选项或空白字段；补齐后再运行 `npm run qa:doctor`。\n');
  } else if (analysis.canBeCompletionEvidence) {
    process.stdout.write('- 运行 `npm run completion:audit`，让完成度审计读取这份 QA 证据。\n');
  } else {
    process.stdout.write('- 根据当前状态处理阻断项或重新生成新一轮 QA 记录。\n');
  }
}

function runCli() {
  const options = parseArgs(process.argv.slice(2));
  const selected = selectedManualQaRun(options);

  if (options.help === 'true') {
    process.stdout.write(`QA Doctor

用法：
  npm run qa:doctor
  npm run qa:doctor -- --file docs/manual-qa-runs/2026-05-25-local-current-manual-qa.md
  npm run qa:doctor -- --json

可选参数：
  --file <path>  检查指定手工 QA 记录；默认检查最新记录
  --json         输出结构化 JSON，供其他脚本或 CI 消费
  --help         显示帮助
`);
    return;
  }

  if (!selected) {
    if (options.json === 'true') {
      process.stdout.write(`${JSON.stringify({ found: false, canBeCompletionEvidence: false }, null, 2)}\n`);
      return;
    }
    process.stdout.write('QA Doctor\n');
    process.stdout.write('=========\n');
    statusLine(false, '最新手工 QA 记录', '未找到 docs/manual-qa-runs/*-manual-qa.md');
    printNextAction(null);
    return;
  }

  if (selected.missingPath) {
    if (options.json === 'true') {
      process.stdout.write(`${JSON.stringify({ found: false, path: selected.relativePath, canBeCompletionEvidence: false }, null, 2)}\n`);
      return;
    }
    process.stdout.write('QA Doctor\n');
    process.stdout.write('=========\n');
    statusLine(false, '手工 QA 记录', `未找到 ${selected.relativePath}`);
    printNextAction(null);
    return;
  }

  const analysis = analyzeManualQaRun(selected.path);

  if (options.json === 'true') {
    process.stdout.write(`${JSON.stringify({ found: true, ...analysis }, null, 2)}\n`);
    return;
  }

  process.stdout.write('QA Doctor\n');
  process.stdout.write('=========\n');
  statusLine(true, options.file ? '手工 QA 记录' : '最新手工 QA 记录', `${analysis.relativePath}（${analysis.status}）`);
  statusLine(analysis.status !== 'unknown', 'QA_AUDIT_STATUS 标记', analysis.status);
  statusLine(analysis.status === 'passed', '完成证据状态', analysis.status === 'passed' ? '已标记 passed' : '尚未标记 passed');
  statusLine(analysis.uncheckedCount === 0, '未勾选项目', analysis.uncheckedCount ? `${analysis.uncheckedCount} 项仍未勾选` : '全部已处理');
  statusLine(analysis.blankFields.length === 0, '空白字段', analysis.blankFields.length ? analysis.blankFields.slice(0, 8).join('、') : '未发现空白字段');
  statusLine(analysis.canBeCompletionEvidence, '可作为完成审计证据', analysis.canBeCompletionEvidence ? '是' : '否');
  printNextAction(analysis);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
