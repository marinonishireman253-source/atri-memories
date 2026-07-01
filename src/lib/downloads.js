import { memoryOriginalUrl } from './memoryMedia.js';
import { memoryTitle } from './memoryContent.js';

const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|]+/g;

export function dateSlug(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function extensionFromMemory(memory) {
  const fromPath = memory.storage_path?.match(/\.([a-z0-9]+)$/i)?.[1];
  if (fromPath) return fromPath.toLowerCase();

  const fromUrl = memoryOriginalUrl(memory)?.split('?')[0].match(/\.([a-z0-9]+)$/i)?.[1];
  return fromUrl ? fromUrl.toLowerCase() : 'jpg';
}

export function safeMemoryFilename(memory) {
  const title = memoryTitle(memory)
    .replace(ILLEGAL_FILENAME_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);

  return `${dateSlug(memory.created_at)}-${title || 'ATRI-memory'}.${extensionFromMemory(memory)}`;
}

export async function downloadMemoryImage(memory) {
  const response = await fetch(memoryOriginalUrl(memory));
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = safeMemoryFilename(memory);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
