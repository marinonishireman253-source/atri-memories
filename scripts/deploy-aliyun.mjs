import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const skipBuild = args.has('--skip-build');

function parseEnvFile(path) {
  try {
    const content = readFileSync(path, 'utf8');
    return Object.fromEntries(
      content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => {
          const index = line.indexOf('=');
          const key = line.slice(0, index).trim();
          const rawValue = line.slice(index + 1).trim();
          const value = rawValue.replace(/^(['"])(.*)\1$/, '$2');
          return [key, value];
        }),
    );
  } catch {
    return {};
  }
}

const envFile = {
  ...parseEnvFile(join(root, '.env')),
  ...parseEnvFile(join(root, '.env.local')),
};

function envValue(key, fallback = '') {
  return process.env[key] ?? envFile[key] ?? fallback;
}

const config = {
  host: envValue('ALIYUN_HOST'),
  user: envValue('ALIYUN_USER'),
  port: envValue('ALIYUN_PORT', '22'),
  siteRoot: envValue('ALIYUN_SITE_ROOT'),
  functionsRoot: envValue('ALIYUN_SUPABASE_FUNCTIONS_ROOT'),
  sshKey: envValue('ALIYUN_SSH_KEY'),
  publicSiteUrl: envValue('VITE_PUBLIC_SITE_URL'),
  webOwner: envValue('ALIYUN_WEB_OWNER'),
  nginxCompressionConf: envValue('ALIYUN_NGINX_COMPRESSION_CONF'),
  nginxSiteConfig: envValue('ALIYUN_NGINX_SITE_CONFIG'),
  nginxConfigBackupRoot: envValue('ALIYUN_NGINX_CONFIG_BACKUP_ROOT'),
  storageCacheLocation: envValue('ALIYUN_STORAGE_CACHE_LOCATION'),
  storageProxyTarget: envValue('ALIYUN_STORAGE_PROXY_TARGET'),
  edgeFunctionContainerCandidates: envValue('ALIYUN_EDGE_FUNCTION_CONTAINER_CANDIDATES'),
};

function info(message) {
  process.stdout.write(`${message}\n`);
}

function quote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function run(command, commandArgs, options = {}) {
  const pretty = [command, ...commandArgs].join(' ');
  info(`$ ${pretty}`);
  if (dryRun) return { status: 0, stdout: '', stderr: '' };

  const result = spawnSync(command, commandArgs, {
    cwd: root,
    env: {
      ...envFile,
      ...process.env,
      VITE_PUBLIC_SITE_URL: config.publicSiteUrl,
    },
    encoding: options.encoding ?? 'utf8',
    input: options.input,
    stdio: options.stdio ?? 'inherit',
    maxBuffer: 1024 * 1024 * 20,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${pretty} exited with status ${result.status}`);
  }
  return result;
}

function requireCommand(command) {
  const result = spawnSync('sh', ['-lc', `command -v ${quote(command)}`], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`Missing required command: ${command}`);
  }
}

function commandExists(command) {
  return spawnSync('sh', ['-lc', `command -v ${quote(command)}`], {
    encoding: 'utf8',
  }).status === 0;
}

function stripBuildMetadata() {
  if (dryRun || !commandExists('xattr')) return;
  for (const target of ['dist', 'supabase/functions']) {
    const path = join(root, target);
    if (existsSync(path)) {
      run('xattr', ['-cr', path], { stdio: 'pipe' });
    }
  }
}

function remoteScript() {
  return `#!/bin/bash
set -euo pipefail

SITE_ROOT=${quote(config.siteRoot)}
FUNCTIONS_ROOT=${quote(config.functionsRoot)}
WEB_OWNER=${quote(config.webOwner)}
NGINX_COMPRESSION_CONF=${quote(config.nginxCompressionConf)}
NGINX_SITE_CONFIG=${quote(config.nginxSiteConfig)}
NGINX_CONFIG_BACKUP_ROOT=${quote(config.nginxConfigBackupRoot)}
STORAGE_CACHE_LOCATION=${quote(config.storageCacheLocation)}
STORAGE_PROXY_TARGET=${quote(config.storageProxyTarget)}
EDGE_FUNCTION_CONTAINER_CANDIDATES=${quote(config.edgeFunctionContainerCandidates)}
UPLOADED_ARCHIVE=${quote('/tmp/atri-dist.tgz')}
UPLOADED_FUNCTIONS_ARCHIVE=${quote('/tmp/atri-functions.tgz')}
WORK_DIR="$(mktemp -d /tmp/atri-deploy.XXXXXX)"
ARCHIVE="$WORK_DIR/dist.tgz"
FUNCTIONS_ARCHIVE="$WORK_DIR/functions.tgz"
FUNCTIONS_SRC="$WORK_DIR/supabase/functions"
NEW_ROOT="\${SITE_ROOT}.new"
BACKUP_ROOT="\${SITE_ROOT}.backup.$(date +%Y%m%d%H%M%S)"

cleanup() {
  rm -rf "$WORK_DIR" "$NEW_ROOT"
}
trap cleanup EXIT

test -f "$UPLOADED_ARCHIVE"
test -f "$UPLOADED_FUNCTIONS_ARCHIVE"
cp "$UPLOADED_ARCHIVE" "$ARCHIVE"
cp "$UPLOADED_FUNCTIONS_ARCHIVE" "$FUNCTIONS_ARCHIVE"
tar -xzf "$ARCHIVE" -C "$WORK_DIR"
tar -xzf "$FUNCTIONS_ARCHIVE" -C "$WORK_DIR"
test -f "$WORK_DIR/dist/index.html"
test -d "$FUNCTIONS_SRC"

mkdir -p "$FUNCTIONS_ROOT" "$FUNCTIONS_ROOT/.backups"
function_stamp="$(date -u +%Y%m%dT%H%M%SZ)"
for function_dir in "$FUNCTIONS_SRC"/*; do
  [ -d "$function_dir" ] || continue
  function_name="$(basename "$function_dir")"
  [ -f "$function_dir/index.ts" ] || continue
  case "$function_name" in
    main|.*|_*) continue ;;
  esac

  if [ -d "$FUNCTIONS_ROOT/$function_name" ]; then
    rm -rf "$FUNCTIONS_ROOT/.backups/$function_name-$function_stamp"
    cp -a "$FUNCTIONS_ROOT/$function_name" "$FUNCTIONS_ROOT/.backups/$function_name-$function_stamp"
  fi

  rm -rf "$FUNCTIONS_ROOT/$function_name.tmp"
  mkdir -p "$FUNCTIONS_ROOT/$function_name.tmp"
  cp -a "$function_dir/." "$FUNCTIONS_ROOT/$function_name.tmp/"
  find "$FUNCTIONS_ROOT/$function_name.tmp" -name '._*' -delete
  find "$FUNCTIONS_ROOT/$function_name.tmp" -type d -exec chmod 755 {} \\;
  find "$FUNCTIONS_ROOT/$function_name.tmp" -type f -exec chmod 644 {} \\;
  rm -rf "$FUNCTIONS_ROOT/$function_name"
  mv "$FUNCTIONS_ROOT/$function_name.tmp" "$FUNCTIONS_ROOT/$function_name"
done

rm -rf "$NEW_ROOT"
mkdir -p "$NEW_ROOT"
cp -a "$WORK_DIR/dist/." "$NEW_ROOT/"
if [ -n "$WEB_OWNER" ]; then
  chown -R "$WEB_OWNER" "$NEW_ROOT" 2>/dev/null || true
fi
find "$NEW_ROOT" -type d -exec chmod 755 {} \\;
find "$NEW_ROOT" -type f -exec chmod 644 {} \\;

if command -v nginx >/dev/null 2>&1; then
  if [ -n "$NGINX_COMPRESSION_CONF" ]; then
    cat >"$NGINX_COMPRESSION_CONF" <<'NGINX_COMPRESSION'
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_min_length 1024;
gzip_types
  text/plain
  text/css
  text/xml
  text/javascript
  application/javascript
  application/json
  application/xml
  application/xml+rss
  application/wasm
  image/svg+xml;
NGINX_COMPRESSION
  fi

  if [ -n "$NGINX_SITE_CONFIG" ] && [ -n "$NGINX_CONFIG_BACKUP_ROOT" ] && [ -n "$STORAGE_CACHE_LOCATION" ] && [ -n "$STORAGE_PROXY_TARGET" ] && [ -f "$NGINX_SITE_CONFIG" ] && ! grep -Fq "location ^~ $STORAGE_CACHE_LOCATION" "$NGINX_SITE_CONFIG"; then
    mkdir -p "$NGINX_CONFIG_BACKUP_ROOT"
    stamp="$(date -u +%Y%m%dT%H%M%SZ)"
    cache_backup="$NGINX_CONFIG_BACKUP_ROOT/atri.bak-$stamp-storage-cache"
    cp "$NGINX_SITE_CONFIG" "$cache_backup"
    tmp_nginx="$(mktemp)"
    awk -v storage_cache_location="$STORAGE_CACHE_LOCATION" -v storage_proxy_target="$STORAGE_PROXY_TARGET" '
      index($0, "    location ^~ /storage/ {") == 1 && !inserted {
        print "    location ^~ " storage_cache_location " {"
        print "        proxy_pass " storage_proxy_target ";"
        print "        proxy_http_version 1.1;"
        print "        proxy_set_header Host $host;"
        print "        proxy_set_header X-Real-IP $remote_addr;"
        print "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;"
        print "        proxy_set_header X-Forwarded-Proto $scheme;"
        print "        proxy_hide_header Cache-Control;"
        print "        add_header Cache-Control \\"public, max-age=604800, stale-while-revalidate=86400\\" always;"
        print "        client_max_body_size 50m;"
        print "    }"
        print ""
        inserted = 1
      }
      { print }
    ' "$NGINX_SITE_CONFIG" > "$tmp_nginx"
    if ! grep -Fq "location ^~ $STORAGE_CACHE_LOCATION" "$tmp_nginx"; then
      rm -f "$tmp_nginx"
      echo 'Unable to install public storage cache location.' >&2
      exit 1
    fi
    mv "$tmp_nginx" "$NGINX_SITE_CONFIG"
  fi
  nginx -t
fi

if [ -d "$SITE_ROOT" ]; then
  rm -rf "$BACKUP_ROOT"
  mv "$SITE_ROOT" "$BACKUP_ROOT"
fi
mv "$NEW_ROOT" "$SITE_ROOT"

if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet nginx; then
  systemctl reload nginx
fi

if [ -n "$EDGE_FUNCTION_CONTAINER_CANDIDATES" ] && command -v docker >/dev/null 2>&1; then
  running_containers="$(docker ps --format '{{.Names}}')"
  restarted_functions_container=0
  for container_name in $EDGE_FUNCTION_CONTAINER_CANDIDATES; do
    if printf '%s\n' "$running_containers" | grep -Fxq "$container_name"; then
      docker restart "$container_name" >/dev/null
      restarted_functions_container=1
      break
    fi
  done
  if [ "$restarted_functions_container" -eq 0 ]; then
    echo 'No running Edge Functions container found to restart; synced function files only.' >&2
  fi
fi

printf 'ATRI_ALIYUN_DEPLOY_OK\\n'
`;
}

function main() {
  info('Aliyun Deploy');
  info('=============');
  info(`Target: ${config.user || '<ALIYUN_USER>'}@${config.host || '<ALIYUN_HOST>'}:${config.siteRoot || '<ALIYUN_SITE_ROOT>'}`);
  info(`Functions root: ${config.functionsRoot || '<ALIYUN_SUPABASE_FUNCTIONS_ROOT>'}`);
  info(`SSH key: ${config.sshKey || '<system ssh config or agent>'}`);
  info(`Public URL baked into build: ${config.publicSiteUrl || '<VITE_PUBLIC_SITE_URL>'}`);
  if (dryRun) info('Mode: dry run, no local build or remote deploy will be executed');

  requireCommand('tar');
  requireCommand('ssh');
  requireCommand('scp');

  if (!dryRun && !config.host) {
    throw new Error('ALIYUN_HOST is required. Keep deployment hosts in local environment variables, not in the repository.');
  }

  if (!dryRun && !config.user) {
    throw new Error('ALIYUN_USER is required. Keep deployment users in local environment variables, not in the repository.');
  }

  if (!dryRun && !config.siteRoot) {
    throw new Error('ALIYUN_SITE_ROOT is required. Keep deployment paths in local environment variables, not in the repository.');
  }

  if (!dryRun && !config.functionsRoot) {
    throw new Error('ALIYUN_SUPABASE_FUNCTIONS_ROOT is required. Keep deployment paths in local environment variables, not in the repository.');
  }

  if (!dryRun && !config.publicSiteUrl) {
    throw new Error('VITE_PUBLIC_SITE_URL is required. Keep production URLs in local environment variables, not in the repository.');
  }

  if (!skipBuild) {
    run('npm', ['run', 'build']);
  } else {
    info('Skipping build because --skip-build was provided.');
  }

  const distIndex = join(root, 'dist/index.html');
  if (!dryRun && !existsSync(distIndex)) {
    throw new Error('Missing dist/index.html. Run npm run build first.');
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'atri-aliyun-'));
  const archivePath = join(tempDir, 'dist.tgz');
  const functionsArchivePath = join(tempDir, 'functions.tgz');
  try {
    process.env.COPYFILE_DISABLE = '1';
    process.env.COPY_EXTENDED_ATTRIBUTES_DISABLE = '1';
    stripBuildMetadata();
    run('tar', ['--no-xattrs', '-C', root, '-czf', archivePath, 'dist']);
    run('tar', ['--no-xattrs', '-C', root, '-czf', functionsArchivePath, 'supabase/functions']);

    const sshTarget = `${config.user || '<ALIYUN_USER>'}@${config.host || '<ALIYUN_HOST>'}`;
    const sshKeyArgs = config.sshKey && existsSync(config.sshKey) ? ['-i', config.sshKey] : [];
    const sshArgs = [
      ...sshKeyArgs,
      '-p',
      config.port,
      '-o',
      'ServerAliveInterval=15',
      '-o',
      'ServerAliveCountMax=4',
      sshTarget,
    ];
    const remoteCommand = `bash -s <<'ATRI_DEPLOY_SCRIPT'\n${remoteScript()}\nATRI_DEPLOY_SCRIPT`;

    if (dryRun) {
      info(`Would upload ${archivePath} to: ${sshTarget}:/tmp/atri-dist.tgz`);
      info(`Would upload ${functionsArchivePath} to: ${sshTarget}:/tmp/atri-functions.tgz`);
      info(`Would run remote deploy through: ssh ${[...sshArgs, '<deploy-script>'].join(' ')}`);
      return;
    }

    run('scp', [
      ...sshKeyArgs,
      '-P',
      config.port,
      archivePath,
      `${sshTarget}:/tmp/atri-dist.tgz`,
    ]);
    run('scp', [
      ...sshKeyArgs,
      '-P',
      config.port,
      functionsArchivePath,
      `${sshTarget}:/tmp/atri-functions.tgz`,
    ]);

    run('ssh', [...sshArgs, remoteCommand]);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`\nDeploy failed: ${error.message}\n`);
  process.exit(1);
}
