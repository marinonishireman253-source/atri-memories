import { useEffect, useRef } from 'react';
import { isFeaturedMemory, isHiddenMemory } from '../../lib/memoryContent.js';
import { memoryImageUrl } from '../../lib/memoryMedia.js';
import { memoryPresentationModel } from '../../lib/memoryPresentation.js';
import { hasAnyReports, hasOpenReports, reportSummaryLabel } from '../../lib/reporting.js';

export function AdminImagesTab({
  busy,
  adminFilters,
  onUpdateAdminFilters,
  refreshAdminMemories,
  loadingAdminMemories,
  selectFiltered,
  clearSelection,
  selectedMemories,
  adminMemories,
  tagOptions = [],
  adminStats,
  backfillUnknownSizes,
  backfillingSizes,
  backfillMissingThumbnails,
  backfillingThumbnails,
  downloading,
  downloadSelected,
  confirmingDelete,
  deleteSelected,
  deleting,
  adminHasMore,
  loadMoreAdminMemories,
  loadingMoreAdminMemories,
  toggleMemory,
  selectedIds,
  onOpenMemory,
  clearAdminOwnerFilter,
}) {
  const loadMoreSentinelRef = useRef(null);

  useEffect(() => {
    if (!adminHasMore || loadingAdminMemories || loadingMoreAdminMemories || busy || !loadMoreSentinelRef.current) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMoreAdminMemories?.();
        }
      },
      { rootMargin: '360px 0px' },
    );

    observer.observe(loadMoreSentinelRef.current);
    return () => observer.disconnect();
  }, [adminHasMore, busy, loadingAdminMemories, loadingMoreAdminMemories, loadMoreAdminMemories]);

  return (
    <>
      <div className="admin-toolbar admin-images-toolbar">
        <label className="admin-search">
          搜索
          <input
            type="search"
            value={adminFilters.query}
            onChange={(event) => onUpdateAdminFilters({ query: event.target.value })}
            placeholder="标题、描述、上传者、路径"
            disabled={busy}
          />
        </label>
        <label className="admin-select">
          时间
          <select
            value={adminFilters.dateRange}
            onChange={(event) => onUpdateAdminFilters({ dateRange: event.target.value })}
            disabled={busy}
          >
            <option value="all">全部时间</option>
            <option value="today">今天</option>
            <option value="week">最近 7 天</option>
            <option value="month">最近 30 天</option>
          </select>
        </label>
        <label className="admin-select">
          状态
          <select
            value={adminFilters.visibility}
            onChange={(event) => onUpdateAdminFilters({ visibility: event.target.value })}
            disabled={busy}
          >
            <option value="all">全部状态</option>
            <option value="public">公开</option>
            <option value="hidden">已下架</option>
          </select>
        </label>
        <label className="admin-select">
          标签
          <select
            value={adminFilters.tag}
            onChange={(event) => onUpdateAdminFilters({ tag: event.target.value })}
            disabled={busy}
          >
            <option value="all">全部标签</option>
            {tagOptions.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-select">
          排序
          <select
            value={`${adminFilters.sortBy}:${adminFilters.sortDir}`}
            onChange={(event) => {
              const [sortBy, sortDir] = event.target.value.split(':');
              onUpdateAdminFilters({ sortBy, sortDir });
            }}
            disabled={busy}
          >
            <option value="created_at:desc">最新上传</option>
            <option value="created_at:asc">最早上传</option>
            <option value="title:asc">标题 A-Z</option>
            <option value="title:desc">标题 Z-A</option>
            <option value="owner_email:asc">上传者 A-Z</option>
            <option value="file_size_bytes:desc">文件最大</option>
            <option value="file_size_bytes:asc">文件最小</option>
          </select>
        </label>
        <div className="admin-actions">
          <button className="ghost-button compact" type="button" onClick={refreshAdminMemories} disabled={busy || loadingAdminMemories}>
            {loadingAdminMemories ? '刷新中...' : '刷新'}
          </button>
          <button className="ghost-button compact" type="button" onClick={selectFiltered} disabled={busy || !adminMemories.length}>
            全选当前
          </button>
          <button className="ghost-button compact" type="button" onClick={clearSelection} disabled={busy || !selectedMemories.length}>
            清空
          </button>
          {adminStats.unknown_size_count > 0 && (
            <button className="ghost-button compact" type="button" onClick={backfillUnknownSizes} disabled={busy}>
              {backfillingSizes ? '回填中...' : '回填大小'}
            </button>
          )}
          <button className="ghost-button compact" type="button" onClick={backfillMissingThumbnails} disabled={busy}>
            {backfillingThumbnails ? '生成中...' : '生成缩略图'}
          </button>
          <button className="primary-button compact" type="button" onClick={downloadSelected} disabled={busy || !selectedMemories.length}>
            {downloading ? '生成 ZIP...' : '批量下载 ZIP'}
          </button>
          <button
            className={`danger-button compact ${confirmingDelete ? 'confirmed' : ''}`}
            type="button"
            onClick={deleteSelected}
            disabled={busy || !selectedMemories.length}
          >
            {deleting ? '删除中...' : confirmingDelete ? '确认删除' : '批量删除'}
          </button>
        </div>
      </div>

      <div className="admin-table-wrap">
        {adminFilters.ownerId !== 'all' && (
          <div className="active-filter admin-active-filter">
            <span>正在查看上传者：{adminFilters.ownerLabel || adminFilters.ownerId}</span>
            <button type="button" onClick={clearAdminOwnerFilter}>
              清除
            </button>
          </div>
        )}
        <table className="admin-table">
          <thead>
            <tr>
              <th>选择</th>
              <th>图片</th>
              <th>标题</th>
              <th>状态</th>
              <th>上传者</th>
              <th>大小</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {adminMemories.map((memory) => {
              const presentation = memoryPresentationModel(memory);
              return (
                <tr key={memory.id} className={selectedIds.has(memory.id) ? 'selected' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(memory.id)}
                      onChange={() => toggleMemory(memory.id)}
                      disabled={busy}
                      aria-label={`选择 ${presentation.title}`}
                    />
                  </td>
                  <td>
                    <img className="admin-thumb" src={memoryImageUrl(memory)} alt={presentation.alt} loading="lazy" />
                  </td>
                  <td>
                    <strong title={presentation.title}>{presentation.title}</strong>
                    {presentation.caption && <span title={presentation.caption}>{presentation.caption}</span>}
                    {presentation.tags?.length > 0 && (
                      <div className="tag-row admin-tags">
                        {presentation.tags.map((tag) => (
                          <span className="tag-chip static" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`user-role ${isHiddenMemory(memory) ? 'blocked' : ''}`}>
                      {presentation.visibilityLabel}
                    </span>
                    {isFeaturedMemory(memory) && <span className="user-role admin">精选</span>}
                    {hasOpenReports(memory.report_summary) && (
                      <span className="user-role blocked" title={reportSummaryLabel(memory.report_summary)}>
                        待处理举报
                      </span>
                    )}
                    {!hasOpenReports(memory.report_summary) && hasAnyReports(memory.report_summary) && (
                      <span className="user-role" title={reportSummaryLabel(memory.report_summary)}>
                        有举报记录
                      </span>
                    )}
                  </td>
                  <td>
                    <span title={presentation.ownerLabel}>{presentation.ownerLabel}</span>
                  </td>
                  <td>{memory.file_size_bytes ? presentation.sizeLabel : '未知'}</td>
                  <td>{presentation.dateLabel}</td>
                  <td>
                    <button
                      className="text-button inline"
                      type="button"
                      onClick={() => onOpenMemory(memory, { collection: adminMemories })}
                      disabled={busy}
                    >
                      查看/编辑
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loadingAdminMemories && adminMemories.length === 0 && (
          <div className="empty-state compact">
            <span aria-hidden="true">◇</span>
            <h3>正在读取后台图片</h3>
            <p>图片数量较多时会按服务端分页加载。</p>
          </div>
        )}
        {!loadingAdminMemories && adminMemories.length === 0 && (
          <div className="empty-state compact">
            <span aria-hidden="true">◇</span>
            <h3>没有匹配的图片</h3>
            <p>换个关键词、时间、标签或排序条件再试。</p>
          </div>
        )}
        {adminHasMore && adminMemories.length > 0 && (
          <div className="admin-load-more">
            <span className="load-more-sentinel" ref={loadMoreSentinelRef} aria-hidden="true" />
            <button className="ghost-button" type="button" onClick={loadMoreAdminMemories} disabled={loadingMoreAdminMemories || busy}>
              {loadingMoreAdminMemories ? '加载中...' : '加载更多管理项'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
