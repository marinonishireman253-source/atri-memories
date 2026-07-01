import { dateSlug, safeMemoryFilename } from './downloads.js';
import { memoryOriginalUrl } from './memoryMedia.js';

function uniqueFilename(filename, usedNames) {
  if (!usedNames.has(filename)) {
    usedNames.add(filename);
    return filename;
  }

  const dotIndex = filename.lastIndexOf('.');
  const stem = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
  const extension = dotIndex > 0 ? filename.slice(dotIndex) : '';
  let counter = 2;
  let nextName = `${stem}-${counter}${extension}`;

  while (usedNames.has(nextName)) {
    counter += 1;
    nextName = `${stem}-${counter}${extension}`;
  }

  usedNames.add(nextName);
  return nextName;
}

export async function downloadMemoriesZip(memories, { onProgress } = {}) {
  if (!memories.length) {
    throw new Error('请选择需要下载的图片。');
  }

  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const usedNames = new Set();
  const failed = [];

  for (const [index, memory] of memories.entries()) {
    onProgress?.({
      phase: 'fetching',
      current: index + 1,
      total: memories.length,
      title: memory.title,
    });

    try {
      const response = await fetch(memoryOriginalUrl(memory));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      zip.file(uniqueFilename(safeMemoryFilename(memory), usedNames), blob);
    } catch (error) {
      failed.push({ memory, error });
    }
  }

  if (failed.length === memories.length) {
    throw new Error('所选图片均下载失败，无法生成 ZIP。');
  }

  onProgress?.({
    phase: 'zipping',
    current: memories.length - failed.length,
    total: memories.length,
    title: '',
  });

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const objectUrl = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `${dateSlug(new Date())}-ATRI-memories-${memories.length - failed.length}.zip`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);

  return {
    succeeded: memories.length - failed.length,
    failed: failed.length,
  };
}
