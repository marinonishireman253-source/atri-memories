import {
  isFeaturedMemory,
  isHiddenMemory,
  memoryCaption,
  memoryTitle,
  normalizeMemory,
} from './memoryContent.js';

export function formatMemoryDate(value, variant = 'default') {
  const date = new Date(value);
  if (variant === 'month-day') {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'long',
      day: 'numeric',
    }).format(date);
  }
  if (variant === 'compact') {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatMemoryBytes(value) {
  const bytes = Number(value ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const amount = bytes / 1024 ** exponent;
  return `${amount >= 10 || exponent === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[exponent]}`;
}

export function memoryOwnerLabel(memory, fallback = '历史图片 / 未归属') {
  const normalized = normalizeMemory(memory);
  if (normalized.owner_email) return normalized.owner_email;
  if (normalized.owner_id) return normalized.owner_id;
  return fallback;
}

export function memoryVisibilityLabel(memory, {
  publicLabel = '公开',
  hiddenLabel = '已下架',
} = {}) {
  return isHiddenMemory(memory) ? hiddenLabel : publicLabel;
}

export function memoryStatusBadges(memory) {
  const normalized = normalizeMemory(memory);
  const badges = [];

  if (isFeaturedMemory(normalized)) {
    badges.push({
      key: 'featured',
      label: '首页精选',
      className: 'featured-badge',
    });
  }
  if (isHiddenMemory(normalized)) {
    badges.push({
      key: 'hidden',
      label: '已下架',
      className: 'hidden-badge',
    });
  }

  return badges;
}

export function memoryPresentationModel(memory, {
  dateVariant = 'default',
  ownerFallback = '历史图片 / 未归属',
  visibilityLabels,
} = {}) {
  const normalized = normalizeMemory(memory);

  return {
    ...normalized,
    title: memoryTitle(normalized),
    caption: memoryCaption(normalized),
    alt: memoryTitle(normalized),
    dateLabel: formatMemoryDate(normalized.created_at, dateVariant),
    ownerLabel: memoryOwnerLabel(normalized, ownerFallback),
    sizeLabel: formatMemoryBytes(normalized.file_size_bytes),
    visibilityLabel: memoryVisibilityLabel(normalized, visibilityLabels),
    statusBadges: memoryStatusBadges(normalized),
  };
}
