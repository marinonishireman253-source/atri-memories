export function buildHomeActionItems({
  user,
  isAdmin,
  uploadDisabled,
  galleryScope,
  favoritesAvailable = false,
}) {
  if (!user) {
    return [
      {
        key: 'auth',
        title: '登录后开始整理',
        detail: '登录后可以批量上传、编辑和删除自己的图片，也能进入个人空间继续整理。',
        actionKey: 'open-auth',
        actionLabel: '登录或注册',
        tone: 'primary',
      },
    ];
  }

  const items = [
    {
      key: 'my-images',
      title: '我的图片',
      detail: galleryScope?.isCurrentUserScope
        ? '当前已经在你的图片范围内，适合继续检查、筛选和整理。'
        : '切到你的个人图片范围，集中处理自己上传的内容。',
      actionKey: 'show-my-images',
      actionLabel: galleryScope?.isCurrentUserScope ? '继续整理' : '查看我的图片',
    },
  ];

  if (favoritesAvailable) {
    items.push({
      key: 'my-favorites',
      title: '我的收藏',
      detail: galleryScope?.isFavoritesScope
        ? '当前已经在你的收藏范围内，适合回看和继续筛选喜欢的内容。'
        : '把喜欢的公开图片收进自己的收藏列表，之后可以单独回看。',
      actionKey: 'show-my-favorites',
      actionLabel: galleryScope?.isFavoritesScope ? '继续回看' : '查看我的收藏',
    });
  }

  items.push(
    {
      key: 'upload',
      title: '批量上传',
      detail: uploadDisabled
        ? '站点当前暂停普通用户上传。你仍然可以浏览公开画廊和维护已有图片。'
        : '直接上传一批新图片，上传成功后会自动回到你的图片范围。',
      actionKey: 'open-upload',
      actionLabel: uploadDisabled ? '当前不可上传' : '开始上传',
      disabled: uploadDisabled,
      tone: uploadDisabled ? 'muted' : 'primary',
    },
    {
      key: 'user-space',
      title: '我的空间',
      detail: '查看个人资料、上传统计、常用标签，以及当前画廊范围。',
      actionKey: 'open-user',
      actionLabel: '打开我的空间',
    },
  );

  if (isAdmin) {
    items.push({
      key: 'admin',
      title: '管理后台',
      detail: '进入图片管理、用户管理、举报处理和站点设置这些后台入口。',
      actionKey: 'open-admin',
      actionLabel: '进入管理后台',
    });
  }

  return items;
}
