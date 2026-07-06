import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const REQUIRED_CONTAINERS = [
  'supabase-auth',
  'supabase-db',
  'supabase-edge-functions',
  'supabase-kong',
  'supabase-rest',
  'supabase-storage',
];

const DEFAULT_THRESHOLDS = {
  memoryAvailableMiB: 300,
  swapTotalMiB: 1024,
  load5PerCpu: 2,
  rootUsedPercent: 85,
};

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

function envValue(envFile, key, fallback = '') {
  return process.env[key] ?? envFile[key] ?? fallback;
}

function numberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolValue(value) {
  return value === true || value === '1' || value === 'true' || value === 'yes';
}

function normalize(value) {
  return String(value ?? '').trim();
}

function statusFrom(failures, warnings) {
  if (failures.length) return 'fail';
  if (warnings.length) return 'warn';
  return 'ok';
}

function addIssue({ strict, warnings, failures }, message, { strictOnly = false } = {}) {
  if (strictOnly && !strict) {
    warnings.push(message);
    return;
  }
  failures.push(message);
}

function splitReportLine(line) {
  const parts = line.split('|');
  if (parts.length < 3) return null;
  return parts;
}

function setField(state, rawKey, rawValue) {
  const value = normalize(rawValue);
  const keyMap = {
    hostname: 'hostname',
    cpu_count: 'cpuCount',
    load_1: 'load1',
    load_5: 'load5',
    load_15: 'load15',
    memory_available_mib: 'memoryAvailableMiB',
    swap_total_mib: 'swapTotalMiB',
    swap_used_mib: 'swapUsedMiB',
    root_used_percent: 'rootUsedPercent',
    certbot_version: 'certbotVersion',
    certbot_timer_enabled: 'certbotTimerEnabled',
    certbot_timer_active: 'certbotTimerActive',
    snapd_service_enabled: 'snapdServiceEnabled',
    snapd_socket_enabled: 'snapdSocketEnabled',
    snapd_repair_timer_enabled: 'snapdRepairTimerEnabled',
    snap_certbot_timer_enabled: 'snapCertbotTimerEnabled',
    snapd_service_active: 'snapdServiceActive',
    snapd_socket_active: 'snapdSocketActive',
    docker_log_rotation_configured: 'dockerLogRotationConfigured',
    sshd_ports: 'sshdPorts',
    firewall_blocks_ssh22: 'firewallBlocksSsh22',
    ssh_rate_limit_configured: 'sshRateLimitConfigured',
    fail2ban_sshd_active: 'fail2banSshdActive',
    docker_backend_ports_blocked: 'dockerBackendPortsBlocked',
    db_ready: 'dbReady',
    auth_resolves_db: 'authResolvesDb',
    recent_runtime_error_count: 'recentRuntimeErrorCount',
  };
  const targetKey = keyMap[rawKey];
  if (!targetKey) return;

  if ([
    'cpuCount',
    'load1',
    'load5',
    'load15',
    'memoryAvailableMiB',
    'swapTotalMiB',
    'swapUsedMiB',
    'rootUsedPercent',
    'recentRuntimeErrorCount',
  ].includes(targetKey)) {
    state[targetKey] = numberValue(value);
    return;
  }

  if (targetKey === 'sshdPorts') {
    state[targetKey] = value
      .split(',')
      .map((port) => Number.parseInt(port.trim(), 10))
      .filter((port) => Number.isFinite(port));
    return;
  }

  if ([
    'dockerLogRotationConfigured',
    'firewallBlocksSsh22',
    'sshRateLimitConfigured',
    'fail2banSshdActive',
    'dockerBackendPortsBlocked',
    'dbReady',
    'authResolvesDb',
  ].includes(targetKey)) {
    state[targetKey] = boolValue(value);
    return;
  }

  state[targetKey] = value;
}

