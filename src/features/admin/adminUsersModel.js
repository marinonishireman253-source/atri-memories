export const ADMIN_USER_SEGMENTS = [
  {
    key: 'all',
    label: '全部',
    matches: () => true,
  },
  {
    key: 'admins',
    label: '管理员',
    matches: (user) => Boolean(user.is_admin),
  },
  {
    key: 'pending',
    label: '待确认',
    matches: (user) => !user.email_confirmed_at,
  },
  {
    key: 'blocked-upload',
    label: '暂停上传',
    matches: (user) => user.can_upload === false,
  },
  {
    key: 'limited-upload',
    label: '有上传上限',
    matches: (user) => typeof user.upload_limit_total === 'number',
  },
];

function matchesUserQuery(user, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return `${user.email ?? ''} ${user.id ?? ''}`.toLowerCase().includes(normalizedQuery);
}

export function buildAdminUserSegments(users) {
  return ADMIN_USER_SEGMENTS.map((segment) => ({
    ...segment,
    count: users.filter(segment.matches).length,
  }));
}

export function filterAdminUsers(users, { query = '', segmentKey = 'all' } = {}) {
  const segment = ADMIN_USER_SEGMENTS.find((item) => item.key === segmentKey) ?? ADMIN_USER_SEGMENTS[0];
  return users.filter((user) => segment.matches(user) && matchesUserQuery(user, query));
}
