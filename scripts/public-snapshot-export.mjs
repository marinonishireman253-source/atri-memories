import { execFileSync } from 'node:child_process';
import {
  existsSync,
  chmodSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const excludedPrefixes = [
  'dist/',
  'docs/superpowers/',
  'node_modules/',
  'output/',
];

const excludedExactPaths = new Set([
  '.DS_Store',
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local',
]);

const allowedFakeSupabaseRefs = new Set([
  'abcdefghijklmnopqrst',
]);

const serverOnlyKeyNamePattern = new RegExp(String.raw`\bSUPABASE_${'SERVICE'}_${'ROLE'}_KEY\s*=\s*['"]?[A-Za-z0-9._-]{20,}`, 'i');

function normalizeSnapshotPath(path) {
  return String(path ?? '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .trim();
}

export function isPublicSnapshotPath(path) {
  const normalized = normalizeSnapshotPath(path);
  if (!normalized || isAbsolute(normalized) || normalized.includes('../')) return false;
  if (excludedExactPaths.has(normalized)) return false;
  return !excludedPrefixes.some((prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix));
}

function isDocumentationIpv4([first, second, third]) {
  return (first === 192 && second === 0 && third === 2)
    || (first === 198 && second === 51 && third === 100)
    || (first === 203 && second === 0 && third === 113);
}

function isPublicIpv4(value) {
  const octets = String(value).split('.').map((part) => Number.parseInt(part, 10));
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [first, second, third] = octets;
  if (first === 0 || first === 10 || first === 127 || first >= 224) return false;
  if (first === 100 && second >= 64 && second <= 127) return false;
  if (first === 169 && second === 254) return false;
  if (first === 172 && second >= 16 && second <= 31) return false;
  if (first === 192 && second === 168) return false;
  if (first === 198 && (second === 18 || second === 19)) return false;
  if (isDocumentationIpv4([first, second, third])) return false;
  return true;
}

function pushLeak(leaks, path, type) {
  if (!leaks.some((leak) => leak.path === path && leak.type === type)) {
    leaks.push({ path, type });
  }
}

export function findPublicSnapshotLeaks({ path, content }) {
  const text = String(content ?? '');
  const leaks = [];

  if (/\/Users\/(?!example\b)[^\s)）"'`，。；;]+/u.test(text)) {
    pushLeak(leaks, path, 'local_path');
  }

  if (/\bssh\s+(?:-[A-Za-z]\s*\S+\s+)*(?:[A-Za-z0-9._-]+@)?(?:\d{1,3}\.){3}\d{1,3}\b/i.test(text)) {
    pushLeak(leaks, path, 'ssh_command');
  }

  const ipv4Matches = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) ?? [];
  if (ipv4Matches.some(isPublicIpv4)) {
    pushLeak(leaks, path, 'public_host');
  }

  const supabaseRefs = Array.from(text.matchAll(/https:\/\/([a-z]{20})\.supabase\.co\b/gi))
    .map((match) => match[1].toLowerCase());
  if (supabaseRefs.some((ref) => !allowedFakeSupabaseRefs.has(ref))) {
    pushLeak(leaks, path, 'supabase_project');
  }

  if (
    /BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY/i.test(text)
    || serverOnlyKeyNamePattern.test(text)
    || /\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{3,}\.[A-Za-z0-9_-]{3,}\b/.test(text)
  ) {
    pushLeak(leaks, path, 'credential');
  }

  return leaks;
}

export function analyzePublicSnapshotEntries(entries) {
  const included = [];
  const excluded = [];
  const leaks = [];

  for (const entry of entries) {
    const path = normalizeSnapshotPath(entry.path);
    if (!isPublicSnapshotPath(path)) {
      excluded.push(path);
      continue;
    }
    included.push(path);
    leaks.push(...findPublicSnapshotLeaks({ path, content: entry.content }));
  }

  return { included, excluded, leaks };
}

export function publicSnapshotFileMode(mode) {
  return (mode & 0o111) ? 0o755 : 0o644;
}

function runGit(args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

function trackedFiles() {
  return runGit(['ls-files', '-z'])
    .split('\0')
    .map(normalizeSnapshotPath)
    .filter(Boolean);
}

function isTextBuffer(buffer) {
  return !buffer.includes(0);
}

function readEntry(path) {
  const sourcePath = join(root, path);
  const buffer = readFileSync(sourcePath);
  return {
    path,
    buffer,
    content: isTextBuffer(buffer) ? buffer.toString('utf8') : '',
    mode: publicSnapshotFileMode(statSync(sourcePath).mode),
  };
}

function parseArgs(argv) {
  const options = {
    cleanTarget: false,
    dryRun: false,
    target: '',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--clean-target') options.cleanTarget = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--target') {
      options.target = argv[index + 1] || '';
      index += 1;
    } else if (arg === '--help') {
      options.help = true;
    } else {
      throw new Error(`未知参数：${arg}`);
    }
  }
  return options;
}

function printHelp() {
  process.stdout.write(`用法：
  npm run public:snapshot:export -- --dry-run
  npm run public:snapshot:export -- --target /path/to/public-worktree --clean-target

说明：
  从当前完整开发树导出公开安全文件，默认排除 docs/superpowers、output、dist、.env* 等内部产物。
  写入前会扫描真实本机路径、公网地址、Supabase 项目地址、SSH 命令和凭据形态。
`);
}

function assertSafeTarget(target) {
  if (!target) throw new Error('缺少 --target。');
  const resolved = resolve(target);
  if (resolved === root) throw new Error('target 不能是当前仓库根目录。');
  if (root.startsWith(`${resolved}${sep}`)) throw new Error('target 不能是当前仓库的父目录。');
  return resolved;
}

function cleanTargetDirectory(target) {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(target)) {
    if (entry === '.git') continue;
    rmSync(join(target, entry), { force: true, recursive: true });
  }
}

function writeEntries(target, entries) {
  for (const entry of entries) {
    const destination = join(target, entry.path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, entry.buffer);
    chmodSync(destination, entry.mode);
  }
}

function renderSummary({ analysis, dryRun, target }) {
  return [
    'Public Snapshot Export',
    '======================',
    `模式：${dryRun ? 'dry-run' : 'write'}`,
    target ? `目标：${target}` : '',
    `包含文件：${analysis.included.length}`,
    `排除文件：${analysis.excluded.length}`,
    `泄漏阻断：${analysis.leaks.length}`,
  ].filter(Boolean).join('\n');
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`Public Snapshot Export 参数错误：${error.message}\n`);
    process.exit(1);
  }

  if (options.help) {
    printHelp();
    return;
  }

  try {
    const entries = trackedFiles().map(readEntry);
    const analysis = analyzePublicSnapshotEntries(entries);
    process.stdout.write(`${renderSummary({ analysis, dryRun: options.dryRun, target: options.target })}\n`);
    if (analysis.leaks.length) {
      for (const leak of analysis.leaks) {
        process.stdout.write(`[BLOCK] ${leak.path}: ${leak.type}\n`);
      }
      process.exit(1);
    }
    if (options.dryRun) return;

    const target = assertSafeTarget(options.target);
    if (options.cleanTarget) cleanTargetDirectory(target);
    else if (!existsSync(target)) mkdirSync(target, { recursive: true });

    const entryByPath = new Map(entries.map((entry) => [entry.path, entry]));
    writeEntries(target, analysis.included.map((path) => entryByPath.get(path)).filter(Boolean));
  } catch (error) {
    process.stderr.write(`Public Snapshot Export 失败：${error.message}\n`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
