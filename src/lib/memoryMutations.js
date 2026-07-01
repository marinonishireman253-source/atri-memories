import { normalizeMemories } from './memoryContent.js';
import { hydrateMemoryMediaUrl } from './memoryMedia.js';
import { attachAdminReportSummary } from './memoryQueries.js';
import { supabase } from './supabaseClient.js';
import { normalizeTags } from './tags.js';

export async function deleteRemoteMemory(id) {
  const { error } = await supabase.functions.invoke('delete-memory', {
    body: { id },
  });

  if (error) {
    throw new Error('删除失败，请确认你有权限或稍后重试。');
  }
}

export async function deleteRemoteMemories(memories, { canManageMemory }) {
  const results = [];

  for (const memory of memories) {
    if (!canManageMemory(memory)) {
      results.push({ id: memory.id, success: false, error: '没有权限' });
      continue;
    }

    try {
      await deleteRemoteMemory(memory.id);
      results.push({ id: memory.id, success: true });
    } catch (error) {
      results.push({ id: memory.id, success: false, error: error.message });
    }
  }

  return results;
}

export async function updateRemoteMemory({
  memory,
  title,
  caption,
  tags,
  isFeatured,
  visibilityStatus,
  isAdmin,
}) {
  const { data, error } = await supabase.functions.invoke('update-memory', {
    body: {
      id: memory.id,
      title: title.trim(),
      caption: caption.trim() || null,
      tags: normalizeTags(tags),
      is_featured: isFeatured,
      visibility_status: visibilityStatus,
    },
  });

  if (error) {
    throw new Error('保存失败，请确认你有权限或检查标题长度。');
  }

  const updatedMemory = await hydrateMemoryMediaUrl(
    normalizeMemories([{
      ...data.memory,
      tags: normalizeTags(data.memory?.tags ?? []),
      report_summary: memory.report_summary,
    }])[0],
  );

  return attachAdminReportSummary(updatedMemory, { isAdmin });
}