export function parseRuntimeReport(report) {
  const state = { containers: [] };
  for (const rawLine of String(report ?? '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = splitReportLine(line);
    if (!parts) continue;

    if (parts[0] === 'FIELD') {
      setField(state, parts[1], parts.slice(2).join('|'));
    } else if (parts[0] === 'CONTAINER') {
      const [, name, health, restartPolicy, ...statusParts] = parts;
      state.containers.push({
        name: normalize(name),
        health: normalize(health),
        restartPolicy: normalize(restartPolicy),
        status: normalize(statusParts.join('|')),
      });
    }
  }
  return state;
}

function isDisabledOrMasked(value) {
  return ['disabled', 'masked', 'not-found', 'inactive'].includes(normalize(value));
}

function isInactive(value) {
  return ['inactive', 'failed', 'unknown', ''].includes(normalize(value));
}

function healthyContainer(container) {
  return container
    && container.health === 'healthy'
    && container.status !== 'exited'
    && container.status !== 'dead'
    && ['unless-stopped', 'always'].includes(container.restartPolicy);
}

function renderContainerName(name) {
  return name || '<unknown>';
}

export function analyzeAliyunRuntimeState(input, options = {}) {
  const strict = Boolean(options.strict);
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(options.thresholds ?? {}) };
  const state = {
    cpuCount: numberValue(input.cpuCount, 0),
    load1: numberValue(input.load1, 0),
    load5: numberValue(input.load5, 0),
    load15: numberValue(input.load15, 0),
    memoryAvailableMiB: numberValue(input.memoryAvailableMiB, 0),
    swapTotalMiB: numberValue(input.swapTotalMiB, 0),
    swapUsedMiB: numberValue(input.swapUsedMiB, 0),
    rootUsedPercent: numberValue(input.rootUsedPercent, 0),
    certbotVersion: normalize(input.certbotVersion),
    certbotTimerEnabled: normalize(input.certbotTimerEnabled),
    certbotTimerActive: normalize(input.certbotTimerActive),
    snapdServiceEnabled: normalize(input.snapdServiceEnabled),
    snapdSocketEnabled: normalize(input.snapdSocketEnabled),
    snapdRepairTimerEnabled: normalize(input.snapdRepairTimerEnabled),
    snapCertbotTimerEnabled: normalize(input.snapCertbotTimerEnabled),
    snapdServiceActive: normalize(input.snapdServiceActive),
    snapdSocketActive: normalize(input.snapdSocketActive),
    dockerLogRotationConfigured: Boolean(input.dockerLogRotationConfigured),
    sshdPorts: Array.isArray(input.sshdPorts)
      ? input.sshdPorts.map((port) => Number.parseInt(port, 10)).filter((port) => Number.isFinite(port))
      : [],
    firewallBlocksSsh22: Boolean(input.firewallBlocksSsh22),
    sshRateLimitConfigured: Boolean(input.sshRateLimitConfigured),
    fail2banSshdActive: Boolean(input.fail2banSshdActive),
    dockerBackendPortsBlocked: Boolean(input.dockerBackendPortsBlocked),
    dbReady: Boolean(input.dbReady),
    authResolvesDb: Boolean(input.authResolvesDb),
    recentRuntimeErrorCount: numberValue(input.recentRuntimeErrorCount, 0),
    containers: Array.isArray(input.containers) ? input.containers : [],
  };

  const facts = [];
  const warnings = [];
  const failures = [];
  const nextActions = [];

  facts.push(`资源：CPU ${state.cpuCount || 'unknown'}，load5 ${state.load5.toFixed(2)}，可用内存 ${state.memoryAvailableMiB}MiB，Swap ${state.swapUsedMiB}/${state.swapTotalMiB}MiB，根分区 ${state.rootUsedPercent}%`);

  if (state.memoryAvailableMiB < thresholds.memoryAvailableMiB) {
    addIssue({ strict, warnings, failures }, `可用内存低于保守阈值：${state.memoryAvailableMiB}MiB < ${thresholds.memoryAvailableMiB}MiB。`, { strictOnly: true });
    nextActions.push('降低并发任务，避免同时运行部署、smoke、备份和管理端批量操作。');
  }

  if (state.swapTotalMiB < thresholds.swapTotalMiB) {
    failures.push(`Swap 太小：${state.swapTotalMiB}MiB < ${thresholds.swapTotalMiB}MiB。`);
    nextActions.push('保留至少 1GiB Swap，固定规格机器需要它防止瞬时 OOM。');
  }

  if (state.cpuCount > 0 && state.load5 > state.cpuCount * thresholds.load5PerCpu) {
    addIssue({ strict, warnings, failures }, `5 分钟负载过高：${state.load5.toFixed(2)} > CPU ${state.cpuCount} * ${thresholds.load5PerCpu}。`, { strictOnly: true });
    nextActions.push('先等待负载下降或排查高 CPU 进程，再执行部署和全量 smoke。');
  }

  if (state.rootUsedPercent >= thresholds.rootUsedPercent) {
    addIssue({ strict, warnings, failures }, `根分区使用率过高：${state.rootUsedPercent}% >= ${thresholds.rootUsedPercent}%。`, { strictOnly: true });
    nextActions.push('清理旧构建、旧 Docker 镜像、旧备份和历史日志。');
  }

  if (!state.certbotVersion || state.certbotTimerEnabled !== 'enabled' || state.certbotTimerActive !== 'active') {
    failures.push('certbot.timer 未启用并运行，证书续期不可作为长期保障。');
    nextActions.push('使用 apt 版 certbot.timer，避免恢复 snap 版 certbot 续期链路。');
  } else {
    facts.push(`证书续期：${state.certbotVersion}，timer ${state.certbotTimerEnabled}/${state.certbotTimerActive}。`);
  }

  const snapdDisabled = isDisabledOrMasked(state.snapdServiceEnabled)
    && isDisabledOrMasked(state.snapdSocketEnabled)
    && isDisabledOrMasked(state.snapdRepairTimerEnabled)
    && isDisabledOrMasked(state.snapCertbotTimerEnabled)
    && isInactive(state.snapdServiceActive)
    && isInactive(state.snapdSocketActive);
  if (!snapdDisabled) {
    addIssue({ strict, warnings, failures }, 'snapd 未保持禁用，可能再次触发 watchdog/自启动资源抖动。', { strictOnly: true });
    nextActions.push('保持 snapd.service、snapd.socket 和 snap 相关 timer 禁用或 masked。');
  } else {
    facts.push('snapd 自启动路径保持关闭。');
  }

  if (!state.dockerLogRotationConfigured) {
    addIssue({ strict, warnings, failures }, 'Docker 日志轮转未配置，长期运行会增加磁盘和 IO 风险。', { strictOnly: true });
    nextActions.push('在 Docker daemon 配置 json-file max-size/max-file，并在维护窗口重启 Docker。');
  } else {
    facts.push('Docker 日志轮转已配置。');
  }

  if (state.sshdPorts.includes(22)) {
    failures.push('默认 SSH 22 仍在 sshd 配置中。');
    nextActions.push('只保留当前管理端口，避免默认 SSH 端口继续被爆破和触发安全告警。');
  } else if (state.sshdPorts.length) {
    facts.push(`SSH 管理端口已收口：${state.sshdPorts.join(', ')}。`);
  } else {
    warnings.push('无法读取 sshd 端口配置。');
  }

  if (!state.firewallBlocksSsh22) {
    addIssue({ strict, warnings, failures }, 'SSH 22 缺少本机防火墙兜底阻断。', { strictOnly: true });
    nextActions.push('保留本机 INPUT 规则阻断 SSH 22，作为安全组之外的兜底。');
  } else {
    facts.push('SSH 22 已有本机防火墙兜底阻断。');
  }

  if (!state.sshRateLimitConfigured) {
    addIssue({ strict, warnings, failures }, 'SSH 管理端口缺少来源限速规则。', { strictOnly: true });
    nextActions.push('保留管理端口 hashlimit 规则，降低扫描和爆破对小规格实例的影响。');
  } else {
    facts.push('SSH 管理端口已有来源限速。');
  }

  if (!state.fail2banSshdActive) {
    addIssue({ strict, warnings, failures }, 'fail2ban sshd jail 未启用。', { strictOnly: true });
    nextActions.push('启用 fail2ban sshd jail，自动封禁重复 SSH 预认证失败来源。');
  } else {
    facts.push('fail2ban sshd jail 已启用。');
  }

  if (!state.dockerBackendPortsBlocked) {
    addIssue({ strict, warnings, failures }, 'Docker 后端端口缺少公网阻断。', { strictOnly: true });
    nextActions.push('保留 DOCKER-USER 规则阻断公网直连后端端口，只通过 Nginx 对外服务。');
  } else {
    facts.push('Docker 后端端口已通过 DOCKER-USER 阻断公网直连。');
  }

  const containerByName = new Map(state.containers.map((container) => [container.name, container]));
  const missingContainers = REQUIRED_CONTAINERS.filter((name) => !containerByName.has(name));
  if (missingContainers.length) {
    failures.push(`缺少 Supabase 容器：${missingContainers.join(', ')}。`);
    nextActions.push('先确认 Supabase compose 栈是否完整启动。');
  }

  const badContainers = state.containers
    .filter((container) => REQUIRED_CONTAINERS.includes(container.name))
    .filter((container) => !healthyContainer(container));
  if (badContainers.length) {
    failures.push(`Supabase 容器异常：${badContainers.map((container) => renderContainerName(container.name)).join(', ')}。`);
    nextActions.push('先修复 unhealthy/restarting 容器，再放行部署或 smoke。');
  } else if (!missingContainers.length) {
    facts.push(`Supabase 容器 healthy：${REQUIRED_CONTAINERS.length}/${REQUIRED_CONTAINERS.length}。`);
  }

  if (!state.dbReady) {
    failures.push('DB readiness 检查失败。');
    nextActions.push('先检查 Postgres 容器和磁盘/内存压力。');
  } else {
    facts.push('Postgres readiness 正常。');
  }

  if (!state.authResolvesDb) {
    failures.push('Auth 容器无法解析 db。');
    nextActions.push('先检查 Docker DNS、网络和 Auth/DB 容器状态。');
  } else {
    facts.push('Auth 容器能解析 db。');
  }

  if (state.recentRuntimeErrorCount >= 2) {
    addIssue({ strict, warnings, failures }, `最近仍有后端超时错误：${state.recentRuntimeErrorCount} 条。`, { strictOnly: true });
    nextActions.push('查看 Auth 日志中 DB/DNS timeout 是否继续出现；连续出现时先重启后端容器。');
  }

  if (!nextActions.length) {
    nextActions.push(strict ? '严格运行时检查通过，可以继续部署后 smoke。' : '运行时状态可继续；发布后仍需执行线上 smoke。');
  }

  return {
    strict,
    status: statusFrom(failures, warnings),
    facts,
    warnings,
    failures,
    nextActions,
    input: state,
  };
}

