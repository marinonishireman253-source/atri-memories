import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith('--')));
const skipBuild = flags.has('--skip-build');

function readArg(name, fallback) {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) {
    return args[index + 1];
  }
  return fallback;
}

function timestamp() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

function run(command, commandArgs, options = {}) {
  process.stdout.write(`$ ${[command, ...commandArgs].join(' ')}\n`);
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: options.stdio ?? 'inherit',
    encoding: 'utf8',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
  return result;
}

function commandExists(command) {
  return spawnSync('sh', ['-lc', `command -v ${command}`], {
    encoding: 'utf8',
  }).status === 0;
}

function stripMacMetadata() {
  if (!commandExists('xattr')) return;
  run('xattr', ['-cr', join(root, 'dist')], { stdio: 'pipe' });
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function main() {
  const outputDir = resolve(root, readArg('--out-dir', 'artifacts/releases'));
  const outputName = readArg('--name', `atri-memories-${timestamp()}.tgz`);
  const outputPath = resolve(outputDir, outputName);

  if (!skipBuild) {
    run('npm', ['run', 'build']);
  }

  const distIndex = join(root, 'dist/index.html');
  if (!existsSync(distIndex)) {
    throw new Error('Missing dist/index.html. Run npm run build first.');
  }

  mkdirSync(outputDir, { recursive: true });
  stripMacMetadata();

  process.env.COPYFILE_DISABLE = '1';
  process.env.COPY_EXTENDED_ATTRIBUTES_DISABLE = '1';
  run('tar', ['-C', root, '-czf', outputPath, 'dist']);

  const size = statSync(outputPath).size;
  process.stdout.write(`\nPackage ready: ${outputPath}\n`);
  process.stdout.write(`Size: ${formatBytes(size)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`Package failed: ${error.message}\n`);
  process.exit(1);
}
