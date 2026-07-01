export const defaultTagPresets = ['ATRI', '背景', '立绘', '截图', '生成图', '收藏'];

export function normalizeTags(tags) {
  const source = Array.isArray(tags) ? tags : String(tags ?? '').split(/[,，、\s]+/);
  const seen = new Set();

  return source
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .map((tag) => tag.slice(0, 24))
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

export function tagsToText(tags) {
  return normalizeTags(tags).join('，');
}
