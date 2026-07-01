import {
  isPublicMemory,
  memoryCaption,
  memoryDescription,
  memoryTitle,
  normalizeMemory,
} from './memoryContent.js';
import { memoryExternalUrl, memoryImageUrl, memoryOriginalUrl } from './memoryMedia.js';
import { memoryPresentationModel, memoryStatusBadges } from './memoryPresentation.js';
import {
  hasAnyReports,
  hasOpenReports,
  normalizeReportSummary,
  reportSummaryItems,
  reportSummaryLabel,
} from './reporting.js';
import {
  memorySharePreviewUrl,
  memoryShareUrl,
  preferredMemoryShareUrl,
  shareLinkMode,
} from './routes.js';
import { SITE_NAME } from './siteMeta.js';

function memoryDetailInfoItems(detail, {
  collectionIndex = -1,
  collectionTotal = 0,
} = {}) {
  const items = [
    {
      key: 'module',
      label: '图片编号',
      value: `MEM_ID #${String(detail.id ?? 'local').slice(0, 8).toUpperCase()}`,
    },
    {
      key: 'owner',
      label: '上传者',
      value: detail.ownerLabel,
    },
    {
      key: 'visibility',
      label: '可见性',
      value: detail.visibilityLabel,
    },
    {
      key: 'size',
      label: '文件大小',
      value: detail.sizeLabel === '0 B' ? '未记录' : detail.sizeLabel,
    },
    {
      key: 'share',
      label: '分享策略',
      value: detail.shareLinkMode === 'preview' ? '服务端预览链接' : '站内直达链接',
    },
  ];

  if (collectionTotal > 1 && collectionIndex >= 0) {
    items.unshift({
      key: 'position',
      label: '当前位置',
      value: `${collectionIndex + 1} / ${collectionTotal}`,
    });
  }

  return items;
}

function isIdentifierLikeTitle(title, id) {
  const compactTitle = String(title ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  const compactId = String(id ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  return (
    compactTitle.length >= 24 &&
    (/^[a-f0-9]{24,}$/i.test(compactTitle) || (compactId && compactTitle === compactId))
  );
}

function markdownLinkLabel(value) {
  return String(value ?? '未命名记忆').replace(/[[\]\\]/g, '\\$&');
}

function memoryDetailLinkActions(detail) {
  const shareTarget = detail.preferredShareUrl || detail.shareUrl;

  return [
    {
      key: 'share',
      label: '复制分享链接',
      description: detail.shareLinkMode === 'preview' && detail.sharePreviewUrl
        ? '复制带服务端预览的分享链接'
        : '复制站内单图分享链接',
      url: shareTarget,
      successMessage: detail.shareLinkMode === 'preview' && detail.sharePreviewUrl
        ? '已复制带服务端预览的分享链接。'
        : '分享链接已复制。',
    },
    {
      key: 'markdown',
      label: '复制 Markdown',
      description: '复制可粘贴到文档或帖子里的 Markdown 链接',
      url: shareTarget,
      text: `[${markdownLinkLabel(detail.title)}](${shareTarget})`,
      successMessage: 'Markdown 链接已复制。',
    },
    {
      key: 'image',
      label: '复制图片 URL',
      description: '复制当前可访问的原图或签名图片链接',
      url: detail.originalUrl || detail.externalUrl,
      successMessage: '图片 URL 已复制。',
    },
  ];
}

export function memoryMetaModel(memory) {
  const normalized = normalizeMemory(memory);
  const shareUrl = memoryShareUrl(normalized.id);
  return {
    title: `${memoryTitle(normalized)} | ${SITE_NAME}`,
    description: memoryDescription(
      normalized,
      '在潮声、晚霞与你的照片之间，保存每一份不会褪色的心情。',
    ),
    imageUrl: memoryImageUrl(normalized),
    shareUrl,
  };
}

export function memoryDetailModel(memory, {
  canManage = false,
  collectionIndex = -1,
  collectionTotal = 0,
} = {}) {
  const normalized = normalizeMemory(memory);
  const presentation = memoryPresentationModel(normalized);
  const title = memoryTitle(normalized);
  const caption = memoryCaption(normalized);
  const displayTitle = isIdentifierLikeTitle(title, normalized.id) ? '未命名记忆' : title;
  const reportSummary = normalizeReportSummary(normalized.report_summary);
  const detail = {
    ...presentation,
    title: displayTitle,
    imageUrl: memoryImageUrl(normalized),
    originalUrl: memoryOriginalUrl(normalized),
    externalUrl: memoryExternalUrl(normalized),
    shareUrl: memoryShareUrl(normalized.id),
    sharePreviewUrl: memorySharePreviewUrl(normalized.id),
    preferredShareUrl: preferredMemoryShareUrl(normalized.id),
    shareLinkMode: shareLinkMode(),
    alt: title,
    canReport: !canManage && isPublicMemory(normalized),
    statusBadges: memoryStatusBadges(normalized),
    reportSummary,
    reportSummaryLabel: reportSummaryLabel(reportSummary),
    reportSummaryItems: reportSummaryItems(reportSummary),
    hasAnyReports: hasAnyReports(reportSummary),
    hasOpenReports: hasOpenReports(reportSummary),
  };

  return {
    ...detail,
    infoItems: memoryDetailInfoItems(detail, { collectionIndex, collectionTotal }),
    linkActions: memoryDetailLinkActions(detail),
  };
}
