export function authModeModel({ mode, registrationsEnabled }) {
  const signingIn = mode === 'sign-in';

  return {
    title: signingIn ? '登录账户' : '注册账户',
    submitLabel: signingIn ? '登录' : '注册',
    submittingLabel: '处理中...',
    toggleLabel: signingIn ? '没有账户？注册一个' : '已有账户？去登录',
    canToggleMode: registrationsEnabled,
  };
}

export function authAccessPolicyModel({ registrationsEnabled }) {
  return registrationsEnabled
    ? {
        tone: 'open',
        label: '公开注册开放',
        title: '可直接创建账号',
        detail: '新用户可以通过邮箱和密码注册；如果站点要求邮箱确认，请先完成确认后再登录。',
      }
    : {
        tone: 'invite',
        label: '邀请制',
        title: '当前仅开放已有账号登录',
        detail: '公开注册已暂停，新账号需要管理员在后台用户管理中发送邀请。',
      };
}
