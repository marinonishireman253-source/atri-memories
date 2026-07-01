import { useState, useMemo } from 'react';

function formatCommentDate(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${date} ${h}:${min}`;
  } catch {
    return '';
  }
}

export function BlogComments({ comments = [], loading, error, onAddComment }) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [validationError, setValidationError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setValidationError('留言内容不能为空哦~');
      return;
    }

    setSubmitting(true);
    try {
      await onAddComment({
        authorName: name,
        content: trimmedContent,
      });
      setContent(''); // Clear content but keep name for subsequent comments
    } catch (err) {
      setValidationError(err.message || '发表评论失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="blog-comments-section" style={{ marginTop: '32px' }}>
      <h3>💬 便签留言板 ({comments.length})</h3>

      {/* Loading state for comments list */}
      {loading && comments.length === 0 ? (
        <p style={{ opacity: 0.6, fontSize: '0.88rem' }}>正在调取留言便签...</p>
      ) : comments.length === 0 ? (
        <p style={{ opacity: 0.6, fontSize: '0.88rem', marginBottom: '24px' }}>
          这里还没有留言，快来贴上第一张便签吧！
        </p>
      ) : (
        /* Grid of sticky note comments */
        <div className="blog-comments-grid">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`comment-sticky ${comment.color || 'yellow'}`}
            >
              {/* Paper sticky tape decoration */}
              <div className="comment-sticky-washi" />

              <div className="comment-author">
                📌 {comment.author_name || '匿名的打捞员'}
              </div>
              <div className="comment-text">
                {comment.content}
              </div>
              <div className="comment-date">
                {formatCommentDate(comment.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add comment form (Letter Pad Look) */}
      <div className="comment-form-box">
        <h4>✏️ 留下你的足迹</h4>

        <form onSubmit={handleSubmit} className="comment-form">
          <input
            type="text"
            placeholder="打捞员大名（可选，默认：匿名的打捞员）"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            maxLength={20}
          />

          <textarea
            placeholder="写下你的留言便签内容..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={submitting}
            maxLength={500}
            required
          />

          {validationError && (
            <p className="form-error" style={{ fontSize: '0.82rem', color: '#ff5e7e' }}>
              {validationError}
            </p>
          )}
          {error && (
            <p className="form-error" style={{ fontSize: '0.82rem', color: '#ff5e7e' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="primary-button compact"
            disabled={submitting}
          >
            {submitting ? '📌 正在贴上...' : '📌 贴上留言便签'}
          </button>
        </form>
      </div>
    </section>
  );
}
