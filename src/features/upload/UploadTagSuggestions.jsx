import { normalizeTags } from '../../lib/tags.js';

export function UploadTagSuggestions({ tagPresets, tagText, uploading, onChange }) {
  return (
    <div className="tag-suggestions" aria-label="推荐标签">
      {tagPresets.map((tag) => (
        <button
          type="button"
          className="tag-chip"
          key={tag}
          disabled={uploading}
          onClick={() => {
            const nextTags = normalizeTags([...normalizeTags(tagText), tag]);
            onChange(nextTags.join('，'));
          }}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
