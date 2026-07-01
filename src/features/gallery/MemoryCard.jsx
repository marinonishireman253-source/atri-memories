import { memo, useEffect, useRef, useState, useMemo } from 'react';
import {
  memoryGalleryImageSizes,
  memoryGalleryImageSrcSet,
  memoryGalleryImageUrl,
} from '../../lib/memoryMedia.js';
import { memoryPresentationModel } from '../../lib/memoryPresentation.js';

const memoryAspectCache = new Map();
const memoryAspectStorageKey = 'atri-memory-image-aspects';
const defaultMemoryAspect = 9 / 16;

function readStoredMemoryAspects() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(memoryAspectStorageKey) ?? '{}');
  } catch {
    return {};
  }
}

function readMemoryAspect(memoryId) {
  if (memoryAspectCache.has(memoryId)) return memoryAspectCache.get(memoryId);
  const storedAspect = Number(readStoredMemoryAspects()[memoryId]);
  if (Number.isFinite(storedAspect) && storedAspect > 0) {
    memoryAspectCache.set(memoryId, storedAspect);
    return storedAspect;
  }
  return defaultMemoryAspect;
}

function writeMemoryAspect(memoryId, aspect) {
  memoryAspectCache.set(memoryId, aspect);
  if (typeof window === 'undefined') return;
  const storedAspects = readStoredMemoryAspects();
  window.localStorage.setItem(memoryAspectStorageKey, JSON.stringify({
    ...storedAspects,
    [memoryId]: Number(aspect.toFixed(4)),
  }));
}

export const MemoryCard = memo(function MemoryCard({
  memory,
  onOpenMemory,
  priority = false,
  selectable = false,
  selected = false,
  favorited = false,
  activityState = null,
  onToggleSelected,
}) {
  const presentation = useMemo(() => memoryPresentationModel(memory), [memory]);
  const isFeatured = useMemo(
    () => presentation.statusBadges.some((b) => b.key === 'featured'),
    [presentation.statusBadges]
  );
  const imageSrc = memoryGalleryImageUrl(memory);
  const fallbackImageSrc = memory.fallback_display_url || '';
  const [resolvedImageSrc, setResolvedImageSrc] = useState(imageSrc);
  const imageSrcSet = memoryGalleryImageSrcSet(memory);
  const imageSizes = memoryGalleryImageSizes();
  const imageRef = useRef(null);
  const cardRef = useRef(null);
  const [imageReady, setImageReady] = useState(false);
  const [imageAspect, setImageAspect] = useState(() => readMemoryAspect(memory.id));
  const [imageError, setImageError] = useState(false);
  const [isInViewport, setIsInViewport] = useState(priority);

  useEffect(() => {
    setImageReady(false);
    setImageError(false);
    setResolvedImageSrc(imageSrc);
    setImageAspect(readMemoryAspect(memory.id));
    setIsInViewport(priority);
  }, [imageSrc, memory.id, priority]);

  useEffect(() => {
    if (priority || isInViewport) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInViewport(true);
        }
      },
      { rootMargin: '200px 0px' }
    );

    const element = cardRef.current;
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [priority, isInViewport]);

  const rememberImageAspect = (image) => {
    const { naturalWidth, naturalHeight } = image;
    if (naturalWidth > 0 && naturalHeight > 0) {
      const nextAspect = naturalWidth / naturalHeight;
      writeMemoryAspect(memory.id, nextAspect);
      setImageAspect(nextAspect);
    }
  };

  useEffect(() => {
    if (!isInViewport) return;
    const image = imageRef.current;
    if (image?.complete) {
      rememberImageAspect(image);
      setImageReady(true);
    }
  }, [imageSrc, memory.id, isInViewport]);

  const handleImageLoaded = (event) => {
    if (!isInViewport) return;
    rememberImageAspect(event.currentTarget);
    setImageReady(true);
  };

  return (
    <article
      ref={cardRef}
      className={`memory-card screentone-shadow ${selected ? 'selected' : ''} ${imageReady ? 'image-ready' : ''}`}
      style={{ '--memory-image-aspect': imageAspect }}
    >
      {favorited && (
        <div className="ink-stamp stamp-favorite" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--cyber-pink)" strokeWidth="4.5" strokeDasharray="5 2" />
            <circle cx="50" cy="50" r="35" fill="none" stroke="var(--cyber-pink)" strokeWidth="1.5" />
            <path d="M50,25 L58,42 L76,42 L62,53 L67,71 L50,60 L33,71 L38,53 L24,42 L42,42 Z" fill="none" stroke="var(--cyber-pink)" strokeWidth="3.5" strokeLinejoin="round" />
            <text x="50" y="86" textAnchor="middle" fill="var(--cyber-pink)" fontSize="10.5" fontFamily="var(--font-mono)" fontWeight="bold">FAVORITE</text>
          </svg>
        </div>
      )}
      {!favorited && isFeatured && (
        <div className="ink-stamp stamp-approved" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <rect x="15" y="15" width="70" height="70" rx="6" fill="none" stroke="var(--cyber-cyan)" strokeWidth="4.5" strokeDasharray="6 3" />
            <rect x="20" y="20" width="60" height="60" rx="4" fill="none" stroke="var(--cyber-cyan)" strokeWidth="1.5" />
            <path d="M35,50 L45,60 L65,40" fill="none" stroke="var(--cyber-cyan)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <text x="50" y="30" textAnchor="middle" fill="var(--cyber-cyan)" fontSize="9.5" fontFamily="var(--font-mono)" fontWeight="bold">ATRI</text>
            <text x="50" y="80" textAnchor="middle" fill="var(--cyber-cyan)" fontSize="9.5" fontFamily="var(--font-mono)" fontWeight="bold">APPROVED</text>
          </svg>
        </div>
      )}
      {selectable && (
        <label className="memory-select">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelected?.(memory.id)}
            aria-label={`选择 ${presentation.title}`}
          />
          <span>{selected ? '已选中' : '选择'}</span>
        </label>
      )}
      {activityState && (
        <span className={`memory-activity ${activityState.tone}`}>
          {activityState.label}
        </span>
      )}
      {!activityState && favorited && (
        <span className="memory-activity favorite">已收藏</span>
      )}
      <button
        className="memory-open"
        type="button"
        onClick={() => onOpenMemory(memory)}
        disabled={!imageReady}
        aria-label={`放大查看 ${presentation.title}`}
      >
        <div className="memory-image-frame">
          <div className="holographic-shine" />
          {imageError ? (
            <div className="memory-offline-placeholder" aria-label="记忆连接失败">
              <span className="offline-icon" aria-hidden="true">⚠</span>
              <span className="offline-label-en">Sync Offline</span>
              <span className="offline-label-zh">记忆碎片离线</span>
            </div>
          ) : (
            <img
              ref={imageRef}
              src={isInViewport ? resolvedImageSrc : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'}
              srcSet={isInViewport && resolvedImageSrc === imageSrc ? imageSrcSet : ''}
              sizes={imageSizes}
              alt={presentation.alt}
              className="polaroid-reveal"
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={priority ? 'high' : 'low'}
              onLoad={handleImageLoaded}
              onError={() => {
                if (fallbackImageSrc && resolvedImageSrc !== fallbackImageSrc) {
                  setResolvedImageSrc(fallbackImageSrc);
                  return;
                }
                setImageError(true);
                setImageReady(true);
              }}
            />
          )}
        </div>
        <div className="memory-card-caption">
          <strong className="card-title-text card-title-badge">{presentation.title}</strong>
          <span className="card-date-text card-date-badge">{presentation.dateLabel}</span>
        </div>
      </button>
    </article>
  );
});
