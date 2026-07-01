import { MEMORY_VISIBILITY_PUBLIC } from './memoryContent.js';
import { supabase } from './supabaseClient.js';
import { normalizeTags } from './tags.js';

function extensionFor(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : 'jpg';
}

async function createMemoryThumbnail(file) {
  const image = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const maxWidth = 320;
  const maxHeight = 900;
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });

  if (!context) {
    image.close?.();
    throw new Error('无法生成缩略图。');
  }

  context.drawImage(image, 0, 0, width, height);
  image.close?.();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('无法生成缩略图。'));
        }
      },
      'image/webp',
      0.58,
    );
  });
}

export function validateUploadEntry({ file, title }, maxFileSize) {
  if (!title.trim()) {
    throw new Error('标题不能为空。');
  }
  if (!file?.type.startsWith('image/')) {
    throw new Error('只能上传图片文件。');
  }
  if (file.size > maxFileSize) {
    const maxMb = Math.round(maxFileSize / 1024 / 1024);
    throw new Error(`图片大小不能超过 ${maxMb} MB。`);
  }
}

export async function loadUploadPolicy(userId) {
  const { data, error } = await supabase
    .rpc('upload_policy_state', { check_user_id: userId })
    .single();

  if (error) {
    throw new Error('无法读取你的上传权限，请稍后重试。');
  }

  return {
    uploadsEnabled: data?.uploads_enabled !== false,
    canUpload: data?.can_upload !== false,
    uploadLimitTotal:
      typeof data?.upload_limit_total === 'number' ? data.upload_limit_total : null,
    uploadCount: Number(data?.upload_count ?? 0),
    uploadHourLimit:
      typeof data?.upload_hour_limit === 'number' ? data.upload_hour_limit : null,
    uploadHourCount: Number(data?.upload_hour_count ?? 0),
    uploadDayLimit:
      typeof data?.upload_day_limit === 'number' ? data.upload_day_limit : null,
    uploadDayCount: Number(data?.upload_day_count ?? 0),
    allowsUpload: data?.allows_upload !== false,
  };
}

export function remainingUploadWindowMessage(limit, count, entryCount, windowLabel) {
  const remaining = Math.max(limit - count, 0);

  if (remaining <= 0) {
    return `你在${windowLabel}内的上传已达到 ${limit} 张上限，请稍后再试。`;
  }

  return `你在${windowLabel}内最多还能上传 ${remaining} 张，本次选择了 ${entryCount} 张。`;
}

export async function assertUploadPolicy({ userId, isAdmin, entryCount }) {
  const policy = await loadUploadPolicy(userId);

  if (!policy.uploadsEnabled && !isAdmin) {
    throw new Error('站点当前已暂停普通用户上传。');
  }

  if (!policy.canUpload) {
    throw new Error('你的账号当前已被管理员暂停上传。');
  }

  if (
    policy.uploadLimitTotal !== null &&
    policy.uploadCount + entryCount > policy.uploadLimitTotal
  ) {
    throw new Error(
      `你的账号最多可上传 ${policy.uploadLimitTotal} 张，目前已有 ${policy.uploadCount} 张。`,
    );
  }

  if (
    !isAdmin &&
    policy.uploadHourLimit !== null &&
    policy.uploadHourCount + entryCount > policy.uploadHourLimit
  ) {
    throw new Error(
      remainingUploadWindowMessage(
        policy.uploadHourLimit,
        policy.uploadHourCount,
        entryCount,
        '最近 1 小时',
      ),
    );
  }

  if (
    !isAdmin &&
    policy.uploadDayLimit !== null &&
    policy.uploadDayCount + entryCount > policy.uploadDayLimit
  ) {
    throw new Error(
      remainingUploadWindowMessage(
        policy.uploadDayLimit,
        policy.uploadDayCount,
        entryCount,
        '最近 24 小时',
      ),
    );
  }
}

export async function uploadMemoryEntry({
  entry,
  caption,
  tags,
  user,
  maxFileSize,
}) {
  validateUploadEntry(entry, maxFileSize);
  const uploadId = crypto.randomUUID();
  const storagePath = `public/${user.id}/${uploadId}.${extensionFor(entry.file)}`;
  const thumbnailPath = `public/${user.id}/thumbs/${uploadId}.webp`;
  const { error: storageError } = await supabase.storage
    .from('atri-images')
    .upload(storagePath, entry.file, { cacheControl: '31536000', upsert: false });

  if (storageError) throw storageError;

  try {
    const thumbnailBlob = await createMemoryThumbnail(entry.file);
    await supabase.storage
      .from('atri-images')
      .upload(thumbnailPath, thumbnailBlob, {
        cacheControl: '31536000',
        contentType: 'image/webp',
        upsert: false,
      });
  } catch {
    // Keep upload resilient: the original image is the source of truth.
  }

  const { data: publicImage } = supabase.storage
    .from('atri-images')
    .getPublicUrl(storagePath);

  const { error: rowError } = await supabase.from('memories').insert({
    title: entry.title.trim(),
    caption: caption.trim() || null,
    image_url: publicImage.publicUrl,
    storage_path: storagePath,
    owner_id: user.id,
    owner_email: user.email ?? null,
    tags: normalizeTags(tags),
    file_size_bytes: entry.file.size,
    visibility_status: MEMORY_VISIBILITY_PUBLIC,
  });

  if (rowError) throw rowError;

  return {
    storagePath,
    thumbnailPath,
    publicUrl: publicImage.publicUrl,
  };
}
