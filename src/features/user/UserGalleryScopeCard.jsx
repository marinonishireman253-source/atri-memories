export function UserGalleryScopeCard({
  galleryScope,
  onShowMyImages,
  onShowFavorites,
  onShowAllImages,
}) {
  return (
    <div className="user-tags-card user-scope-card">
      <div className="user-card-title">
        <h3>当前画廊范围</h3>
        <span className={`scope-pill ${galleryScope.isCurrentUserScope || galleryScope.isFavoritesScope ? 'active' : ''}`}>
          {galleryScope.rangeLabel}
        </span>
      </div>
      <p className="user-scope-description">{galleryScope.description}</p>
      <div className="scope-stats">
        <span>当前命中</span>
        <strong>{galleryScope.matchedCountLabel}</strong>
      </div>
      <div className="scope-actions">
        {!galleryScope.isCurrentUserScope && (
          <button className="ghost-button compact" type="button" onClick={onShowMyImages}>
            切到我的图片
          </button>
        )}
        {!galleryScope.isFavoritesScope && onShowFavorites && (
          <button className="ghost-button compact" type="button" onClick={onShowFavorites}>
            查看我的收藏
          </button>
        )}
        {(galleryScope.isCurrentUserScope || galleryScope.isFavoritesScope) && (
          <button className="ghost-button compact" type="button" onClick={onShowAllImages}>
            返回全部公开
          </button>
        )}
      </div>
    </div>
  );
}
