import { DEFAULT_MEMORY_FILTERS } from './memoryContent.js';
import { formatMemoryBytes } from './memoryPresentation.js';

function hasRefinedFilters(filters) {
  return Boolean(
    filters?.query?.trim() ||
      filters?.dateRange !== DEFAULT_MEMORY_FILTERS.dateRange ||
      filters?.tag !== DEFAULT_MEMORY_FILTERS.tag,
  );
}

export function userGalleryScopeModel({ user, filters, totalCount, loading }) {
  const isCurrentUserScope = Boolean(user && filters?.ownerId === user.id);
  const isFavoritesScope = Boolean(user && filters?.favoritesOnly);
  const ownerLabel = filters?.ownerLabel?.trim() || user?.email || '当前账号';
  const refined = hasRefinedFilters(filters);
  const rangeLabel = isCurrentUserScope ? '我的图片' : isFavoritesScope ? '我的收藏' : '全部公开';
  const description = isCurrentUserScope
    ? refined
      ? '当前画廊只显示你的图片，并继续叠加关键词、标签或时间筛选。'
      : `当前画廊正在查看 ${ownerLabel} 上传的全部图片。`
    : isFavoritesScope
      ? refined
        ? '当前画廊正在查看你的收藏，并继续叠加关键词、标签或时间筛选。'
        : '当前画廊正在查看你收藏的图片。'
      : refined
        ? '当前画廊正在浏览公开图片，并带有额外筛选条件。'
        : '当前画廊正在浏览全部公开图片。';

  return {
    isCurrentUserScope,
    isFavoritesScope,
    ownerLabel,
    refined,
    totalCount: Number(totalCount ?? 0),
    rangeLabel,
    matchedCountLabel: loading ? '同步中' : String(totalCount ?? 0),
    description,
  };
}

export function userSummaryStatsModel({ summary, loadingSummary, galleryScope }) {
  const storageStats = summary.storageStats ?? { totalBytes: 0, knownCount: 0, unknownCount: 0 };

  return [
    {
      key: 'upload-count',
      label: '上传图片',
      value: loadingSummary ? '...' : String(summary.uploadCount ?? 0),
      detail: loadingSummary ? '正在同步你的历史上传数量' : '个人累计上传',
    },
    {
      key: 'latest-upload',
      label: '最近上传',
      value: loadingSummary ? '同步中' : summary.latestUploadLabel,
      detail: '最近一次成功保存的图片时间',
    },
    {
      key: 'current-range',
      label: '当前范围',
      value: galleryScope.rangeLabel,
      detail: galleryScope.description,
    },
    {
      key: 'favorites-count',
      label: '收藏图片',
      value: loadingSummary ? '...' : String(summary.favoritesCount ?? 0),
      detail: loadingSummary ? '正在同步你的收藏数量' : '当前账号累计收藏',
    },
    {
      key: 'storage-usage',
      label: '已知容量',
      value: loadingSummary ? '...' : formatMemoryBytes(storageStats.totalBytes),
      detail: loadingSummary
        ? '正在同步你的图片容量'
        : storageStats.unknownCount > 0
          ? `${storageStats.knownCount} 张已统计，${storageStats.unknownCount} 张大小未知`
          : `${storageStats.knownCount} 张图片已纳入容量统计`,
    },
    {
      key: 'matched-count',
      label: '当前命中',
      value: galleryScope.matchedCountLabel,
      detail: galleryScope.isCurrentUserScope
        ? '当前你的图片范围内命中的数量'
        : galleryScope.isFavoritesScope
          ? '当前你的收藏范围内命中的数量'
          : '当前公开画廊命中的数量',
    },
  ];
}

function remainingLabel(limit, count) {
  if (typeof limit !== 'number') return '不限';
  return String(Math.max(limit - Number(count ?? 0), 0));
}

function windowPolicyItem({ key, label, limit, count }) {
  const hasLimit = typeof limit === 'number';
  return {
    key,
    label,
    value: hasLimit ? `${count ?? 0} / ${limit}` : '不限',
    detail: hasLimit ? `剩余 ${remainingLabel(limit, count)} 张` : '当前没有设置窗口限制',
    tone: hasLimit && Number(count ?? 0) >= limit ? 'warning' : 'normal',
  };
}

export function userUploadPolicyModel({ summary, uploadDisabled = false, loadingSummary = false }) {
  const policy = summary?.uploadPolicy;
  const profile = summary?.profile;
  const uploadCount = Number(policy?.upload_count ?? summary?.uploadCount ?? 0);
  const totalLimit = typeof policy?.upload_limit_total === 'number'
    ? policy.upload_limit_total
    : typeof profile?.upload_limit_total === 'number'
      ? profile.upload_limit_total
      : null;
  const canUpload = policy ? policy.can_upload !== false : profile?.can_upload !== false;
  const uploadsEnabled = policy ? policy.uploads_enabled !== false : !uploadDisabled;
  const allowsUpload = policy ? policy.allows_upload !== false : !uploadDisabled && canUpload;
  const isAdmin = Boolean(policy?.is_admin);

  const headline = loadingSummary
    ? '正在同步上传权限'
    : allowsUpload
      ? '当前可以上传'
      : !uploadsEnabled && !isAdmin
        ? '站点已暂停普通用户上传'
        : !canUpload
          ? '你的账号已暂停上传'
          : totalLimit !== null && uploadCount >= totalLimit
            ? '已达到账号上传上限'
            : '当前暂不可上传';

  const detail = loadingSummary
    ? '正在读取站点开关、账号策略和时间窗口限制。'
    : allowsUpload
      ? '上传入口可用，提交时仍会由服务端再次校验。'
      : '上传入口会保持关闭，直到管理员调整站点或账号策略。';

  return {
    headline,
    detail,
    tone: allowsUpload ? 'ok' : 'blocked',
    isAdmin,
    allowsUpload,
    items: [
      {
        key: 'total',
        label: '账号总额度',
        value: totalLimit === null ? `${uploadCount} / 不限` : `${uploadCount} / ${totalLimit}`,
        detail: totalLimit === null ? '当前账号没有总量上限' : `剩余 ${remainingLabel(totalLimit, uploadCount)} 张`,
        tone: totalLimit !== null && uploadCount >= totalLimit ? 'warning' : 'normal',
      },
      windowPolicyItem({
        key: 'hour',
        label: '最近 1 小时',
        limit: policy?.upload_hour_limit,
        count: policy?.upload_hour_count,
      }),
      windowPolicyItem({
        key: 'day',
        label: '最近 24 小时',
        limit: policy?.upload_day_limit,
        count: policy?.upload_day_count,
      }),
    ],
  };
}
