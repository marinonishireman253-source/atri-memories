import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COLORS = new Set(['yellow', 'pink', 'blue', 'green']);

function response(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function textValue(value: unknown, maxLength: number) {
  return String(value ?? '').trim().slice(0, maxLength);
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function requestFingerprint(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const realIp = request.headers.get('x-real-ip') ?? '';
  const userAgent = request.headers.get('user-agent') ?? '';
  return sha256(`${forwardedFor || realIp}|${userAgent}`);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return response({ error: 'Method not allowed.' }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return response({ error: 'Invalid request.' }, 400);
  }

  const postId = textValue(body.post_id, 64);
  const content = textValue(body.content, 500);
  const authorName = textValue(body.author_name, 20) || '匿名的打捞员';
  const color = COLORS.has(textValue(body.color, 16)) ? textValue(body.color, 16) : 'yellow';

  if (!ID_PATTERN.test(postId)) {
    return response({ error: 'Invalid blog post.' }, 400);
  }
  if (!content) {
    return response({ error: 'Comment content is required.' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const fingerprint = await requestFingerprint(request);
  const { data, error } = await supabase.rpc('submit_blog_comment', {
    comment_post_id: postId,
    comment_author_name: authorName,
    comment_content: content,
    comment_color: color,
    comment_reporter_fingerprint: fingerprint,
  });

  if (error) {
    if (error.message?.includes('blog_comment_rate_limited')) {
      return response({ error: 'Comment rate limited.' }, 429);
    }
    if (
      error.message?.includes('invalid_comment_content') ||
      error.message?.includes('blog_post_not_found')
    ) {
      return response({ error: 'Invalid comment.' }, 400);
    }
    return response({ error: 'Unable to submit comment.' }, 500);
  }

  return response({ comment: data }, 200);
});
