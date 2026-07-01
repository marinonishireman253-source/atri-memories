import { useEffect, useState } from 'react';
import {
  memoryGalleryImageSizes,
  memoryGalleryImageSrcSet,
  memoryGalleryImageUrl,
} from '../../lib/memoryMedia.js';
import { memoryPresentationModel } from '../../lib/memoryPresentation.js';

export function FeaturedMemoryCard({ memory, onOpenMemory, priority = false }) {
  const presentation = memoryPresentationModel(memory, { dateVariant: 'month-day' });
  const imageSrc = memoryGalleryImageUrl(memory, 480);
  const fallbackImageSrc = memory.fallback_display_url || '';
  const [resolvedImageSrc, setResolvedImageSrc] = useState(imageSrc);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setResolvedImageSrc(imageSrc);
    setImageError(false);
  }, [imageSrc, memory.id]);

  return (
    <button
      className="featured-card"
      type="button"
      onClick={() => onOpenMemory(memory)}
    >
      <div className="featured-card-frame">
        <div className="holographic-shine" />
        {imageError ? (
          <div className="memory-offline-placeholder" aria-label="记忆连接失败">
            <span className="offline-icon" aria-hidden="true">⚠</span>
            <span className="offline-label-en">Sync Offline</span>
            <span className="offline-label-zh">数据加载失败</span>
          </div>
        ) : (
          <img
            src={resolvedImageSrc}
            srcSet={resolvedImageSrc === imageSrc ? memoryGalleryImageSrcSet(memory, [160, 240, 320, 480]) : ''}
            sizes={memoryGalleryImageSizes()}
            alt={presentation.alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : 'low'}
            onError={() => {
              if (fallbackImageSrc && resolvedImageSrc !== fallbackImageSrc) {
                setResolvedImageSrc(fallbackImageSrc);
                return;
              }
              setImageError(true);
            }}
          />
        )}
      </div>
      <div className="featured-card-content">
        <small>{presentation.dateLabel}</small>
        <strong>{presentation.title}</strong>
      </div>
    </button>
  );
}