function renderSection(title, entries, prefix) {
  if (!entries.length) return '';
  return [`\n${title}`, ...entries.map((entry) => `${prefix} ${entry}`)].join('\n');
}

export function renderAliyunRuntimeReport(analysis) {
  const statusLine = analysis.status === 'fail'
    ? '[FAIL] 阿里云固定规格运行时检查未通过'
    : analysis.status === 'warn'
      ? '[WARN] 阿里云固定规格运行时检查有警告'
      : '[OK] 阿里云固定规格运行时检查通过';

  return [
    'Aliyun Runtime Doctor',
    '=====================',
    `模式：${analysis.strict ? 'strict' : 'default'}`,
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

function remoteProbeScript() {
  return String.raw`set -u
field() { printf 'FIELD|%s|%s\n' "$1" "$2"; }

field hostname "$(hostname 2>/dev/null || true)"
field cpu_count "$(nproc 2>/dev/null || echo 0)"
awk '{printf "FIELD|load_1|%s\nFIELD|load_5|%s\nFIELD|load_15|%s\n", $1, $2, $3}' /proc/loadavg 2>/dev/null || true
awk '/MemAvailable:/ {printf "FIELD|memory_available_mib|%d\n", $2 / 1024}' /proc/meminfo 2>/dev/null || true
awk '/SwapTotal:/ {printf "FIELD|swap_total_mib|%d\n", $2 / 1024} /SwapFree:/ {free=$2} END {if (free != "") printf "FIELD|swap_used_mib|%d\n", (total - free) / 1024}' total="$(awk '/SwapTotal:/ {print $2}' /proc/meminfo 2>/dev/null)" /proc/meminfo 2>/dev/null || true
df -P / 2>/dev/null | awk 'NR == 2 {gsub("%", "", $5); printf "FIELD|root_used_percent|%s\n", $5}' || true

field certbot_version "$(certbot --version 2>/dev/null || true)"
field certbot_timer_enabled "$(systemctl is-enabled certbot.timer 2>/dev/null || true)"
field certbot_timer_active "$(systemctl is-active certbot.timer 2>/dev/null || true)"
field snapd_service_enabled "$(systemctl is-enabled snapd.service 2>/dev/null || true)"
field snapd_socket_enabled "$(systemctl is-enabled snapd.socket 2>/dev/null || true)"
field snapd_repair_timer_enabled "$(systemctl is-enabled snapd.snap-repair.timer 2>/dev/null || true)"
field snap_certbot_timer_enabled "$(systemctl is-enabled snap.certbot.renew.timer 2>/dev/null || true)"
field snapd_service_active "$(systemctl is-active snapd.service 2>/dev/null || true)"
field snapd_socket_active "$(systemctl is-active snapd.socket 2>/dev/null || true)"
field sshd_ports "$(sshd -T 2>/dev/null | awk '/^port / {print $2}' | paste -sd, -)"
ssh_mgmt_port="$(sshd -T 2>/dev/null | awk '/^port / && $2 != "22" {print $2; exit}')"
if [ -z "$ssh_mgmt_port" ]; then
  ssh_mgmt_port="$(sshd -T 2>/dev/null | awk '/^port / {print $2; exit}')"
fi

if [ -f /etc/docker/daemon.json ] && grep -q '"max-size"' /etc/docker/daemon.json && grep -q '"max-file"' /etc/docker/daemon.json; then
  field docker_log_rotation_configured 1
else
  field docker_log_rotation_configured 0
fi

if iptables -S INPUT 2>/dev/null | grep -Eq -- '--dport 22[[:space:]].*-j DROP'; then
  field firewall_blocks_ssh22 1
else
  field firewall_blocks_ssh22 0
fi

if iptables -S INPUT 2>/dev/null | grep -Eq -- "--dport $ssh_mgmt_port[[:space:]].*hashlimit-above"; then
  field ssh_rate_limit_configured 1
else
  field ssh_rate_limit_configured 0
fi

if command -v fail2ban-client >/dev/null 2>&1 && systemctl is-active --quiet fail2ban 2>/dev/null && fail2ban-client status sshd >/dev/null 2>&1; then
  field fail2ban_sshd_active 1
else
  field fail2ban_sshd_active 0
fi

if iptables -S DOCKER-USER 2>/dev/null | grep -Eq -- '--dports 8000,8443[[:space:]].*-j DROP'; then
  field docker_backend_ports_blocked 1
else
  field docker_backend_ports_blocked 0
fi

if command -v docker >/dev/null 2>&1; then
  for container in $(docker ps --format '{{.Names}}' 2>/dev/null | sort); do
    health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' "$container" 2>/dev/null || true)"
    policy="$(docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' "$container" 2>/dev/null || true)"
    status="$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null || true)"
    printf 'CONTAINER|%s|%s|%s|%s\n' "$container" "$health" "$policy" "$status"
  done

  db_container="$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E '^supabase-db$|db' | head -n 1 || true)"
  if [ -n "$db_container" ] && docker exec "$db_container" pg_isready -U postgres >/dev/null 2>&1; then
    field db_ready 1
  else
    field db_ready 0
  fi

  auth_container="$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E '^supabase-auth$|auth' | head -n 1 || true)"
  if [ -n "$auth_container" ] && docker exec "$auth_container" getent hosts db >/dev/null 2>&1; then
    field auth_resolves_db 1
  else
    field auth_resolves_db 0
  fi

  if [ -n "$auth_container" ]; then
    runtime_errors="$(docker logs --since 15m "$auth_container" 2>&1 | grep -Eic 'hostname resolving error|i/o timeout|request_timeout|database error|failed to connect to.*host=db' || true)"
    field recent_runtime_error_count "$runtime_errors"
  else
    field recent_runtime_error_count 999
  fi
else
  field db_ready 0
  field auth_resolves_db 0
  field recent_runtime_error_count 999
fi
`;
}

function parseArgs(argv) {
  const options = { strict: false, json: false };
  for (const arg of argv) {
    if (arg === '--strict') options.strict = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--help') options.help = true;
    else throw new Error(`未知参数：${arg}`);
  }
  return options;
}

function printHelp() {
  process.stdout.write(`用法：
  npm run aliyun:runtime:doctor
  npm run aliyun:runtime:doctor -- --strict

说明：
  通过 ALIYUN_HOST / ALIYUN_USER / ALIYUN_PORT / ALIYUN_SSH_KEY 连接阿里云。
  默认模式输出诊断和警告；--strict 用于部署后门禁，警告会升级为失败。
`);
}

function collectRemoteRuntimeState(config) {
  if (!config.host) throw new Error('ALIYUN_HOST is required.');
  if (!config.user) throw new Error('ALIYUN_USER is required.');

  const sshTarget = `${config.user}@${config.host}`;
  const sshKeyArgs = config.sshKey && existsSync(config.sshKey) ? ['-i', config.sshKey] : [];
  const sshArgs = [
    ...sshKeyArgs,
    '-p',
    config.port,
    '-o',
    'BatchMode=yes',
    '-o',
    'ConnectTimeout=12',
    '-o',
    'ServerAliveInterval=15',
    '-o',
    'ServerAliveCountMax=4',
    sshTarget,
    remoteProbeScript(),
  ];

  const result = spawnSync('ssh', sshArgs, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`runtime probe exited with status ${result.status}: ${String(result.stderr ?? '').trim()}`);
  }
  return parseRuntimeReport(result.stdout);
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`Aliyun Runtime Doctor 参数错误：${error.message}\n`);
    process.exit(1);
  }

  if (options.help) {
    printHelp();
    return;
  }

  const envFile = {
    ...parseEnvFile(join(root, '.env')),
    ...parseEnvFile(join(root, '.env.local')),
  };
  const config = {
    host: envValue(envFile, 'ALIYUN_HOST'),
    user: envValue(envFile, 'ALIYUN_USER'),
    port: envValue(envFile, 'ALIYUN_PORT', '22'),
    sshKey: envValue(envFile, 'ALIYUN_SSH_KEY'),
  };

  try {
    const state = collectRemoteRuntimeState(config);
    const analysis = analyzeAliyunRuntimeState(state, { strict: options.strict });
    if (options.json) {
      process.stdout.write(`${JSON.stringify(analysis, null, 2)}\n`);
    } else {
      process.stdout.write(`${renderAliyunRuntimeReport(analysis)}\n`);
    }
    process.exitCode = exitCodeForAnalysis(analysis);
  } catch (error) {
    process.stderr.write(`Aliyun Runtime Doctor failed: ${error.message}\n`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
