export async function fetchFirstPublicMemoryId({ supabaseUrl, publishableKey }) {
  if (!supabaseUrl || !publishableKey) {
    return {
      ok: false,
      error: '缺少 Supabase URL 或 publishable key，无法读取公开图片 id',
    };
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/memories?select=id&visibility_status=eq.public&order=created_at.desc&limit=1`,
      {
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${publishableKey}`,
        },
      },
    );

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `读取公开图片 id 失败：HTTP ${response.status}`,
      };
    }

    const rows = await response.json();
    const id = rows?.[0]?.id ?? '';
    return id
      ? { ok: true, id }
      : { ok: false, error: '远端公开画廊没有可用于分享预览验证的图片' };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'unknown fetch error',
    };
  }
}

export async function checkShareMemoryPreview({ supabaseUrl, publishableKey }) {
  try {
    const publicMemory = await fetchFirstPublicMemoryId({ supabaseUrl, publishableKey });
    const previewUrl = publicMemory.id
      ? `${supabaseUrl}/functions/v1/share-memory?id=${publicMemory.id}`
      : `${supabaseUrl}/functions/v1/share-memory`;
    const response = await fetch(previewUrl);
    const contentType = response.headers.get('content-type') ?? '';
    const body = await response.text();
    const hasHtmlMeta =
      /<meta property="og:title"/.test(body)
      && /<meta property="og:image"/.test(body)
      && /<meta name="twitter:card"/.test(body)
      && body.includes('服务端分享预览');
    const isHtmlContentType = /text\/html/i.test(contentType);
    const isSupabaseTextPlainHtml = /text\/plain/i.test(contentType) && hasHtmlMeta;
    const hasCanonical = publicMemory.id
      ? body.includes(`/functions/v1/share-memory?id=${publicMemory.id}`)
      : /<link rel="canonical"/.test(body);

    if (!publicMemory.id) {
      return {
        ok: response.status === 400 || response.status === 200,
        status: response.status,
        contentType,
        memoryId: '',
        previewUrl,
        hasHtmlMeta,
        isHtmlContentType,
        isSupabaseTextPlainHtml,
        hasCanonical,
        error: publicMemory.error,
      };
    }

    return {
      ok: response.status === 200 && hasHtmlMeta && hasCanonical,
      status: response.status,
      contentType,
      memoryId: publicMemory.id,
      previewUrl,
      hasHtmlMeta,
      isHtmlContentType,
      isSupabaseTextPlainHtml,
      hasCanonical,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      contentType: '',
      memoryId: '',
      previewUrl: '',
      hasHtmlMeta: false,
      isHtmlContentType: false,
      isSupabaseTextPlainHtml: false,
      hasCanonical: false,
      error: error instanceof Error ? error.message : 'unknown fetch error',
    };
  }
}

export function shareMemoryDetail(result) {
  return [
    result.memoryId ? `memory ${result.memoryId.slice(0, 8)}...` : '',
    `HTTP ${result.status}`,
    result.contentType || '',
  ].filter(Boolean).join(' / ');
}
