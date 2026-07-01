import { StatusNotice } from '../../components/StatusNotice.jsx';
import { userTagStatsEmptyNotice } from '../../lib/userFeedback.js';

export function UserTagStatsCard({
  tagStats,
  loadingSummary,
  onRefresh,
  onSelectTag,
}) {
  return (
    <div className="user-tags-card">
      <div className="user-card-title">
        <h3>常用标签</h3>
        <button className="text-button inline" type="button" onClick={onRefresh} disabled={loadingSummary}>
          {loadingSummary ? '刷新中' : '刷新'}
        </button>
      </div>
      {tagStats.length > 0 ? (
        <div className="tag-row user-tag-actions" aria-label="常用标签快捷筛选">
          {tagStats.map((tag) => (
            <button className="tag-chip" type="button" key={tag.name} onClick={() => onSelectTag(tag.name)}>
              {tag.name} × {tag.count}
            </button>
          ))}
        </div>
      ) : (
        <StatusNotice notice={userTagStatsEmptyNotice()} />
      )}
    </div>
  );
}
