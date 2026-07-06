import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const protectedBranches = new Set(['main']);
const branchPrefixes = [
  'codex',
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'release',
  'hotfix',
];
const commitTypes = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];
const slugPattern = '[a-z0-9]+(?:-[a-z0-9]+)*';
const branchPattern = new RegExp(`^(${branchPrefixes.join('|')})/${slugPattern}(?:/${slugPattern})*$`);
const commitPattern = new RegExp(`^(${commitTypes.join('|')})(\\([a-z0-9-]+\\))?: \\S.{0,}$`);
const maxCommitSubjectLength = 72;

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function exists(path) {
  return existsSync(join(root, path));
}

function runGit(args) {
  try {
    return execSync(`git ${args}`, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function runGitCheck(args) {
  try {
    const output = execSync(`git ${args}`, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, output: output.trim() };
  } catch (error) {
    return {
      ok: false,
      output: `${error.stdout ?? ''}${error.stderr ?? ''}`.trim(),
    };
  }
}

export function normalizeBranchName(branchName) {
  return String(branchName ?? '')
    .trim()
    .replace(/^refs\/heads\//, '')
    .replace(/^origin\//, '');
}

export function isValidBranchName(branchName) {
  const normalized = normalizeBranchName(branchName);
  if (protectedBranches.has(normalized)) return true;
  return branchPattern.test(normalized);
}

export function isValidCommitSubject(subject) {
  const value = String(subject ?? '').trim();
  if (!value || value.length > maxCommitSubjectLength) return false;
  return commitPattern.test(value);
}

export function validatePolicyFiles() {
  const failures = [];
  const requiredFiles = [
    'CONTRIBUTING.md',
    'docs/GIT_WORKFLOW.md',
    '.github/pull_request_template.md',
    '.github/workflows/ci.yml',
    '.githooks/commit-msg',
    '.githooks/pre-push',
    'scripts/git-policy-check.mjs',
    'tests/gitPolicyCheck.test.js',
  ];

  for (const file of requiredFiles) {
    if (!exists(file)) failures.push(`缺少 Git 标准文件：${file}`);
  }

  const packageJson = JSON.parse(read('package.json'));
  const scripts = packageJson.scripts ?? {};
  if (scripts['git:check'] !== 'node scripts/git-policy-check.mjs') {
    failures.push('package.json 缺少 git:check 脚本或命令不一致。');
  }
  if (scripts['git:check:test'] !== 'node --test tests/gitPolicyCheck.test.js') {
    failures.push('package.json 缺少 git:check:test 脚本或命令不一致。');
  }
  if (!String(scripts.verify ?? '').includes('npm run git:check')) {
    failures.push('package.json 的 verify 脚本必须包含 npm run git:check。');
  }

  if (exists('docs/GIT_WORKFLOW.md')) {
    const workflow = read('docs/GIT_WORKFLOW.md');
    for (const token of ['分支规则', '提交规则', '合并前检查', '发布与回滚', '敏感信息']) {
      if (!workflow.includes(token)) failures.push(`docs/GIT_WORKFLOW.md 缺少章节：${token}`);
    }
  }

  if (exists('.github/pull_request_template.md')) {
    const template = read('.github/pull_request_template.md');
    for (const token of ['变更摘要', '验证结果', '风险与回滚']) {
      if (!template.includes(token)) failures.push(`PR 模板缺少字段：${token}`);
    }
  }

  return failures;
}

export function validateWhitespaceClean(diffChecks) {
  const failures = [];

  for (const [label, result] of diffChecks) {
    if (!result.ok) {
      failures.push(`Git diff whitespace check failed (${label}): ${result.output || 'git diff --check failed'}`);
    }
  }

  return failures;
}

function whitespaceDiffChecks(args, branchName) {
  const checks = [
    ['working tree', runGitCheck('diff --check')],
    ['staged', runGitCheck('diff --cached --check')],
  ];
  const normalizedBranch = normalizeBranchName(branchName);
  const baseRef = args.ci && process.env.GITHUB_BASE_REF
    ? `origin/${process.env.GITHUB_BASE_REF}`
    : 'main';

  if (normalizedBranch && normalizedBranch !== 'main' && runGit(`rev-parse --verify ${baseRef}`)) {
    checks.push([baseRef, runGitCheck(`diff --check ${baseRef}`)]);
  }

  return checks;
}

function parseArgs(argv) {
  const args = {
    ci: false,
    requireClean: false,
    branch: '',
    commitSubject: '',
    commitMsgFile: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--ci') args.ci = true;
    else if (arg === '--require-clean') args.requireClean = true;
    else if (arg === '--branch') args.branch = argv[++index] ?? '';
    else if (arg === '--commit') args.commitSubject = argv[++index] ?? '';
    else if (arg === '--commit-msg-file') args.commitMsgFile = argv[++index] ?? '';
    else throw new Error(`未知参数：${arg}`);
  }

  return args;
}

function currentBranchName(args) {
  if (args.branch) return args.branch;
  if (args.ci) return process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || '';
  return runGit('branch --show-current');
}

function commitSubjectFromArgs(args) {
  if (args.commitSubject) return args.commitSubject;
  if (!args.commitMsgFile) return '';
  return readFileSync(args.commitMsgFile, 'utf8').split(/\r?\n/)[0] ?? '';
}

function main() {
  const failures = [];
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    failures.push(error.message);
    args = {};
  }

  failures.push(...validatePolicyFiles());

  const branchName = normalizeBranchName(currentBranchName(args));
  failures.push(...validateWhitespaceClean(whitespaceDiffChecks(args, branchName)));

  if (branchName && branchName !== 'HEAD' && !isValidBranchName(branchName)) {
    failures.push(`当前分支名不符合规则：${branchName}`);
  }

  const commitSubject = commitSubjectFromArgs(args);
  if (commitSubject && !isValidCommitSubject(commitSubject)) {
    failures.push(`提交标题不符合 Conventional Commits 或超过 ${maxCommitSubjectLength} 字符：${commitSubject}`);
  }

  if (args.requireClean && runGit('status --porcelain')) {
    failures.push('工作区未清理，发布或合并前需要先提交、暂存或移除本地改动。');
  }

  if (failures.length > 0) {
    console.error('Git policy check failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log('Git policy check passed.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
