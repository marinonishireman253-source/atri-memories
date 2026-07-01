import { useEffect, useState } from 'react';
import { normalizeTags, tagsToText } from '../../lib/tags.js';

export function useViewerEditForm({ memory, hasNext, onNext, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(memory.title);
  const [caption, setCaption] = useState(memory.caption ?? '');
  const [tagText, setTagText] = useState(tagsToText(memory.tags ?? []));
  const [featured, setFeatured] = useState(Boolean(memory.is_featured));
  const [visibilityStatus, setVisibilityStatus] = useState(memory.visibility_status ?? 'public');
  const [message, setMessage] = useState('');
  const [continueDirection, setContinueDirection] = useState(null);

  useEffect(() => {
    const shouldContinueEditing = continueDirection === 'next';
    setTitle(memory.title);
    setCaption(memory.caption ?? '');
    setTagText(tagsToText(memory.tags ?? []));
    setFeatured(Boolean(memory.is_featured));
    setVisibilityStatus(memory.visibility_status ?? 'public');
    setMessage('');
    setEditing(shouldContinueEditing);
    setContinueDirection(null);
  }, [
    continueDirection,
    memory.caption,
    memory.id,
    memory.is_featured,
    memory.tags,
    memory.title,
    memory.visibility_status,
  ]);

  const cancel = () => {
    setEditing(false);
    setMessage('');
    setTitle(memory.title);
    setCaption(memory.caption ?? '');
    setTagText(tagsToText(memory.tags ?? []));
    setFeatured(Boolean(memory.is_featured));
    setVisibilityStatus(memory.visibility_status ?? 'public');
  };

  const submit = async (event, { continueDirection: requestedDirection = null } = {}) => {
    event?.preventDefault?.();
    setMessage('');

    try {
      await onUpdate({
        memory,
        title,
        caption,
        tags: normalizeTags(tagText),
        isFeatured: featured,
        visibilityStatus,
      });
      if (requestedDirection === 'next' && hasNext) {
        setContinueDirection('next');
        onNext();
        return;
      }
      setEditing(false);
    } catch (error) {
      setMessage(error.message);
    }
  };

  return {
    editing,
    setEditing,
    title,
    setTitle,
    caption,
    setCaption,
    tagText,
    setTagText,
    featured,
    setFeatured,
    visibilityStatus,
    setVisibilityStatus,
    message,
    setMessage,
    cancel,
    submit,
  };
}
