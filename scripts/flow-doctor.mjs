import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
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

function statusFrom(failures, warnings) {
  if (failures.length) return 'fail';
  if (warnings.length) return 'warn';
  return 'ok';
}

function addIssue({ strict, warnings, failures }, message, { strictOnly = false } = {}) {
  if (strict || !strictOnly) {
    failures.push(message);
    return;
  }
  warnings.push(message);
}

export function analyzeFlowState(input, options = {}) {
  const strict = Boolean(options.strict);
  const state = {
    branchName: String(input.branchName ?? '').trim(),
    isLinkedWorktree: Boolean(input.isLinkedWorktree),
    statusLines: normalizeStatusLines(input.statusLines),
    mainExists: Boolean(input.mainExists),
    originMainExists: Boolean(input.originMainExists),
    mainHasOriginMergeBase: input.mainHasOriginMergeBase !== false,
    mainAhead: Number(input.mainAhead ?? 0),
    mainBehind: Number(input.mainBehind ?? 0),
    hasPackageJson: Boolean(input.hasPackageJson),
    hasNodeModules: Boolean(input.hasNodeModules),
  };
  const warnings = [];
  const failures = [];
  const facts = [];
  const nextActions = [];

  if (!state.branchName) {
    failures.push('无法确定当前分支。');
    nextActions.push('先确认 Git 仓库状态，避免在 detached HEAD 或异常目录中继续。');
  } else {
    facts.push(`当前分支：${state.branchName}`);
  }

  facts.push(state.isLinkedWorktree ? '当前位于 linked worktree。' : '当前位于主 checkout 或普通 Git 工作区。');

  if (state.statusLines.length) {
    addIssue({ strict, warnings, failures }, `工作区有 ${state.statusLines.length} 条未提交改动。`, { strictOnly: true });
    nextActions.push('开工或合并前先提交、暂存或转入隔离 worktree。');
  } else {
    facts.push('工作区干净。');
  }

  if (!state.mainExists) {
    warnings.push('本地 main 分支不存在，无法判断主线状态。');
    nextActions.push('确认仓库默认分支名称，必要时改用实际主线分支。');
  } else if (!state.originMainExists) {
    warnings.push('origin/main 不存在，无法判断本地与远端主线差异。');
    nextActions.push('如需发布或协作，先确认远端 main 是否配置正确。');
  } else if (!state.mainHasOriginMergeBase) {
    addIssue(
      { strict, warnings, failures },
      `main 与 origin/main 没有共同祖先：本地 ahead ${state.mainAhead}，behind ${state.mainBehind}。`,
      { strictOnly: true },
    );
    nextActions.push('把 origin/main 视为独立公开快照历史；不要使用普通 pull/merge 强行混合两条主线。');
  } else if (state.mainAhead > 0 && state.mainBehind > 0) {
    addIssue(
      { strict, warnings, failures },
      `main 与 origin/main 已分叉：本地 ahead ${state.mainAhead}，behind ${state.mainBehind}。`,
      { strictOnly: true },
    );
    nextActions.push('先决定合并、变基或只做本地收口；不要盲目 pull/push。');
  } else if (state.mainBehind > 0) {
    addIssue(
      { strict, warnings, failures },
      `本地 main 落后 origin/main ${state.mainBehind} 个提交。`,
      { strictOnly: true },
    );
    nextActions.push('合并或发布前先快进本地 main。');
  } else if (state.mainAhead > 0) {
    warnings.push(`本地 main 领先 origin/main ${state.mainAhead} 个提交。`);
    nextActions.push('如需同步远端，先确认这些本地提交是否都可公开。');
  } else {
    facts.push('main 与 origin/main 没有 ahead/behind 差异。');
  }

  if (state.hasPackageJson && !state.hasNodeModules) {
    addIssue({ strict, warnings, failures }, '缺少 node_modules，当前 Node 项目依赖未安装。', { strictOnly: true });
    nextActions.push('运行 `npm ci` 后再执行构建、验证或 smoke。');
  } else if (state.hasPackageJson) {
    facts.push('Node 依赖目录存在。');
  }

  if (!nextActions.length) {
    nextActions.push(strict ? '严格流程检查通过，可以继续合并或发布前验证。' : '流程状态可继续；按改动范围运行 verify、mobile 或 smoke。');
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

export function renderFlowReport(analysis) {
  const mode = analysis.strict ? 'strict' : 'default';
  const statusLine = analysis.status === 'fail'
    ? '[FAIL] 流程检查未通过'
    : analysis.status === 'warn'
      ? '[WARN] 流程检查有警告'
      : '[OK] 流程检查通过';

  return [
    'Flow Doctor',
    '===========',
    `模式：${mode}`,
    statusLine,
    renderSection('事实', analysis.facts, '[OK]'),
    renderSection('警告', analysis.warnings, '[WARN]'),
    renderSection('阻断', analysis.failures, '[FAIL]'),
    renderSection('下一步', analysis.nextActions, '-'),
  ].filter(Boolean).join('\n');
}

export function exitCodeForAnalysis(analysis) {
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
  npm run flow:doctor
  npm run flow:doctor -- --strict

说明：
  默认模式只诊断并给出下一步建议。
  --strict 用于合并、发布或交接前，发现脏工作区、主线分叉或缺依赖会失败退出。
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

function resolveGitPath(value) {
  if (!value) return '';
  return isAbsolute(value) ? resolve(value) : resolve(root, value);
}

function readAheadBehind() {
  const output = runGit(['rev-list', '--left-right', '--count', 'main...origin/main']);
  const [aheadRaw, behindRaw] = output.split(/\s+/);
  return {
    mainAhead: Number.parseInt(aheadRaw ?? '0', 10) || 0,
    mainBehind: Number.parseInt(behindRaw ?? '0', 10) || 0,
  };
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

function collectFlowState() {
  const gitDir = resolveGitPath(runGit(['rev-parse', '--git-dir']));
  const gitCommonDir = resolveGitPath(runGit(['rev-parse', '--git-common-dir']));
  const superprojectRoot = runGit(['rev-parse', '--show-superproject-working-tree']);
  const mainExists = gitRefExists('refs/heads/main');
  const originMainExists = gitRefExists('refs/remotes/origin/main');
  const counts = mainExists && originMainExists
    ? readAheadBehind()
    : { mainAhead: 0, mainBehind: 0 };
  const mainHasOriginMergeBase = mainExists && originMainExists
    ? hasMergeBase('main', 'origin/main')
    : true;

  return {
    branchName: runGit(['branch', '--show-current']),
    isLinkedWorktree: Boolean(gitDir && gitCommonDir && gitDir !== gitCommonDir && !superprojectRoot),
    statusLines: normalizeStatusLines(runGit(['status', '--porcelain'])),
    mainExists,
    originMainExists,
    mainHasOriginMergeBase,
    ...counts,
    hasPackageJson: existsSync(join(root, 'package.json')),
    hasNodeModules: existsSync(join(root, 'node_modules')),
  };
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`Flow Doctor 参数错误：${error.message}\n`);
    process.exit(1);
  }

  if (options.help) {
    printHelp();
    return;
  }

  const analysis = analyzeFlowState(collectFlowState(), options);
  process.stdout.write(`${renderFlowReport(analysis)}\n`);
  process.exit(exitCodeForAnalysis(analysis));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
