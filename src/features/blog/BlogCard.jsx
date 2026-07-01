import { useMemo } from 'react';

export function BlogCard({ post, index, onClick }) {
  const { title, excerpt, tags, mood, created_at } = post;

  // Format date to YYYY/MM/DD
  const formattedDate = useMemo(() => {
    if (!created_at) return '';
    try {
      const d = new Date(created_at);
      if (isNaN(d.getTime())) return '';
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      return `${y}/${m}/${date}`;
    } catch {
      return '';
    }
  }, [created_at]);

  // Alternate tape colors and styles based on card index
  const tapeClass = useMemo(() => {
    const colors = ['cyan', 'pink', 'yellow'];
    const color = colors[index % colors.length];
    // If pink, we rotate it differently (defined in blog.css as class pink)
    return color === 'pink' ? 'washi-tape pink' : `washi-tape ${color}`;
  }, [index]);

  return (
    <div className="blog-card" onClick={onClick}>
      {/* Decorative washi tape */}
      <div className={tapeClass} />

      {/* Hand-torn paper bottom edge shadow effect */}
      <div className="blog-card-torn-edge" />

      <div className="blog-card-meta">
        <span className="blog-card-date">{formattedDate}</span>
        {mood && <span className="blog-card-mood" title={`心情: ${mood}`}>{mood}</span>}
      </div>

      <h3 className="blog-card-title">{title}</h3>
      <p className="blog-card-excerpt">{excerpt}</p>

      {tags && tags.length > 0 && (
        <div className="blog-card-tags">
          {tags.map((tag) => (
            <span key={tag} className="tag-chip static">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
