import { StatusNotice } from '../../components/StatusNotice.jsx';
import { galleryEmptyNotice } from '../../lib/userFeedback.js';

export function GalleryLoadingCards() {
  return (
    <div className="gallery-grid" aria-label="正在读取记忆">
      {[1, 2, 3].map((key) => (
        <div className="gallery-column" key={key}>
          <article className="memory-card loading-card">
            <div className="loading-image" />
          </article>
        </div>
      ))}
    </div>
  );
}

export function GalleryEmptyState({ filtering, favoritesOnly = false }) {
  return (
    <StatusNotice
      notice={galleryEmptyNotice({ filtering, favoritesOnly })}
      className="gallery-empty-state"
    />
  );
}
