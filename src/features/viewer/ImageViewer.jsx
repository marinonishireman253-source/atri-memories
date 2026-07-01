import { useEffect, useMemo, useState } from 'react';
import { playStampThud } from '../../lib/audioEffects.js';
import { reportReasons } from '../../hooks/useReports.js';
import { memoryDetailModel } from '../../lib/memoryDetail.js';
import { downloadMemoryImage } from '../../lib/downloads.js';
import { defaultTagPresets } from '../../lib/tags.js';
import { errorNotice, favoriteRemovedNotice, favoriteSavedNotice } from '../../lib/userFeedback.js';
import { ViewerEditForm } from './ViewerEditForm.jsx';
import { ViewerInfoGrid } from './ViewerInfoGrid.jsx';
import { ViewerLinkActions } from './ViewerLinkActions.jsx';
import { ViewerReportForm } from './ViewerReportForm.jsx';
import { useViewerEditForm } from './useViewerEditForm.js';
import { useViewerReportForm } from './useViewerReportForm.js';

export function ImageViewer({
  memory,
  user,
  deleting,
  updating,
  canManage,
  isAdmin,
  favoriteIds,
  favoritesAvailable,
  togglingFavoriteId,
  tagPresets = defaultTagPresets,
  collectionIndex = -1,
  collectionTotal = 0,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onClose,
  onDelete,
  onUpdate,
  onToggleFavorite,
  onSelectTag,
  onNeedAuth,
}) {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [favoriteNotice, setFavoriteNotice] = useState(null);
  const busy = deleting || updating;
  const editForm = useViewerEditForm({ memory, hasNext, onNext, onUpdate });
  const reportForm = useViewerReportForm({ memory, user });
  const interactionLocked = busy || editForm.editing || reportForm.reporting || confirming;
  const detail = useMemo(
    () => memoryDetailModel(memory, { canManage, collectionIndex, collectionTotal }),
    [memory, canManage, collectionIndex, collectionTotal],
  );
  const canReport = detail.canReport;
  const isFavorited = Boolean(user && favoriteIds?.has(memory.id));
  const togglingFavorite = togglingFavoriteId === memory.id;

  useEffect(() => {
    setConfirming(false);
    setMessage('');
    setDownloadError('');
    setShareMessage('');
    setFavoriteNotice(null);
  }, [memory.id]);

  useEffect(() => {
    if (editForm.editing || confirming || busy) return undefined;

    const navigateWithKeyboard = (event) => {
      if (event.key === 'ArrowLeft' && hasPrevious) {
        event.preventDefault();
        onPrevious();
      }
      if (event.key === 'ArrowRight' && hasNext) {
        event.preventDefault();
        onNext();
      }
    };

    window.addEventListener('keydown', navigateWithKeyboard);
    return () => window.removeEventListener('keydown', navigateWithKeyboard);
  }, [busy, confirming, editForm.editing, hasNext, hasPrevious, onNext, onPrevious]);

  const downloadCurrentImage = async () => {
    setDownloadError('');
    setDownloading(true);

    try {
      await downloadMemoryImage(memory);
    } catch {
      setDownloadError('下载失败。可以打开原图后手动保存。');
    } finally {
      setDownloading(false);
    }
  };

  const copyLinkAction = async (action) => {
    setShareMessage('');
    const copiedText = action.text ?? action.url;

    try {
      await navigator.clipboard.writeText(copiedText);
      setShareMessage(action.successMessage);
    } catch {
      setShareMessage(copiedText);
    }
  };

  const deleteCurrentMemory = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      await onDelete({ memory });
    } catch (error) {
      setMessage(error.message);
    }
  };

  const toggleCurrentFavorite = async () => {
    if (!user) {
      onNeedAuth?.();
      setFavoriteNotice(errorNotice('请先登录以收藏此图片。', '未登录无法收藏'));
      return;
    }
    setFavoriteNotice(null);

    try {
      const nextFavorite = await onToggleFavorite(memory);
      if (nextFavorite) {
        playStampThud();
      }
      setFavoriteNotice(nextFavorite ? favoriteSavedNotice(memory.title) : favoriteRemovedNotice(memory.title));
    } catch (error) {
      setFavoriteNotice(errorNotice(error.message, '收藏操作未完成'));
    }
  };

  return (
    <div
      className="viewer-overlay"
      role="presentation"
      onMouseDown={busy ? undefined : onClose}
    >
      <section
        className="image-viewer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="viewer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {hasPrevious && (
          <button
            className="viewer-nav viewer-nav-prev"
            type="button"
            onClick={onPrevious}
            disabled={interactionLocked}
            aria-label="查看上一张图片"
          >
            ‹
          </button>
        )}
        {hasNext && (
          <button
            className="viewer-nav viewer-nav-next"
            type="button"
            onClick={onNext}
            disabled={interactionLocked}
            aria-label="查看下一张图片"
          >
            ›
          </button>
        )}
        <div className="viewer-image-wrap" aria-label="当前记忆图片">
          <button className="viewer-close" onClick={onClose} aria-label="关闭大图" disabled={busy}>
            ×
          </button>
          <img
            src={detail.originalUrl || detail.imageUrl}
            alt={detail.alt}
            className="viewer-image"
            key={detail.id}
            decoding="async"
            fetchPriority="high"
          />
        </div>
        <aside className="viewer-details glass-panel">
          <div className="viewer-details-scroll">
          <div className="viewer-detail-top">
            <p className="eyebrow">MEMORY DETAIL</p>
            <p className="memory-date">{detail.dateLabel}</p>
          </div>
          {editForm.editing && canManage ? (
            <ViewerEditForm
              updating={updating}
              hasNext={hasNext}
              tagPresets={tagPresets}
              isAdmin={isAdmin}
              editTitle={editForm.title}
              editCaption={editForm.caption}
              editTagText={editForm.tagText}
              editFeatured={editForm.featured}
              editVisibilityStatus={editForm.visibilityStatus}
              editMessage={editForm.message}
              onEditTitleChange={editForm.setTitle}
              onEditCaptionChange={editForm.setCaption}
              onEditTagTextChange={editForm.setTagText}
              onEditFeaturedChange={editForm.setFeatured}
              onEditVisibilityStatusChange={editForm.setVisibilityStatus}
              onCancel={editForm.cancel}
              onSubmit={editForm.submit}
              onSubmitAndNext={() => editForm.submit(undefined, { continueDirection: 'next' })}
            />
          ) : (
            <>
              <div className="viewer-status-row">
                {detail.statusBadges.map((badge) => (
                  <span key={badge.key} className={badge.className}>{badge.label}</span>
                ))}
              </div>
              <h2 id="viewer-title">{detail.title}</h2>
              {detail.caption && <p className="viewer-caption">{detail.caption}</p>}
              <ViewerInfoGrid items={detail.infoItems} />
              {detail.tags?.length > 0 && (
                <div className="tag-row viewer-tags">
                  {detail.tags.map((tag) => (
                    <button
                      className="tag-chip viewer-tag-button"
                      type="button"
                      key={tag}
                      onClick={() => onSelectTag?.(tag)}
                      disabled={busy}
                      title={`查看 ${tag} 标签`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
              {isAdmin && (
                <section className="viewer-governance">
                  <p className="viewer-governance-title">治理状态</p>
                  <p className="viewer-governance-summary">{detail.reportSummaryLabel}</p>
                  {detail.reportSummaryItems.length > 0 ? (
                    <div className="tag-row viewer-governance-tags">
                      {detail.reportSummaryItems.map((item) => (
                        <span className="tag-chip static" key={item.key}>
                          {item.label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="viewer-governance-note">当前没有举报记录。</p>
                  )}
                  {detail.hasOpenReports && (
                    <p className="viewer-governance-note">
                      这张图片仍有待处理举报，建议在后台举报处理页查看详情。
                    </p>
                  )}
                </section>
              )}
              <div className="viewer-actions">
                <div className="viewer-action-group primary">
                  <button
                    className="download-button"
                    type="button"
                    onClick={downloadCurrentImage}
                    disabled={downloading || busy}
                  >
                    {downloading ? '下载准备中...' : '下载原图'}
                  </button>
                  <button
                    className={`edit-button favorite-button ${isFavorited ? 'active' : ''}`}
                    type="button"
                    onClick={toggleCurrentFavorite}
                    disabled={busy || togglingFavorite}
                  >
                    {togglingFavorite ? '处理中...' : isFavorited ? '取消收藏' : '❤ 加入收藏'}
                  </button>
                </div>
                <ViewerLinkActions
                  actions={detail.linkActions}
                  busy={busy}
                  onCopy={copyLinkAction}
                />
                <div className="viewer-action-group secondary">
                  {canManage && (
                    <button className="edit-button" type="button" onClick={() => editForm.setEditing(true)} disabled={busy}>
                      编辑信息
                    </button>
                  )}
                  {canReport && (
                    <button
                      className="edit-button"
                      type="button"
                      onClick={reportForm.toggle}
                      disabled={busy}
                    >
                      {reportForm.reporting ? '收起举报表单' : '举报图片'}
                    </button>
                  )}
                </div>
                {shareMessage && <p className="share-message">{shareMessage}</p>}
                {favoriteNotice && (
                  <p className={`share-message ${favoriteNotice.tone === 'error' ? 'favorite-error' : ''}`}>
                    {favoriteNotice.title}
                    {favoriteNotice.body ? `：${favoriteNotice.body}` : ''}
                  </p>
                )}
                {downloadError && (
                  <p className="download-error">
                    {downloadError}{' '}
                    <a href={detail.externalUrl} target="_blank" rel="noreferrer">
                      打开原图
                    </a>
                  </p>
                )}
                {reportForm.success && <p className="report-success">{reportForm.success}</p>}
              </div>
              {canReport && reportForm.reporting && (
                <ViewerReportForm
                  user={user}
                  busy={busy}
                  submittingReport={reportForm.submitting}
                  reportReasons={reportReasons}
                  reportReason={reportForm.reason}
                  reportNote={reportForm.note}
                  reporterEmail={reportForm.reporterEmail}
                  reportMessage={reportForm.message}
                  onReportReasonChange={reportForm.setReason}
                  onReportNoteChange={reportForm.setNote}
                  onReporterEmailChange={reportForm.setReporterEmail}
                  onCancel={reportForm.cancel}
                  onSubmit={reportForm.submit}
                />
              )}
              {canManage && !confirming && (
                <button className="danger-button" type="button" onClick={() => setConfirming(true)}>
                  删除这张图片
                </button>
              )}
              {canManage && confirming && (
                <form className="delete-form" onSubmit={deleteCurrentMemory}>
                  <p>
                    删除会同时移除图片文件与记忆记录，此操作不可撤销。
                    {(hasNext || hasPrevious) ? ' 删除后会自动切换到当前整理序列里的相邻图片。' : ''}
                  </p>
                  {message && <p className="form-error">{message}</p>}
                  <div className="delete-actions">
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => {
                        setConfirming(false);
                        setMessage('');
                      }}
                      disabled={deleting}
                    >
                      取消
                    </button>
                    <button className="danger-button confirmed" type="submit" disabled={deleting}>
                      {deleting ? '删除中...' : '确认删除'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
          </div>
        </aside>
      </section>
    </div>
  );
}
