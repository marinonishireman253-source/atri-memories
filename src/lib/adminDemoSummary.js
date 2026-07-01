import {
  accessModeLabel,
  normalizeOverviewSummary,
  pendingItemsTotal,
  reportStatusTotal,
} from './adminOverview.js';
import { formatMemoryBytes } from './memoryPresentation.js';

function isProductionOrigin(origin) {
  const originValue = String(origin ?? '').trim();
  if (!originValue) return false;

  let parsedOrigin;
  try {
    parsedOrigin = new URL(originValue);
  } catch {
    return false;
  }

  if (parsedOrigin.protocol !== 'http:' && parsedOrigin.protocol !== 'https:') {
    return false;
  }

  const hostname = normalizeOriginHostname(parsedOrigin.hostname);
  if (
    hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname === '::1'
    || hostname.endsWith('.local')
  ) {
    return false;
  }

  return !isPrivateIpv4Address(hostname) && !isPrivateIpv6Address(hostname);
}

function isPrivateIpv4Address(hostname) {
  const octets = hostname.split('.');
  if (octets.length !== 4 || octets.some((octet) => !/^\d+$/.test(octet))) {
    return false;
  }

  const [first, second, third, fourth] = octets.map(Number);
  if ([first, second, third, fourth].some((octet) => octet < 0 || octet > 255)) {
    return false;
  }

  return (
    (first === 0 && second === 0 && third === 0 && fourth === 0) ||
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  );
}

function normalizeOriginHostname(hostname) {
  return hostname
    .toLowerCase()
    .replace(/^\[(.*)\]$/, '$1')
    .replace(/\.$/, '');
}

function isPrivateIpv6Address(hostname) {
  if (!hostname.includes(':')) return false;
  if (hostname === '::') return true;

  const mappedIpv4Address = ipv4MappedAddress(hostname);
  if (mappedIpv4Address) {
    return isPrivateIpv4Address(mappedIpv4Address);
  }

  const firstHextet = hostname.split(':', 1)[0];
  if (!/^[\da-f]{1,4}$/.test(firstHextet)) return false;

  const firstHextetValue = Number.parseInt(firstHextet, 16);
  return (
    (firstHextetValue >= 0xfe80 && firstHextetValue <= 0xfebf) ||
    (firstHextetValue >= 0xfc00 && firstHextetValue <= 0xfdff)
  );
}

function ipv4MappedAddress(hostname) {
  const prefix = '::ffff:';
  if (!hostname.startsWith(prefix)) return '';

  const suffix = hostname.slice(prefix.length);
  if (suffix.includes('.')) return suffix;

  const hextets = suffix.split(':');
  if (hextets.length !== 2 || hextets.some((hextet) => !/^[\da-f]{1,4}$/.test(hextet))) {
    return '';
  }

  const high = Number.parseInt(hextets[0], 16);
  const low = Number.parseInt(hextets[1], 16);
  return [
    (high >> 8) & 255,
    high & 255,
    (low >> 8) & 255,
    low & 255,
  ].join('.');
}

export function adminDemoSummaryCards(summary, { currentOrigin = '' } = {}) {
  const normalized = normalizeOverviewSummary(summary);
  const productionOrigin = isProductionOrigin(currentOrigin);
  const reportTotal = reportStatusTotal(normalized);
  const pendingTotal = pendingItemsTotal(normalized);

  return [
    {
      key: 'content-ops',
      title: '内容运营',
      value: `${normalized.total_memories} 张记忆`,
      detail: `24 小时新增 ${normalized.uploaded_24h} 张，7 天新增 ${normalized.uploaded_7d} 张，已知容量 ${formatMemoryBytes(normalized.total_storage_bytes)}。`,
      actionLabel: '去图片管理',
      targetTab: 'images',
      tone: normalized.unknown_size_count > 0 || normalized.legacy_count > 0 ? 'attention' : 'ok',
    },
    {
      key: 'permissions',
      title: '账号权限',
      value: `${normalized.total_users} 个用户`,
      detail: `${normalized.admin_count} 个管理员，${normalized.unconfirmed_users} 个邮箱未确认，${normalized.disabled_upload_users} 个账号暂停上传。`,
      actionLabel: '去用户管理',
      targetTab: 'users',
      tone: normalized.unconfirmed_users > 0 || normalized.disabled_upload_users > 0 ? 'attention' : 'ok',
    },
    {
      key: 'governance',
      title: '治理队列',
      value: `${normalized.open_reports_count} 条待处理`,
      detail: `举报累计 ${reportTotal} 条：${normalized.resolved_reports_count} 条已处理，${normalized.dismissed_reports_count} 条已驳回。`,
      actionLabel: normalized.open_reports_count > 0 ? '去举报处理' : '看操作日志',
      targetTab: normalized.open_reports_count > 0 ? 'reports' : 'logs',
      tone: normalized.open_reports_count > 0 ? 'warning' : 'ok',
    },
    {
      key: 'launch-readiness',
      title: '上线准备',
      value: productionOrigin ? '生产域名' : '本地预览',
      detail: `${accessModeLabel(normalized.registrations_enabled)}，普通用户上传${normalized.uploads_enabled ? '开启' : '暂停'}，待收口项 ${pendingTotal} 个。`,
      actionLabel: '去站点设置',
      targetTab: 'settings',
      tone: productionOrigin ? 'ok' : 'warning',
    },
  ];
}
