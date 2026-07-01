import { useState, useEffect } from 'react';

// Block-based safe Markdown-to-React compiler for preview
function parseMarkdownToReact(text) {
  if (!text) return <p style={{ opacity: 0.5 }}>（正文内容为空，写点什么吧...）</p>;

  const blocks = text.split(/\n\n+/);

  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('### ')) {
      return <h3 key={i}>{renderInline(trimmed.slice(4))}</h3>;
    }
    if (trimmed.startsWith('## ')) {
      return <h2 key={i}>{renderInline(trimmed.slice(3))}</h2>;
    }
    if (trimmed.startsWith('# ')) {
      return <h2 key={i}>{renderInline(trimmed.slice(2))}</h2>;
    }

    if (trimmed.startsWith('> ') || trimmed.startsWith('&gt; ')) {
      const content = trimmed.replace(/^&gt;\s*|^>\s*/, '');
      return <blockquote key={i}>{renderInline(content)}</blockquote>;
    }

    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      const lines = trimmed.split('\n')
        .map(l => l.replace(/^[\*\-]\s+/, ''))
        .filter(Boolean);
      return (
        <ul key={i}>
          {lines.map((line, j) => (
            <li key={j}>{renderInline(line)}</li>
          ))}
        </ul>
      );
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const lines = trimmed.split('\n')
        .map(l => l.replace(/^\d+\.\s+/, ''))
        .filter(Boolean);
      return (
        <ol key={i}>
          {lines.map((line, j) => (
            <li key={j}>{renderInline(line)}</li>
          ))}
        </ol>
      );
    }

    return <p key={i}>{renderInline(trimmed)}</p>;
  });
}

function renderInline(text) {
  if (!text) return '';
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} className="inline-code" style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(16,30,44,0.1)' }}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

const MOOD_OPTIONS = ['☀️', '☁️', '🌧️', '⚡', '🌊', '🌸', '🍁', '❄️', '⭐', '🎈'];

export function BlogEditorModal({ open, post, saving, error, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' | 'preview'
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [mood, setMood] = useState('☀️');
  const [isPublished, setIsPublished] = useState(true);

  // Sync state with incoming post data on open or post change
  useEffect(() => {
    if (open) {
      setActiveTab('edit');
      if (post) {
        setTitle(post.title || '');
        setExcerpt(post.excerpt || '');
        setContent(post.content || '');
        setTagsInput(post.tags ? post.tags.join(', ') : '');
        setMood(post.mood || '☀️');
        setIsPublished(post.is_published !== false);
      } else {
        setTitle('');
        setExcerpt('');
        setContent('');
        setTagsInput('');
        setMood('☀️');
        setIsPublished(true);
      }
    }
  }, [post, open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onSave({
      title: title.trim(),
      excerpt: excerpt.trim() || title.trim().slice(0, 100),
      content: content.trim(),
      tags,
      mood,
      is_published: isPublished,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal blog-editor-modal" onClick={(e) => e.stopPropagation()}>
        {/* Spiral wire rings decoration at top */}
        <div className="notebook-wire-rings" style={{ left: '28px', right: '28px' }}>
          <div className="ring-item" />
          <div className="ring-item" />
          <div className="ring-item" />
          <div className="ring-item" />
          <div className="ring-item" />
          <div className="ring-item" />
          <div className="ring-item" />
          <div className="ring-item" />
        </div>

        <button className="modal-close" onClick={onClose} aria-label="关闭窗口" disabled={saving}>
          ×
        </button>

        <h2 style={{ marginTop: '8px' }}>{post ? '✏️ 编辑博客日志' : '✍️ 新建博客日志'}</h2>

        <div className="blog-editor-container">
          {/* Navigation Tabs */}
          <div className="blog-editor-tabs-nav">
            <button
              className={`blog-editor-tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
              onClick={() => setActiveTab('edit')}
              type="button"
            >
              ✍️ 编辑内容
            </button>
            <button
              className={`blog-editor-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
              type="button"
            >
              👁️ 实时预览
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {activeTab === 'edit' ? (
              /* Writing Workspace */
              <div className="blog-editor-fields">
                <div className="blog-field-group">
                  <label htmlFor="blog-title">日记标题 *</label>
                  <input
                    id="blog-title"
                    type="text"
                    placeholder="给今天的日志起个治愈系的标题吧..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>

                <div className="blog-field-group">
                  <label htmlFor="blog-excerpt">内容摘要</label>
                  <input
                    id="blog-excerpt"
                    type="text"
                    placeholder="简单介绍一下这篇日记的内容（选填，为空时自动截取正文）"
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div className="blog-field-group">
                  <label htmlFor="blog-tags">分类标签</label>
                  <input
                    id="blog-tags"
                    type="text"
                    placeholder="标签，多个标签用英文逗号分隔（例如: 日常, 治愈, 技术）"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div className="blog-field-group">
                  <label>今天的心情贴纸</label>
                  <div className="mood-selector-grid">
                    {MOOD_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`mood-selector-btn ${mood === opt ? 'active' : ''}`}
                        onClick={() => setMood(opt)}
                        disabled={saving}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="blog-field-group">
                  <label htmlFor="blog-content">正文 Markdown *</label>
                  <textarea
                    id="blog-content"
                    placeholder="用 Markdown 格式写下今天的发生的事情吧... (支持 ## 标题, * 列表, > 引用, **粗体**)"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>

                <label className="editor-checkbox-label">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    disabled={saving}
                  />
                  <span>公开发布（勾选后所有人可见，取消勾选仅保存为草稿）</span>
                </label>
              </div>
            ) : (
              /* Markdown Preview Area */
              <div className="blog-editor-preview">
                <div style={{ marginBottom: '12px' }}>
                  <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem', fontWeight: 800 }}>{title || '暂无标题'}</h3>
                  <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                    心情: {mood} | 标签:{' '}
                    {tagsInput
                      ? tagsInput
                          .split(',')
                          .map((t) => `#${t.trim()}`)
                          .join(' ')
                      : '无'}
                  </div>
                </div>
                <div className="blog-editor-preview-panel blog-detail-body">
                  {parseMarkdownToReact(content)}
                </div>
              </div>
            )}

            {/* Error Displays */}
            {error && (
              <p className="form-error" style={{ marginTop: '12px', color: '#ff5e7e' }}>
                {error}
              </p>
            )}

            {/* Actions Footer */}
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="ghost-button"
                onClick={onClose}
                disabled={saving}
              >
                取消
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={saving || !title.trim() || !content.trim()}
              >
                {saving ? '保存中...' : '保存日志'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
