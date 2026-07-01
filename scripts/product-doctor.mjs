import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function exists(path) {
  return existsSync(join(root, path));
}

function fail(message) {
  failures.push(message);
}

function requireFile(path) {
  if (!exists(path)) fail(`缺少文件：${path}`);
}

function requireTokens(path, tokens) {
  requireFile(path);
  if (!exists(path)) return;

  const content = read(path);
  for (const token of tokens) {
    if (!content.includes(token)) fail(`${path} 缺少产品流程证据：${token}`);
  }
}

function requirePackageScript(name) {
  const packageJson = JSON.parse(read('package.json'));
  if (!packageJson.scripts?.[name]) fail(`package.json 缺少脚本：${name}`);
  return packageJson.scripts ?? {};
}

function checkGroup(label, checks) {
  const before = failures.length;
  for (const check of checks) check();
  const passed = failures.length === before;
  process.stdout.write(`${passed ? '[OK]' : '[FAIL]'} ${label}\n`);
}

process.stdout.write('Product Doctor\n');
process.stdout.write('==============\n');

const userPathChecks = [];
if (exists('src/app/VoiceToolkit.jsx')) {
  userPathChecks.push(() => requireTokens('src/app/VoiceToolkit.jsx', [
    '亚托莉语音 本地生成',
    '下载本地启动包',
    '手机暂不支持生成',
    '模型来源',
    '本站不提供其镜像',
  ]));
}
userPathChecks.push(
  () => requireTokens('src/features/gallery/Gallery.jsx', [
    'GalleryFilters',
    'GalleryScopeBar',
    'MemoryCard',
    'onShowFavorites',
  ]),
  () => requireTokens('src/features/viewer/ImageViewer.jsx', [
    'ViewerEditForm',
    'ViewerReportForm',
    'ViewerLinkActions',
    '下载原图',
    '举报图片',
    '删除这张图片',
    '加入收藏',
  ]),
  () => requireTokens('src/features/upload/UploadModal.jsx', [
    'UploadBatchList',
    'UploadProgressMeter',
    'useUploadDraftSelection',
    '批量保存',
  ]),
  () => requireTokens('src/features/auth/AuthModal.jsx', [
    'AuthAccessPolicyCard',
    'AuthForm',
    'AuthSecondaryActions',
    'registrationClosedNotice',
  ]),
  () => requireTokens('src/features/user/UserPanel.jsx', [
    'UserProfileForm',
    'UserSummaryStats',
    'UserTagStatsCard',
    'UserUploadPolicyCard',
    '我的收藏',
  ]),
);
checkGroup('用户侧路径', userPathChecks);

checkGroup('管理侧路径', [
  () => requireTokens('src/features/admin/AdminPanelTabContent.jsx', [
    'AdminOverviewTab',
    'AdminImagesTab',
    'AdminUsersTab',
    'AdminReportsTab',
    'AdminLogsTab',
    'AdminSettingsTab',
  ]),
  () => requireTokens('src/features/admin/AdminImagesTab.jsx', [
    '批量下载 ZIP',
    '批量删除',
    '回填大小',
    '待处理举报',
  ]),
  () => requireTokens('src/features/admin/AdminUsersTab.jsx', [
    '邀请用户',
    '暂停上传',
    '设置上限',
    '用户状态分组',
  ]),
  () => requireTokens('src/features/admin/AdminReportsTab.jsx', [
    '举报队列摘要',
    '标记已处理',
    '驳回举报',
    '重新打开',
  ]),
  () => requireTokens('src/features/admin/AdminLogsTab.jsx', [
    '操作日志摘要',
    '搜索日志',
    'ADMIN_LOG_ACTION_FILTERS',
  ]),
  () => requireTokens('src/features/admin/AdminSettingsSections.jsx', [
    '站点健康检查',
    '导出与备份策略',
    '运行监控口径',
    '反滥用与频率限制口径',
    '每小时上传上限（张）',
  ]),
]);

checkGroup('数据与权限边界', [
  () => requireTokens('src/lib/memoryQueries.js', [
    'loadMemoryPage',
    'loadFavoriteMemoryPage',
    'loadMemoryById',
    'attachAdminReportSummary',
  ]),
  () => requireTokens('src/lib/memoryMutations.js', [
    'deleteRemoteMemory',
    'deleteRemoteMemories',
    'updateRemoteMemory',
    'delete-memory',
    'update-memory',
  ]),
  () => requireTokens('src/lib/memoryUpload.js', [
    'assertUploadPolicy',
    'uploadMemoryEntry',
    'upload_policy_state',
    'atri-images',
  ]),
  () => requireTokens('src/lib/memoryMedia.js', [
    'hydrateMemoryMediaUrls',
    'signed_url',
    'memoryOriginalUrl',
  ]),
  () => requireTokens('supabase/functions/manage-overview/index.ts', [
    'supabase.auth.admin.listUsers',
    'report_summary',
    'registrations_24h',
  ]),
  () => requireTokens('supabase/functions/manage-memories/index.ts', [
    'attachReportSummaries',
    'createSignedUrl',
    'HEAD',
  ]),
  () => requireTokens('supabase/functions/manage-users/index.ts', [
    'invite-user',
    'set-upload-policy',
    'admin_invite_policy_state',
  ]),
  () => requireTokens('supabase/functions/delete-memory/index.ts', [
    'admin_audit_logs',
    'storage_path',
  ]),
  () => requireTokens('supabase/functions/update-memory/index.ts', [
    'is_featured',
    'visibility_status',
    'admin_audit_logs',
  ]),
  () => requireTokens('supabase/migrations/202605240010_private_storage_bucket.sql', ['public = false']),
  () => requireTokens('supabase/migrations/202605240013_memory_reports.sql', ['memory_reports']),
  () => requireTokens('supabase/migrations/202605240021_memory_favorites.sql', ['memory_favorites']),
]);

checkGroup('验证与交接', [
  () => {
    const scripts = requirePackageScript('product:doctor');
    for (const name of [
      'verify',
      'architecture:doctor',
      'qa:doctor',
      'release:preflight',
      'completion:audit',
      'smoke',
      'smoke:local',
      'smoke:session',
    ]) {
      if (!scripts[name]) fail(`package.json 缺少脚本：${name}`);
    }
    if (scripts.verify && !scripts.verify.includes('product:doctor')) {
      fail('verify 未接入 product:doctor。');
    }
  },
  () => requireTokens('docs/MASTER_DELIVERY_PLAN.md', [
    '完成定义',
    '用户侧路径完整',
    '管理侧路径完整',
  ]),
  () => requireTokens('docs/SITE_ARCHITECTURE_PLAN.md', [
    '记忆查询边界',
    '记忆写操作边界',
    '上传数据边界',
  ]),
  () => requireTokens('docs/SMOKE_TESTING_GUIDE.md', [
    'npm run smoke',
    'SMOKE_ADMIN_SESSION_JSON',
    'SMOKE_USER_SESSION_JSON',
  ]),
  () => requireTokens('docs/MANUAL_QA_TEMPLATE.md', [
    'QA_AUDIT_STATUS',
    '普通用户路径',
    '管理员路径',
  ]),
  () => requireTokens('docs/LAUNCH_READINESS_CHECKLIST.md', [
    'npm run verify',
    'npm run release:preflight',
    'npm run completion:audit',
  ]),
]);

if (failures.length) {
  process.stderr.write('\nProduct Doctor 发现本地产品完整性缺口：\n');
  for (const item of failures) process.stderr.write(`- ${item}\n`);
  process.exit(1);
}

process.stdout.write('\nProduct Doctor passed.\n');
