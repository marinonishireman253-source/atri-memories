import { adminChromeSummaryItems } from '../../lib/adminOverview.js';

const adminTabs = [
  { id: 'overview', label: '运维概览' },
  { id: 'images', label: '图片管理' },
  { id: 'users', label: '用户管理' },
  { id: 'reports', label: '举报处理' },
  { id: 'logs', label: '操作日志' },
  { id: 'settings', label: '站点设置' },
];

export function AdminChrome({
  activeTab,
  onTabChange,
  adminMemories,
  adminTotalCount,
  adminStats,
  selectedMemories,
}) {
  const summaryItems = adminChromeSummaryItems({
    loadedCount: adminMemories.length,
    totalCount: adminTotalCount,
    selectedCount: selectedMemories.length,
    stats: adminStats,
  });

  return (
    <>
      <div className="admin-console-hero">
        <div>
          <p className="eyebrow">MEMORY CONTROL ROOM</p>
          <h2 id="admin-title">ATRI 管理室</h2>
          <p>把图片、账号、举报和站点设置收进同一个整理台，先处理日常内容，再展开高级运维。</p>
        </div>
        <span aria-hidden="true">ATRI</span>
      </div>
      <div className="admin-title-row">
        <div>
          <h3>今日管理焦点</h3>
          <p>优先检查公开内容、用户入口和待处理事项。</p>
        </div>
        <div className="admin-stats" aria-label="相册统计">
          {summaryItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>

      <div className="admin-tabs" role="tablist" aria-label="管理后台页签">
        {adminTabs.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            type="button"
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </>
  );
}
