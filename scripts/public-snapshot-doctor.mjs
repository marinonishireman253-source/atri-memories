import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function normalizeStatusLines(statusLines) {
  if (Array.isArray(statusLines)) return statusLines.filter(Boolean);
  return String(statusLines ?? '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
}

function addIssue({ strict, warnings, failures }, message, { strictOnly = false } = {}) {
  if (strict || !strictOnly) {
    failures.push(message);
    return;
  }
  warnings.push(message);
}

function statusFrom(failures, warnings) {
  if (failures.length) return 'fail';
  if (warnings.length) return 'warn';
  return 'ok';
}

export function analyzePublicSnapshotState(input, options = {}) {
  const strict = Boolean(options.strict);
  const state = {
    branchName: String(input.branchName ?? '').trim(),
    statusLines: normalizeStatusLines(input.statusLines),
    localMainExists: Boolean(input.localMainExists),
    publicMainExists: Boolean(input.publicMainExists),
    hasMergeBase: Boolean(input.hasMergeBase),
    localAhead: Number(input.localAhead ?? 0),
    localBehind: Number(input.localBehind ?? 0),
    hasPublicWorkflowDoc: Boolean(input.hasPublicWorkflowDoc),
  };
  const facts = [];
  const warnings = [];
  const failures = [];
  const nextActions = [];

  if (state.branchName) {
    facts.push(`当前分支：${state.branchName}`);
  } else {
    addIssue({ strict: true, warnings, failures }, '无法确定当前分支。');
    nextActions.push('先确认当前目录是 ATRI 仓库内的有效 Git checkout。');
  }

  if (state.statusLines.length) {
    addIssue({ strict, warnings, failures }, `工作区有 ${state.statusLines.length} 条未提交改动。`, { strictOnly: true });
    nextActions.push('公开快照检查前先提交、暂存或转入干净 worktree。');
  } else {
    facts.push('工作区干净。');
  }

  if (!state.localMainExists) {
    addIssue({ strict, warnings, failures }, '本地 main 不存在。', { strictOnly: true });
    nextActions.push('先恢复或确认完整开发主线分支。');
  } else {
    facts.push('本地 main 存在。');
  }

  if (!state.publicMainExists) {
    addIssue({ strict, warnings, failures }, 'origin/main 不存在。', { strictOnly: true });
    nextActions.push('先确认公开快照远端是否配置为 origin/main。');
  } else {
    facts.push('origin/main 存在。');
  }

  if (state.localMainExists && state.publicMainExists) {
    if (state.hasMergeBase) {
      addIssue(
        { strict, warnings, failures },
        'main 与 origin/main 共享历史，不再是隔离的公开快照历史。',
        { strictOnly: true },
      );
      nextActions.push('先确认远端是否被普通主线推送覆盖；不要继续按公开快照流程发布。');
    } else {
      facts.push(`公开快照历史与本地开发历史已隔离：本地 ahead ${state.localAhead}，behind ${state.localBehind}。`);
      nextActions.push('如需刷新公开仓库，只能通过脱敏导出/快照流程更新 origin/main。');
    }
  }

  if (!state.hasPublicWorkflowDoc) {
    addIssue({ strict, warnings, failures }, '缺少 docs/PUBLIC_REPO_WORKFLOW.md。', { strictOnly: true });
    nextActions.push('先补齐公开仓库双轨流程文档，再交接或刷新公开快照。');
  } else {
    facts.push('公开仓库流程文档存在。');
  }

  if (!nextActions.length) {
    nextActions.push('公开快照流程状态清晰；继续运行 verify 和公开敏感信息检查。');
  }

  return {
    input: state,
    strict,
    status: statusFrom(failures, warnings),
    facts,
    warnings,
    failures,
    nextActions,
  };
}

function renderSection(title, entries, prefix) {
  if (!entries.length) return '';
  return [`\n${title}`, ...entries.map((entry) => `${prefix} ${entry}`)].join('\n');
}

export function renderPublicSnapshotReport(analysis) {
  const statusLine = analysis.status === 'fail'
    ? '[FAIL] 公开快照流程检查未通过'
    : analysis.status === 'warn'
      ? '[WARN] 公开快照流程检查有警告'
      : '[OK] 公开快照流程检查通过';

  return [
    'Public Snapshot Doctor',
    '======================',
    `模式：${analysis.strict ? 'strict' : 'default'}`,
    statusLine,
    renderSection('事实', analysis.facts, '[OK]'),
    renderSection('警告', analysis.warnings, '[WARN]'),
    renderSection('阻断', analysis.failures, '[FAIL]'),
    renderSection('下一步', analysis.nextActions, '-'),
  ].filter(Boolean).join('\n');
}

export function exitCodeForPublicSnapshotAnalysis(analysis) {
  return analysis.status === 'fail' ? 1 : 0;
}

function parseArgs(argv) {
  const options = { strict: false };
  for (const arg of argv) {
    if (arg === '--strict') options.strict = true;
    else if (arg === '--help') options.help = true;
    else throw new Error(`未知参数：${arg}`);
  }
  return options;
}

function printHelp() {
  process.stdout.write(`用法：
  npm run public:snapshot:doctor
  npm run public:snapshot:doctor -- --strict

说明：
  检查本地完整开发历史与 origin/main 公开快照历史是否保持双轨隔离。
  本命令只读，不会 pull、push、merge、rebase、checkout、reset 或写文件。
`);
}

function runGit(args) {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function gitRefExists(ref) {
  try {
    execFileSync('git', ['show-ref', '--verify', '--quiet', ref], {
      cwd: root,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function hasMergeBase(left, right) {
  try {
    execFileSync('git', ['merge-base', left, right], {
      cwd: root,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function readAheadBehind() {
  const output = runGit(['rev-list', '--left-right', '--count', 'main...origin/main']);
  const [aheadRaw, behindRaw] = output.split(/\s+/);
  return {
    localAhead: Number.parseInt(aheadRaw ?? '0', 10) || 0,
    localBehind: Number.parseInt(behindRaw ?? '0', 10) || 0,
  };
}

function collectPublicSnapshotState() {
  const localMainExists = gitRefExists('refs/heads/main');
  const publicMainExists = gitRefExists('refs/remotes/origin/main');
  const counts = localMainExists && publicMainExists
    ? readAheadBehind()
    : { localAhead: 0, localBehind: 0 };

  return {
    branchName: runGit(['branch', '--show-current']),
    statusLines: normalizeStatusLines(runGit(['status', '--porcelain'])),
    localMainExists,
    publicMainExists,
    hasMergeBase: localMainExists && publicMainExists ? hasMergeBase('main', 'origin/main') : false,
    ...counts,
    hasPublicWorkflowDoc: existsSync(join(root, 'docs', 'PUBLIC_REPO_WORKFLOW.md')),
  };
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`Public Snapshot Doctor 参数错误：${error.message}\n`);
    process.exit(1);
  }

  if (options.help) {
    printHelp();
    return;
  }

  const analysis = analyzePublicSnapshotState(collectPublicSnapshotState(), options);
  process.stdout.write(`${renderPublicSnapshotReport(analysis)}\n`);
  process.exit(exitCodeForPublicSnapshotAnalysis(analysis));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
