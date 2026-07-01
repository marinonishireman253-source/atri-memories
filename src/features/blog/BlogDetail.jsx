import { useMemo, useState } from 'react';

// Block-based safe Markdown-to-React compiler
function parseMarkdownToReact(text) {
  if (!text) return null;

  const blocks = text.split(/\n\n+/);

  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    // Headers
    if (trimmed.startsWith('### ')) {
      return <h3 key={i}>{renderInline(trimmed.slice(4))}</h3>;
    }
    if (trimmed.startsWith('## ')) {
      return <h2 key={i}>{renderInline(trimmed.slice(3))}</h2>;
    }
    if (trimmed.startsWith('# ')) {
      return <h2 key={i}>{renderInline(trimmed.slice(2))}</h2>; // Map h1/h2 to h2 for layout consistency
    }

    // Blockquotes
    if (trimmed.startsWith('> ') || trimmed.startsWith('&gt; ')) {
      const content = trimmed.replace(/^&gt;\s*|^>\s*/, '');
      return <blockquote key={i}>{renderInline(content)}</blockquote>;
    }

    // Bullet Lists
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

    // Ordered Lists
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

    // Default Paragraph
    return <p key={i}>{renderInline(trimmed)}</p>;
  });
}

// Inline parser for bold, italic, and code
function renderInline(text) {
  if (!text) return '';

  // Split on bold (**text**), italic (*text*), and inline code (`code`)
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

export function BlogDetail({ post, onBack, isAdmin, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Format date to YYYY/MM/DD
  const formattedDate = useMemo(() => {
    if (!post?.created_at) return '';
    try {
      const d = new Date(post.created_at);
      if (isNaN(d.getTime())) return '';
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      return `${y}/${m}/${date}`;
    } catch {
      return '';
    }
  }, [post?.created_at]);

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete();
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      // Auto reset after 3 seconds
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  if (!post) return null;

  return (
    <article className="blog-detail-view">
      {/* Back to list button */}
      <button className="blog-back-btn" onClick={onBack}>
        ⬅️ 返回日记列表
      </button>

      {/* Notebook Ruled Paper Page */}
      <div className="blog-detail-paper">
        {/* Decorative spiral rings for notebook look */}
        <div className="notebook-wire-rings">
          <div className="ring-item" />
          <div className="ring-item" />
          <div className="ring-item" />
          <div className="ring-item" />
          <div className="ring-item" />
          <div className="ring-item" />
          <div className="ring-item" />
          <div className="ring-item" />
        </div>

        {/* Post header metadata */}
        <div className="blog-detail-header">
          <div className="blog-detail-meta">
            <span>📅 {formattedDate}</span>
            {post.mood && <span>🏷️ 心情: {post.mood}</span>}
            {post.tags && post.tags.map((tag) => (
              <span key={tag} className="tag-chip static" style={{ boxShadow: '1px 1px 0px var(--ink)', padding: '2px 8px' }}>
                #{tag}
              </span>
            ))}
          </div>
          <h1 className="blog-detail-title">{post.title}</h1>
        </div>

        {/* Ruled notebook line styling for markdown content */}
        <div className="blog-detail-body">
          {parseMarkdownToReact(post.content)}
        </div>

        {/* Footer stamp decoration */}
        <div className="blog-detail-footer">
          {/* approved circular stamp */}
          <div className="ink-stamp stamp-approved" style={{ bottom: '-10px', right: '-10px' }} aria-hidden="true">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#ff4d6d" strokeWidth="4" strokeDasharray="4 2" />
              <circle cx="50" cy="50" r="35" fill="none" stroke="#ff4d6d" strokeWidth="1.5" />
              <text x="50" y="46" textAnchor="middle" fill="#ff4d6d" fontSize="9" fontFamily="var(--font-mono)" fontWeight="900">ATRI</text>
              <text x="50" y="62" textAnchor="middle" fill="#ff4d6d" fontSize="9" fontFamily="var(--font-mono)" fontWeight="900">DIARY</text>
            </svg>
          </div>
        </div>
      </div>

      {/* Admin Operations Bar */}
      {isAdmin && (
        <div className="blog-admin-actions">
          <button className="primary-button compact" onClick={onEdit}>
            ✏️ 编辑这篇日记
          </button>
          <button
            className={`danger-button compact ${confirmDelete ? 'confirmed' : ''}`}
            onClick={handleDelete}
            style={{ margin: 0 }}
          >
            {confirmDelete ? '⚠️ 确认删除？(点击完成)' : '🗑️ 删除这篇日记'}
          </button>
        </div>
      )}
    </article>
  );
}
