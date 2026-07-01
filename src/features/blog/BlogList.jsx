import { BlogCard } from './BlogCard.jsx';
import { StatusNotice } from '../../components/StatusNotice.jsx';

export function BlogList({
  posts,
  loading,
  error,
  searchQuery,
  onSearchChange,
  activeTag,
  onTagChange,
  allTags = [],
  onSelectPost,
  isAdmin,
  onWriteNewPost,
}) {
  return (
    <div className="blog-list-view">
      {/* List Header with search bar and Admin writing action */}
      <div className="blog-list-header">
        <div className="blog-search-box">
          <span style={{ marginRight: '8px', opacity: 0.7 }}>🔍</span>
          <input
            type="text"
            placeholder="搜索日记标题、摘要或内容..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {isAdmin && (
          <button className="primary-button compact" onClick={onWriteNewPost}>
            ✍️ 撰写新日记
          </button>
        )}
      </div>

      {/* Category Selection Bar */}
      <div className="blog-category-bar">
        <button
          className={`blog-category-tab ${activeTag === 'all' ? 'active' : ''}`}
          onClick={() => onTagChange('all')}
        >
          全部日记
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            className={`blog-category-tab ${activeTag === tag ? 'active' : ''}`}
            onClick={() => onTagChange(tag)}
          >
            #{tag}
          </button>
        ))}
      </div>

      {/* States (Loading, Error, Empty, List Grid) */}
      {loading ? (
        <StatusNotice
          notice={{
            tone: 'info',
            icon: 'i',
            title: '正在调取打捞日志',
            body: '萝卜子正在全速检索数据库中的博客日记条目...',
          }}
        />
      ) : error ? (
        <StatusNotice
          notice={{
            tone: 'error',
            icon: '!',
            title: '数据调取失败',
            body: error,
          }}
        />
      ) : posts.length === 0 ? (
        <StatusNotice
          notice={{
            tone: 'info',
            icon: 'i',
            title: '没有找到相关的日志',
            body: searchQuery.trim()
              ? '换个关键词或者选择其他分类标签试试看吧~'
              : '这里目前空空如也，还没有发布过博客日记。',
          }}
        />
      ) : (
        <div className="blog-grid">
          {posts.map((post, index) => (
            <BlogCard
              key={post.id}
              post={post}
              index={index}
              onClick={() => onSelectPost(post.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
