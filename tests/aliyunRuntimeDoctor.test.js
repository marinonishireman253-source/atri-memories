import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  analyzeAliyunRuntimeState,
  exitCodeForAnalysis,
  parseRuntimeReport,
  renderAliyunRuntimeReport,
} from '../scripts/aliyun-runtime-doctor.mjs';

function healthyState(overrides = {}) {
  return {
    cpuCount: 2,
    load1: 0.4,
    load5: 0.5,
    load15: 0.7,
    memoryAvailableMiB: 512,
    swapTotalMiB: 4096,
    swapUsedMiB: 0,
    rootUsedPercent: 40,
    certbotVersion: 'certbot 2.9.0',
    certbotTimerEnabled: 'enabled',
    certbotTimerActive: 'active',
    snapdServiceEnabled: 'masked',
    snapdSocketEnabled: 'masked',
    snapdRepairTimerEnabled: 'masked',
    snapCertbotTimerEnabled: 'disabled',
    snapdServiceActive: 'inactive',
    snapdSocketActive: 'inactive',
    dockerLogRotationConfigured: true,
    sshdPorts: [2022],
    firewallBlocksSsh22: true,
    sshRateLimitConfigured: true,
    fail2banSshdActive: true,
    dockerBackendPortsBlocked: true,
    dbReady: true,
    authResolvesDb: true,
    recentRuntimeErrorCount: 0,
    containers: [
      { name: 'supabase-auth', health: 'healthy', restartPolicy: 'unless-stopped', status: 'Up' },
      { name: 'supabase-db', health: 'healthy', restartPolicy: 'unless-stopped', status: 'Up' },
      { name: 'supabase-edge-functions', health: 'healthy', restartPolicy: 'unless-stopped', status: 'Up' },
      { name: 'supabase-kong', health: 'healthy', restartPolicy: 'unless-stopped', status: 'Up' },
      { name: 'supabase-rest', health: 'healthy', restartPolicy: 'unless-stopped', status: 'Up' },
      { name: 'supabase-storage', health: 'healthy', restartPolicy: 'unless-stopped', status: 'Up' },
    ],
    ...overrides,
  };
}

test('healthy fixed-size Aliyun runtime passes strict diagnosis', () => {
  const analysis = analyzeAliyunRuntimeState(healthyState(), { strict: true });

  assert.equal(analysis.status, 'ok');
  assert.deepEqual(analysis.failures, []);
  assert.equal(exitCodeForAnalysis(analysis), 0);
  assert.match(renderAliyunRuntimeReport(analysis), /阿里云固定规格运行时检查通过/);
});

test('snapd, missing certbot timer, and weak Docker logging block strict diagnosis', () => {
  const analysis = analyzeAliyunRuntimeState(healthyState({
    snapdServiceEnabled: 'enabled',
    snapdServiceActive: 'active',
    certbotTimerActive: 'inactive',
    dockerLogRotationConfigured: false,
  }), { strict: true });

  assert.equal(analysis.status, 'fail');
  assert.match(renderAliyunRuntimeReport(analysis), /snapd 未保持禁用/);
  assert.match(renderAliyunRuntimeReport(analysis), /certbot.timer 未启用并运行/);
  assert.match(renderAliyunRuntimeReport(analysis), /Docker 日志轮转未配置/);
});

test('unhealthy Supabase containers and DB connectivity failures are blockers', () => {
  const state = healthyState({
    dbReady: false,
    authResolvesDb: false,
    containers: [
      { name: 'supabase-auth', health: 'unhealthy', restartPolicy: 'no', status: 'Restarting' },
      { name: 'supabase-db', health: 'healthy', restartPolicy: 'unless-stopped', status: 'Up' },
    ],
  });
  const analysis = analyzeAliyunRuntimeState(state, { strict: false });

  assert.equal(analysis.status, 'fail');
  assert.match(renderAliyunRuntimeReport(analysis), /Supabase 容器异常：supabase-auth/);
  assert.match(renderAliyunRuntimeReport(analysis), /DB readiness 检查失败/);
  assert.match(renderAliyunRuntimeReport(analysis), /Auth 容器无法解析 db/);
});

test('public SSH 22 and direct Docker backend exposure block strict diagnosis', () => {
  const analysis = analyzeAliyunRuntimeState(healthyState({
    sshdPorts: [22, 2022],
    firewallBlocksSsh22: false,
    dockerBackendPortsBlocked: false,
  }), { strict: true });

  assert.equal(analysis.status, 'fail');
  assert.match(renderAliyunRuntimeReport(analysis), /默认 SSH 22 仍在 sshd 配置中/);
  assert.match(renderAliyunRuntimeReport(analysis), /SSH 22 缺少本机防火墙兜底阻断/);
  assert.match(renderAliyunRuntimeReport(analysis), /Docker 后端端口缺少公网阻断/);
});

