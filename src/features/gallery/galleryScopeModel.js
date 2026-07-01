import { buildGalleryFilterChips } from './galleryFilterSummaryModel.js';

export function galleryScopeSummary({ user, galleryScope, filters, totalCount, loading, favoritesAvailable = false }) {
  const chips = buildGalleryFilterChips(filters);
  const hasRefinedFilters = chips.length > 0;
  const isCurrentUserScope = Boolean(galleryScope?.isCurrentUserScope);
  const isFavoritesScope = Boolean(galleryScope?.isFavoritesScope);

  return {
    rangeLabel: galleryScope?.rangeLabel ?? '全部公开',
    description: galleryScope?.description ?? '当前正在浏览公开画廊。',
    resultLabel: loading ? '同步中' : `${totalCount ?? 0} 张`,
    chips,
    hasRefinedFilters,
    isCurrentUserScope,
    isFavoritesScope,
    canShowMyImages: Boolean(user && !isCurrentUserScope),
    canShowFavorites: Boolean(user && favoritesAvailable && !isFavoritesScope),
    canShowPublic: isCurrentUserScope || isFavoritesScope,
    canResetFilters: hasRefinedFilters || isCurrentUserScope || isFavoritesScope,
  };
}