test('missing SSH management rate limit and fail2ban block strict diagnosis', () => {
  const analysis = analyzeAliyunRuntimeState(healthyState({
    sshRateLimitConfigured: false,
    fail2banSshdActive: false,
  }), { strict: true });

  assert.equal(analysis.status, 'fail');
  assert.match(renderAliyunRuntimeReport(analysis), /SSH 管理端口缺少来源限速规则/);
  assert.match(renderAliyunRuntimeReport(analysis), /fail2ban sshd jail 未启用/);
});

test('runtime parser reads SSH and Docker exposure hardening fields', () => {
  const state = parseRuntimeReport(`
FIELD|sshd_ports|2022
FIELD|firewall_blocks_ssh22|1
FIELD|ssh_rate_limit_configured|1
FIELD|fail2ban_sshd_active|1
FIELD|docker_backend_ports_blocked|1
`);

  assert.deepEqual(state.sshdPorts, [2022]);
  assert.equal(state.firewallBlocksSsh22, true);
  assert.equal(state.sshRateLimitConfigured, true);
  assert.equal(state.fail2banSshdActive, true);
  assert.equal(state.dockerBackendPortsBlocked, true);
});

test('remote probe accepts compact iptables DROP rules emitted by iptables-save', () => {
  const script = readFileSync(new URL('../scripts/aliyun-runtime-doctor.mjs', import.meta.url), 'utf8');

  assert.match(script, /--dport 22\[\[:space:\]\]\.\*-j DROP/);
  assert.match(script, /--dports 8000,8443\[\[:space:\]\]\.\*-j DROP/);
  assert.ok(script.includes('--dport $ssh_mgmt_port[[:space:]].*hashlimit-above'));
  assert.doesNotMatch(script, /--dport 22 \.\* -j DROP/);
  assert.doesNotMatch(script, /--dports 8000,8443 \.\* -j DROP/);
});

test('low memory and high load warn by default and fail in strict mode', () => {
  const state = healthyState({
    cpuCount: 1,
    load5: 3.5,
    memoryAvailableMiB: 180,
    recentRuntimeErrorCount: 2,
  });
  const defaultAnalysis = analyzeAliyunRuntimeState(state, { strict: false });
  const strictAnalysis = analyzeAliyunRuntimeState(state, { strict: true });

  assert.equal(defaultAnalysis.status, 'warn');
  assert.equal(exitCodeForAnalysis(defaultAnalysis), 0);
  assert.equal(strictAnalysis.status, 'fail');
  assert.equal(exitCodeForAnalysis(strictAnalysis), 1);
  assert.match(renderAliyunRuntimeReport(strictAnalysis), /可用内存低于保守阈值/);
  assert.match(renderAliyunRuntimeReport(strictAnalysis), /5 分钟负载过高/);
  assert.match(renderAliyunRuntimeReport(strictAnalysis), /最近仍有后端超时错误/);
});

test('remote runtime report parser keeps concrete host details out of analysis text', () => {
  const state = parseRuntimeReport(`
FIELD|hostname|private-hostname
FIELD|cpu_count|2
FIELD|load_1|0.11
FIELD|load_5|0.42
FIELD|load_15|1.21
FIELD|memory_available_mib|640
FIELD|swap_total_mib|4096
FIELD|swap_used_mib|0
FIELD|root_used_percent|40
FIELD|certbot_version|certbot 2.9.0
FIELD|certbot_timer_enabled|enabled
FIELD|certbot_timer_active|active
FIELD|snapd_service_enabled|masked
FIELD|snapd_socket_enabled|masked
FIELD|snapd_repair_timer_enabled|masked
FIELD|snap_certbot_timer_enabled|disabled
FIELD|snapd_service_active|inactive
FIELD|snapd_socket_active|inactive
FIELD|docker_log_rotation_configured|1
FIELD|sshd_ports|2022
FIELD|firewall_blocks_ssh22|1
FIELD|ssh_rate_limit_configured|1
FIELD|fail2ban_sshd_active|1
FIELD|docker_backend_ports_blocked|1
FIELD|db_ready|1
FIELD|auth_resolves_db|1
FIELD|recent_runtime_error_count|0
CONTAINER|supabase-auth|healthy|unless-stopped|Up
CONTAINER|supabase-db|healthy|unless-stopped|Up
CONTAINER|supabase-edge-functions|healthy|unless-stopped|Up
CONTAINER|supabase-kong|healthy|unless-stopped|Up
CONTAINER|supabase-rest|healthy|unless-stopped|Up
CONTAINER|supabase-storage|healthy|unless-stopped|Up
`);
  const analysis = analyzeAliyunRuntimeState(state, { strict: true });
  const report = renderAliyunRuntimeReport(analysis);

  assert.equal(analysis.status, 'ok');
  assert.equal(state.hostname, 'private-hostname');
  assert.doesNotMatch(report, /private-hostname/);
});

test('package scripts expose Aliyun runtime doctor commands', () => {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

  assert.equal(packageJson.scripts['aliyun:runtime:doctor'], 'node scripts/aliyun-runtime-doctor.mjs');
  assert.equal(packageJson.scripts['aliyun:runtime:doctor:test'], 'node --test tests/aliyunRuntimeDoctor.test.js');
  assert.match(packageJson.scripts['project:check'], /npm run aliyun:runtime:doctor:test/);
});
