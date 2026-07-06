import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(path) {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf8');
}

function exists(path) {
  return existsSync(join(root, path));
}

function walk(dir, files = []) {
  for (const entry of readdirSync(join(root, dir))) {
    if (entry === 'node_modules' || entry === 'dist') continue;
    const full = join(root, dir, entry);
    const relativePath = relative(root, full);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(relativePath, files);
    } else {
      files.push(relativePath);
    }
  }
  return files;
}

const packageJson = JSON.parse(read('package.json'));
const scripts = packageJson.scripts ?? {};

if (!scripts.build) fail('package.json 缺少 build 脚本。');
if (!scripts['architecture:doctor']) fail('package.json 缺少 architecture:doctor 脚本。');
if (!scripts['admin-demo:test']) fail('package.json 缺少 admin-demo:test 脚本。');
if (!scripts['case-study:test']) fail('package.json 缺少 case-study:test 脚本。');
if (!scripts.check) fail('package.json 缺少 check 脚本。');
if (!scripts['completion:audit']) fail('package.json 缺少 completion:audit 脚本。');
if (!scripts['deploy:doctor']) fail('package.json 缺少 deploy:doctor 脚本。');
if (!scripts['functions:check']) fail('package.json 缺少 functions:check 脚本。');
if (!scripts['git:check']) fail('package.json 缺少 git:check 脚本。');
if (!scripts['git:check:test']) fail('package.json 缺少 git:check:test 脚本。');
if (!scripts['launch:doctor']) fail('package.json 缺少 launch:doctor 脚本。');
if (!scripts['mobile:check']) fail('package.json 缺少 mobile:check 脚本。');
if (!scripts['mobile:check:test']) fail('package.json 缺少 mobile:check:test 脚本。');
if (!scripts['product:doctor']) fail('package.json 缺少 product:doctor 脚本。');
if (!scripts['project:check']) fail('package.json 缺少 project:check 脚本。');
if (!scripts['qa:init']) fail('package.json 缺少 qa:init 脚本。');
if (!scripts['qa:doctor']) fail('package.json 缺少 qa:doctor 脚本。');
if (!scripts['release:preflight']) fail('package.json 缺少 release:preflight 脚本。');
if (!scripts.smoke) fail('package.json 缺少 smoke 脚本。');
if (!scripts['smoke:doctor']) fail('package.json 缺少 smoke:doctor 脚本。');
if (!scripts['smoke:local']) fail('package.json 缺少 smoke:local 脚本。');
if (!scripts['smoke:session']) fail('package.json 缺少 smoke:session 脚本。');
if (!scripts.verify) fail('package.json 缺少 verify 脚本。');
if (!String(scripts.verify ?? '').includes('npm run git:check')) fail('verify 脚本必须先执行 git:check。');
const projectCheckScript = String(scripts['project:check'] ?? '');
if (!projectCheckScript.includes('npm run admin-demo:test')) fail('project:check 必须执行 admin-demo:test。');
if (!projectCheckScript.includes('npm run case-study:test')) fail('project:check 必须执行 case-study:test。');

const requiredFiles = [
  'CONTRIBUTING.md',
  'README.md',
  '.github/pull_request_template.md',
  '.github/workflows/ci.yml',
  '.githooks/commit-msg',
  '.githooks/pre-push',
  'public/favicon.svg',
  'docs/GIT_WORKFLOW.md',
  'docs/MANUAL_QA_TEMPLATE.md',
  'docs/manual-qa-runs/.gitkeep',
  'docs/SMOKE_TESTING_GUIDE.md',
  'scripts/architecture-doctor.mjs',
  'scripts/create-completion-audit-report.mjs',
  'scripts/create-manual-qa-run.mjs',
  'scripts/create-release-preflight-report.mjs',
  'scripts/create-smoke-session.mjs',
  'scripts/deploy-doctor.mjs',
  'scripts/git-policy-check.mjs',
  'scripts/launch-doctor.mjs',
  'scripts/mobile-layout-check.mjs',
  'scripts/product-doctor.mjs',
  'scripts/qa-doctor.mjs',
  'scripts/share-preview-diagnostics.mjs',
  'scripts/smoke-doctor.mjs',
  'scripts/smoke-check.mjs',
  'docs/MASTER_DELIVERY_PLAN.md',
  'docs/SITE_ARCHITECTURE_PLAN.md',
  'docs/LAUNCH_READINESS_CHECKLIST.md',
  'tests/gitPolicyCheck.test.js',
  'tests/adminDemoSummary.test.js',
  'tests/caseStudyContent.test.js',
  'tests/mobileLayoutCheck.test.js',
  'src/app/AppOverlays.jsx',
  'src/app/CaseStudyPageRoute.jsx',
  'src/app/GalleryPageRoute.jsx',
  'src/app/HomeActionGrid.jsx',
  'src/app/HomeStatusStack.jsx',
  'src/app/lazyPanels.js',
  'src/app/homePageOverlayPropsModel.js',
  'src/app/homePagePropsModel.js',
  'src/app/useHomePageGalleryScope.js',
  'src/app/useGalleryPageModel.js',
  'src/app/useHomePageModel.js',
  'src/app/useHomePageStatus.js',
  'src/app/useAppUiState.js',
  'src/features/auth/AuthModal.jsx',
  'src/features/auth/auth.css',
  'src/features/auth/AuthAccessPolicyCard.jsx',
  'src/features/auth/AuthForm.jsx',
  'src/features/auth/AuthSecondaryActions.jsx',
  'src/features/auth/authFlowModel.js',
  'src/features/gallery/FeaturedMemories.jsx',
  'src/features/gallery/FeaturedMemoryCard.jsx',
  'src/features/gallery/GalleryFilters.jsx',
  'src/features/gallery/Gallery.jsx',
  'src/features/gallery/GalleryManageBar.jsx',
  'src/features/gallery/GalleryScopeBar.jsx',
  'src/features/case-study/caseStudy.css',
  'src/features/gallery/gallery.css',
  'src/features/gallery/galleryFilterSummaryModel.js',
  'src/features/gallery/galleryManageModel.js',
  'src/features/gallery/galleryScopeModel.js',
  'src/features/gallery/useGalleryManagement.js',
  'src/features/gallery/GalleryStates.jsx',
  'src/features/gallery/MemoryCard.jsx',
  'src/features/upload/UploadModal.jsx',
  'src/features/upload/upload.css',
  'src/features/upload/UploadBatchList.jsx',
  'src/features/upload/UploadProgressMeter.jsx',
  'src/features/upload/UploadTagSuggestions.jsx',
  'src/features/upload/uploadDraftModel.js',
  'src/features/upload/uploadUtils.js',
  'src/features/upload/useUploadDraftSelection.js',
  'src/features/user/UserPanel.jsx',
  'src/features/user/user.css',
  'src/features/user/UserGalleryScopeCard.jsx',
  'src/features/user/UserOnboardingCard.jsx',
  'src/features/user/UserProfileForm.jsx',
  'src/features/user/UserSummaryStats.jsx',
  'src/features/user/UserTagStatsCard.jsx',
  'src/features/user/UserUploadPolicyCard.jsx',
  'src/features/user/userFormatters.js',
  'src/features/viewer/ImageViewer.jsx',
  'src/features/viewer/viewer.css',
  'src/features/viewer/ViewerEditForm.jsx',
  'src/features/viewer/ViewerInfoGrid.jsx',
  'src/features/viewer/ViewerLinkActions.jsx',
  'src/features/viewer/ViewerReportForm.jsx',
  'src/features/viewer/viewerFormatters.js',
  'src/features/viewer/useViewerEditForm.js',
  'src/features/viewer/useViewerReportForm.js',
  'src/components/StatusNotice.jsx',
  'src/styles/app-shell.css',
  'src/styles/foundation.css',
  'src/styles/responsive.css',
  'src/styles/theme-modal.css',
  'src/features/admin/admin.css',
  'src/hooks/useAdminMemories.js',
  'src/hooks/useFeaturedMemories.js',
  'src/hooks/useAdminOverview.js',
  'src/hooks/useMemoryFavorites.js',
  'src/hooks/useUserSummary.js',
  'src/hooks/useAuth.js',
  'src/hooks/useReports.js',
  'src/lib/memoryContent.js',
  'src/lib/memoryDetail.js',
  'src/lib/memoryPresentation.js',
  'src/lib/siteMeta.js',
  'src/lib/caseStudyContent.js',
  'src/lib/adminOverview.js',
  'src/lib/adminDemoSummary.js',
  'src/lib/adminAuthSignals.js',
  'src/lib/adminHealth.js',
  'src/lib/adminBackup.js',
  'src/lib/adminAbuse.js',
  'src/lib/adminMonitoring.js',
  'src/lib/adminRetention.js',
  'src/lib/adminInvitePolicy.js',
  'src/lib/adminLaunchReadiness.js',
  'src/lib/homeActions.js',
  'src/lib/reporting.js',
  'src/lib/userFeedback.js',
  'src/lib/userJourney.js',
  'src/lib/userOnboarding.js',
  'src/lib/userSpace.js',
  'src/lib/memoryMutations.js',
  'src/lib/memoryQueries.js',
  'src/lib/memoryUpload.js',
  'src/features/admin/AdminChrome.jsx',
  'src/features/admin/AdminDisclosureSection.jsx',
  'src/features/admin/AdminLogsTab.jsx',
  'src/features/admin/AdminImagesTab.jsx',
  'src/features/admin/AdminOverviewTab.jsx',
  'src/features/admin/AdminPanelMessages.jsx',
  'src/features/admin/AdminPanelTabContent.jsx',
  'src/features/admin/AdminReportsTab.jsx',
  'src/features/admin/AdminSettingsTab.jsx',
  'src/features/admin/AdminSettingsSections.jsx',
  'src/features/admin/AdminUsersTab.jsx',
  'src/features/admin/adminFormatters.js',
  'src/features/admin/adminLogsModel.js',
  'src/features/admin/adminReportsModel.js',
  'src/features/admin/adminUsersModel.js',
  'src/features/admin/useAdminPanelFilters.js',
  'src/features/admin/useAdminMemorySelection.js',
  'src/features/admin/useAdminSettingsForm.js',
  'src/lib/memoryMedia.js',
  'src/lib/routes.js',
  'src/lib/zipDownloads.js',
  'src/lib/pageMeta.js',
  'supabase/functions/share-memory/index.ts',
  'supabase/functions/manage-memories/index.ts',
  'supabase/functions/manage-overview/index.ts',
  'supabase/functions/manage-users/index.ts',
  'supabase/functions/manage-audit-logs/index.ts',
  'supabase/functions/submit-report/index.ts',
  'supabase/functions/manage-reports/index.ts',
  'supabase/functions/media-urls/index.ts',
  'supabase/functions/delete-memory/index.ts',
  'supabase/functions/update-memory/index.ts',
  'supabase/migrations/202605240001_admin_audit_logs.sql',
  'supabase/migrations/202605240003_site_settings.sql',
  'supabase/migrations/202605240004_memory_file_size_admin_indexes.sql',
  'supabase/migrations/202605240005_featured_memories.sql',
  'supabase/migrations/202605240006_restrict_memory_column_updates.sql',
  'supabase/migrations/202605240007_upload_batch_setting.sql',
  'supabase/migrations/202605240008_user_upload_policy.sql',
  'supabase/migrations/202605240009_memory_visibility.sql',
  'supabase/migrations/202605240010_private_storage_bucket.sql',
  'supabase/migrations/202605240011_restrict_storage_object_select.sql',
  'supabase/migrations/202605240012_global_upload_setting.sql',
  'supabase/migrations/202605240013_memory_reports.sql',
  'supabase/migrations/202605240014_registration_setting.sql',
  'supabase/migrations/202605240015_invite_user_audit_action.sql',
  'supabase/migrations/202605240016_report_rate_limits.sql',
  'supabase/migrations/202605240017_upload_rate_windows.sql',
  'supabase/migrations/202605240018_restrict_upload_policy_function_exec.sql',
  'supabase/migrations/202605240019_invite_rate_windows.sql',
  'supabase/migrations/202605240020_restrict_admin_invite_policy_exec.sql',
  'supabase/migrations/202605240021_memory_favorites.sql',
];

for (const file of requiredFiles) {
  if (!exists(file)) fail(`缺少必要文件：${file}`);
}

const gitWorkflow = read('docs/GIT_WORKFLOW.md');
for (const token of ['分支规则', '提交规则', '合并前检查', 'Pull Request 标准', '发布与回滚', '敏感信息', 'git config core.hooksPath .githooks']) {
  if (!gitWorkflow.includes(token)) fail(`Git 标准文档缺少：${token}`);
}

const contributing = read('CONTRIBUTING.md');
for (const token of ['docs/GIT_WORKFLOW.md', 'npm run git:check', 'npm run check', 'npm run build', 'npm run verify']) {
  if (!contributing.includes(token)) fail(`CONTRIBUTING 缺少 Git 接入说明：${token}`);
}

const readmeProjectChecks = read('README.md');
for (const token of ['npm run build', 'npm run functions:check', 'npm run verify', 'npm run project:check', 'npm run mobile:check', 'npm run smoke:local', '本地质量检查', '项目级完整本地检查']) {
  if (!readmeProjectChecks.includes(token)) fail(`README 缺少项目检查说明：${token}`);
}

const prTemplate = read('.github/pull_request_template.md');
for (const token of ['变更摘要', '影响范围', '验证结果', '风险与回滚', '截图或证据', 'npm run git:check']) {
  if (!prTemplate.includes(token)) fail(`PR 模板缺少：${token}`);
}

const ciWorkflow = read('.github/workflows/ci.yml');
for (const token of ['Project CI', 'actions/setup-node@v4', 'denoland/setup-deno@v2', 'npm ci', 'npm run git:check -- --ci', 'npm run verify']) {
  if (!ciWorkflow.includes(token)) fail(`CI workflow 缺少：${token}`);
}

const gitPolicyCheck = read('scripts/git-policy-check.mjs');
for (const token of ['isValidBranchName', 'isValidCommitSubject', 'validatePolicyFiles', 'git:check:test', '--commit-msg-file', '--require-clean']) {
  if (!gitPolicyCheck.includes(token)) fail(`git-policy-check 缺少能力：${token}`);
}

const mobileLayoutCheck = read('scripts/mobile-layout-check.mjs');
for (const token of ['MOBILE_LAYOUT_ROUTES', 'MOBILE_LAYOUT_VIEWPORTS', 'hasHorizontalOverflow', 'assertRouteMetrics', 'mobile-layout-', '--skip-build', 'VITE_SUPABASE_URL']) {
  if (!mobileLayoutCheck.includes(token)) fail(`mobile-layout-check 缺少能力：${token}`);
}

if (exists('.atri-admin-delete-code')) {
  fail('发现旧的口令式管理残留：.atri-admin-delete-code');
}

const sourceFiles = walk('.').filter((file) =>
  /\.(js|jsx|ts|tsx|mjs|css|md|toml|sql)$/.test(file) && file !== 'scripts/quality-check.mjs',
);
const serviceRoleAllowedFiles = new Set([
  'scripts/assign-legacy-memories-owner.mjs',
  'scripts/codex-daily-blog.mjs',
  'tests/codexDailyBlog.test.js',
]);

for (const file of sourceFiles) {
  const content = read(file);
  if (/TODO|FIXME|debugger/.test(content)) {
    fail(`发现未清理调试标记：${file}`);
  }
  if (
    !file.startsWith('supabase/functions/')
    && !file.startsWith('supabase/migrations/')
    && !serviceRoleAllowedFiles.has(file)
    && /SUPABASE_SERVICE_ROLE_KEY|service_role/i.test(content)
  ) {
    fail(`非 Edge Function 文件出现 service role 相关文本：${file}`);
  }
}

const stylesEntry = read('src/styles.css');
for (const token of ['@import "./styles/foundation.css"', '@import "./features/gallery/gallery.css"', '@import "./features/admin/admin.css"', '@import "./styles/responsive.css"']) {
  if (!stylesEntry.includes(token)) fail(`样式入口缺少分层导入：${token}`);
}

const adminStyleSources = [
  'src/features/admin/admin.css',
  'src/features/admin/styles/admin-shell.css',
  'src/features/admin/styles/admin-overview.css',
  'src/features/admin/styles/admin-controls.css',
  'src/features/admin/styles/admin-settings.css',
  'src/features/admin/styles/admin-tables.css',
  'src/features/admin/styles/admin-anime-overrides.css',
  'src/features/admin/styles/admin-responsive.css',
];

const styleSources = [
  'src/styles/foundation.css',
  'src/styles/app-shell.css',
  'src/styles/theme-modal.css',
  'src/features/gallery/gallery.css',
  'src/features/viewer/viewer.css',
  'src/features/upload/upload.css',
  'src/features/auth/auth.css',
  'src/features/user/user.css',
  ...adminStyleSources,
  'src/styles/responsive.css',
];
const styles = styleSources.map((file) => read(file)).join('\n');
for (const token of ['100dvh', 'prefers-reduced-motion', '.status-notice', '.admin-tabs', '.viewer-overlay', '.viewer-nav', '.overview-grid', '.auth-config-grid', '.launch-config-grid', '.invite-form', '.health-check', '.backup-asset-grid', '.backup-plan-grid']) {
  if (!styles.includes(token)) fail(`移动端/可访问性样式缺少：${token}`);
}

const siteMeta = read('src/lib/siteMeta.js');
for (const token of ['SITE_NAME', 'DEFAULT_TITLE', 'DEFAULT_DESCRIPTION', 'DEFAULT_THEME_COLOR', 'DEFAULT_OG_TYPE']) {
  if (!siteMeta.includes(token)) fail(`siteMeta 缺少站点 meta 常量：${token}`);
}

const memoriesHook = read('src/hooks/useMemories.js');
const memoryMutations = read('src/lib/memoryMutations.js');
const memoryQueries = read('src/lib/memoryQueries.js');
const memoryUpload = read('src/lib/memoryUpload.js');
const memoryDataBoundary = [memoriesHook, memoryMutations, memoryQueries, memoryUpload, read('src/lib/memoryContent.js')].join('\n');
for (const field of ['file_size_bytes', 'is_featured', 'visibility_status']) {
  if (!memoryDataBoundary.includes(field)) fail(`记忆数据边界未包含字段：${field}`);
}
for (const token of ['assertUploadPolicy', 'uploadMemoryEntry', 'loadFavoriteMemoryPage', 'loadMemoryPage', 'loadMemoryById', 'deleteRemoteMemory', 'deleteRemoteMemories', 'updateRemoteMemory']) {
  if (!memoriesHook.includes(token)) fail(`useMemories 缺少数据边界接线：${token}`);
}
for (const token of ['filterMemoriesLocally', 'favoritesOnly']) {
  if (!memoriesHook.includes(token)) fail(`useMemories 未接入统一内容模型：${token}`);
}

for (const token of ['deleteRemoteMemory', 'deleteRemoteMemories', 'updateRemoteMemory', 'delete-memory', 'update-memory', 'normalizeMemories', 'hydrateMemoryMediaUrl', 'attachAdminReportSummary', 'normalizeTags']) {
  if (!memoryMutations.includes(token)) fail(`memoryMutations 缺少记忆写操作边界：${token}`);
}

for (const token of ['loadFavoriteMemoryPage', 'loadMemoryPage', 'loadMemoryById', 'attachAdminReportSummary', 'MEMORY_COLUMNS', 'applyMemoryFilters', 'memory_favorites', 'MEMORY_VISIBILITY_PUBLIC', 'hydrateMemoryMediaUrls', 'maybeSingle']) {
  if (!memoryQueries.includes(token)) fail(`memoryQueries 缺少记忆查询边界：${token}`);
}

for (const token of ['validateUploadEntry', 'loadUploadPolicy', 'assertUploadPolicy', 'uploadMemoryEntry', 'upload_policy_state', 'remainingUploadWindowMessage', 'upload_limit_total', 'upload_hour_limit', 'upload_day_limit', 'atri-images', 'MEMORY_VISIBILITY_PUBLIC']) {
  if (!memoryUpload.includes(token)) fail(`memoryUpload 缺少上传数据边界：${token}`);
}

const memoryContent = read('src/lib/memoryContent.js');
for (const token of [
  'MEMORY_COLUMNS',
  'DEFAULT_MEMORY_FILTERS',
  'DEFAULT_ADMIN_MEMORY_FILTERS',
  'PUBLIC_MEMORY_SORT_OPTIONS',
  'normalizeMemories',
  'applyMemoryFilters',
  'filterMemoriesLocally',
  'sortMemories',
  'isPublicMemory',
  'isHiddenMemory',
  'isFeaturedMemory',
  'memoryTitle',
  'memoryDescription',
  'ownerScopedFilters',
  'favoriteScopedFilters',
  'favoritesOnly',
  'report_summary',
]) {
  if (!memoryContent.includes(token)) fail(`memoryContent 缺少统一内容模型能力：${token}`);
}

const favoritesHook = read('src/hooks/useMemoryFavorites.js');
for (const token of ['useMemoryFavorites', 'memory_favorites', 'favoriteIds', 'favoritesCount', 'toggleFavorite']) {
  if (!favoritesHook.includes(token)) fail(`useMemoryFavorites 缺少收藏数据边界：${token}`);
}

const memoryDetail = read('src/lib/memoryDetail.js');
for (const token of ['memoryMetaModel', 'memoryDetailModel', 'memoryStatusBadges', 'shareUrl', 'sharePreviewUrl', 'preferredShareUrl', 'externalUrl', 'originalUrl', 'canReport', 'reportSummaryLabel', 'reportSummaryItems', 'memoryDetailInfoItems', 'memoryDetailLinkActions', 'linkActions', '复制 Markdown', 'markdownLinkLabel', '复制图片 URL', 'infoItems', 'collectionIndex', 'collectionTotal']) {
  if (!memoryDetail.includes(token)) fail(`memoryDetail 缺少单图 read model 能力：${token}`);
}

const memoryPresentation = read('src/lib/memoryPresentation.js');
for (const token of ['formatMemoryDate', 'formatMemoryBytes', 'memoryOwnerLabel', 'memoryVisibilityLabel', 'memoryStatusBadges', 'memoryPresentationModel']) {
  if (!memoryPresentation.includes(token)) fail(`memoryPresentation 缺少展示摘要模型能力：${token}`);
}

const adminOverviewModel = read('src/lib/adminOverview.js');
for (const token of ['EMPTY_OVERVIEW_SUMMARY', 'normalizeOverviewSummary', 'overviewMetricCards', 'adminChromeSummaryItems', 'pendingItemsTotal', 'reportStatusTotal', '接入策略', '举报状态', 'registrations_24h', 'invites_sent_24h']) {
  if (!adminOverviewModel.includes(token)) fail(`adminOverview 缺少统一运营摘要模型：${token}`);
}

const adminAuthSignals = read('src/lib/adminAuthSignals.js');
for (const token of ['AUTH_SIGNAL_THRESHOLDS', 'buildAuthAnomalySignals', 'authSignalHeadline', 'authActivitySummary', 'signup-pressure', 'invite-burst', 'stale-pending-invites']) {
  if (!adminAuthSignals.includes(token)) fail(`adminAuthSignals 缺少账号入口异常模型：${token}`);
}

const adminHealth = read('src/lib/adminHealth.js');
for (const token of ['buildSiteHealthChecks', 'healthHeadline', 'readinessChecks', 'open-reports', 'unknown-sizes', 'local-origin', 'buildAuthAnomalySignals']) {
  if (!adminHealth.includes(token)) fail(`adminHealth 缺少站点健康模型：${token}`);
}

const adminBackup = read('src/lib/adminBackup.js');
for (const token of ['backupAssets', 'backupRecoveryPlan', 'backupOperationalNotes', '业务数据', '图片文件', '账号状态', '部署与站点配置']) {
  if (!adminBackup.includes(token)) fail(`adminBackup 缺少导出/备份策略模型：${token}`);
}

const adminMonitoring = read('src/lib/adminMonitoring.js');
for (const token of ['monitoringMetricDefinitions', 'buildRuntimeMonitoringItems', 'runtimeMonitoringHeadline', '内容流入', '账号活跃', '入口压力', '治理负载', '容量账面']) {
  if (!adminMonitoring.includes(token)) fail(`adminMonitoring 缺少运行监控模型：${token}`);
}

const adminRetention = read('src/lib/adminRetention.js');
for (const token of ['retentionAssets', 'retentionActionQueue', 'retentionHeadline', '公开图片与用户内容', '下架内容与举报上下文', '账号确认与邀请积压', '后台审计与操作历史', '容量账面与历史图片修复']) {
  if (!adminRetention.includes(token)) fail(`adminRetention 缺少数据留存模型：${token}`);
}

const adminAbuse = read('src/lib/adminAbuse.js');
for (const token of ['abuseGuardrails', 'abuseGaps', 'abuseStrategyHeadline', '举报提交通道已有基础风控', '上传时间窗口限速已启用', '上传时间窗口限制还不完整', '注册入口仍缺少强制人机校验', '注册与邀请异常信号已接入概览']) {
  if (!adminAbuse.includes(token)) fail(`adminAbuse 缺少反滥用策略模型：${token}`);
}

const adminInvitePolicy = read('src/lib/adminInvitePolicy.js');
for (const token of ['normalizeInvitePolicy', 'inviteLimitSummary', 'inviteUsageSummary', 'invitePolicyErrorMessage', 'invite_rate_limited']) {
  if (!adminInvitePolicy.includes(token)) fail(`adminInvitePolicy 缺少邀请策略模型：${token}`);
}

const adminLaunchReadiness = read('src/lib/adminLaunchReadiness.js');
for (const token of ['launchConfigItems', 'buildLaunchReadinessChecks', 'launchReadinessHeadline', '站点入口地址', '分享预览方案', '分享预览仍使用主站图片页', '上线前仍需要一次完整手工验收']) {
  if (!adminLaunchReadiness.includes(token)) fail(`adminLaunchReadiness 缺少上线准备模型：${token}`);
}

const adminDisclosure = read('src/features/admin/AdminDisclosureSection.jsx');
for (const token of ['details', 'summary', 'admin-disclosure', '查看详情']) {
  if (!adminDisclosure.includes(token)) fail(`AdminDisclosureSection 缺少折叠运维边界：${token}`);
}

const uploadPolicyGrantMigration = read('supabase/migrations/202605240018_restrict_upload_policy_function_exec.sql');
for (const token of [
  "revoke all on function public.upload_policy_state(uuid) from anon",
  "grant execute on function public.upload_policy_state(uuid) to authenticated",
  "grant execute on function public.upload_policy_state(uuid) to service_role",
  "revoke all on function public.can_upload_memory(uuid) from anon",
  "grant execute on function public.can_upload_memory(uuid) to authenticated",
  "grant execute on function public.can_upload_memory(uuid) to service_role",
]) {
  if (!uploadPolicyGrantMigration.includes(token)) {
    fail(`上传策略函数授权迁移缺少：${token}`);
  }
}

const reporting = read('src/lib/reporting.js');
for (const token of ['REPORT_STATUS_OPEN', 'REPORT_STATUS_RESOLVED', 'REPORT_STATUS_DISMISSED', 'REPORT_STATUS_OPTIONS', 'REPORT_REASON_OPTIONS', 'REPORT_CODE_DUPLICATE_OPEN', 'REPORT_CODE_MEMORY_COOLDOWN', 'REPORT_CODE_RATE_LIMIT', 'reasonLabel', 'reportStatusLabel', 'reportStatusTone', 'normalizeReport', 'normalizeReportSummary', 'reportSummaryItems', 'reportSummaryLabel', 'reportSubmissionErrorMessage']) {
  if (!reporting.includes(token)) fail(`reporting 缺少统一举报状态模型：${token}`);
}

const favoritesMigration = read('supabase/migrations/202605240021_memory_favorites.sql');
for (const token of ['create table if not exists public.memory_favorites', 'primary key (user_id, memory_id)', 'Users can read own memory favorites', 'Users can add own memory favorites', 'Users can delete own memory favorites']) {
  if (!favoritesMigration.includes(token)) fail(`收藏表迁移缺少：${token}`);
}

const userFeedback = read('src/lib/userFeedback.js');
for (const token of ['createStatusNotice', 'previewModeNotice', 'registrationClosedNotice', 'uploadResultNotice', 'uploadDisabledNotice', 'galleryEmptyNotice', 'favoriteSavedNotice', 'favoriteRemovedNotice']) {
  if (!userFeedback.includes(token)) fail(`userFeedback 缺少统一用户反馈模型：${token}`);
}

const userJourney = read('src/lib/userJourney.js');
for (const token of ['homeSyncErrorNotice', 'sharedMemoryLoadingNotice', 'uploadDisabledHomeNotice', 'currentUserScopeNotice', 'currentFavoritesScopeNotice', 'uploadCompletedJourneyNotice']) {
  if (!userJourney.includes(token)) fail(`userJourney 缺少首页用户路径模型：${token}`);
}

const userOnboarding = read('src/lib/userOnboarding.js');
for (const token of ['userOnboardingModel', 'userOnboardingNotice', 'first-upload-paused', 'my-images-refined-empty']) {
  if (!userOnboarding.includes(token)) fail(`userOnboarding 缺少 onboarding 分支模型：${token}`);
}
if (userOnboarding.includes('从第一张图片开始')) {
  fail('userOnboarding 不应恢复冗余的首传横幅。');
}

const userSpace = read('src/lib/userSpace.js');
for (const token of ['userGalleryScopeModel', 'userSummaryStatsModel', 'userUploadPolicyModel', 'matchedCountLabel', 'current-range', 'matched-count', 'isFavoritesScope', 'favorites-count', 'storage-usage', 'formatMemoryBytes', 'uploadPolicy', 'upload_hour_limit', 'upload_day_limit', 'allowsUpload']) {
  if (!userSpace.includes(token)) fail(`userSpace 缺少用户空间 read model：${token}`);
}

const statusNotice = read('src/components/StatusNotice.jsx');
for (const token of ['status-notice', 'noticeRole', 'aria-live']) {
  if (!statusNotice.includes(token)) fail(`StatusNotice 缺少统一状态提示组件能力：${token}`);
}

const homeStatusHook = read('src/app/useHomePageStatus.js');
for (const token of ['useHomePageStatus', 'statusItems', 'showUploadCompleted', 'showBatchDeleteCompleted', 'showCurrentUserScope', 'showFavoritesScope', 'showUploadDisabled', 'dismissOnboardingStatus', 'user-onboarding']) {
  if (!homeStatusHook.includes(token)) fail(`useHomePageStatus 缺少首页路径编排：${token}`);
}

const homeStatusStack = read('src/app/HomeStatusStack.jsx');
for (const token of ['HomeStatusStack', 'home-status-stack', 'StatusNotice', '收起']) {
  if (!homeStatusStack.includes(token)) fail(`HomeStatusStack 缺少首页状态展示能力：${token}`);
}

const userSummaryHook = read('src/hooks/useUserSummary.js');
if (!userSummaryHook.includes('saveProfile') || !userSummaryHook.includes('user_profiles') || !userSummaryHook.includes('favoritesCount') || !userSummaryHook.includes('memory_favorites') || !userSummaryHook.includes('buildStorageStats') || !userSummaryHook.includes('file_size_bytes')) {
  fail('用户中心缺少个人资料保存能力。');
}

const userPanel = read('src/features/user/UserPanel.jsx');
for (const token of ['编辑个人资料', 'UserProfileForm', 'UserSummaryStats', 'UserTagStatsCard', 'onSelectUserTag', '我的收藏', 'favoritesError']) {
  if (!userPanel.includes(token)) fail(`UserPanel 缺少个人资料 UI：${token}`);
}

const appFile = read('src/App.jsx');
const appTokens = ['AppOverlays', 'useHomePageModel', 'GalleryPageRoute', 'DailyPageRoute', 'Hero', 'Header'];
if (exists('src/app/VoiceToolkit.jsx')) {
  appTokens.push('VoiceToolkit');
}
for (const token of appTokens) {
  if (!appFile.includes(token)) fail(`App 缺少 app 层编排边界：${token}`);
}

if (exists('src/app/VoiceToolkit.jsx')) {
  const voiceToolkit = read('src/app/VoiceToolkit.jsx');
  for (const token of ['亚托莉语音 本地生成', '下载本地启动包', '手机暂不支持生成', 'VoidShine/atri-sovits', 'AGPL-3.0', '本站不提供其镜像']) {
    if (!voiceToolkit.includes(token)) fail(`VoiceToolkit 缺少本地语音分发边界：${token}`);
  }
}

const homeActionGrid = read('src/app/HomeActionGrid.jsx');
for (const token of ['home-actions', 'home-actions-grid', '快速进入主要功能']) {
  if (!homeActionGrid.includes(token)) fail(`HomeActionGrid 缺少首页主导航层：${token}`);
}

const appOverlays = read('src/app/AppOverlays.jsx');
for (const token of ['Suspense', 'uploadModal', 'adminPanel', 'viewer', 'favoriteIds', 'onToggleFavorite', 'ImageViewer']) {
  if (!appOverlays.includes(token)) fail(`AppOverlays 缺少全局弹窗编排：${token}`);
}

const homePagePropsModel = read('src/app/homePagePropsModel.js');
for (const token of ['buildHomeStatusProps', 'journey-upload-complete', 'reset-my-images']) {
  if (!homePagePropsModel.includes(token)) fail(`homePagePropsModel 缺少首页 props 组装边界：${token}`);
}

const homePageOverlayPropsModel = read('src/app/homePageOverlayPropsModel.js');
for (const token of ['buildHomeOverlayProps', 'uploadModal', 'userPanel', 'authModal', 'themeModal', 'adminPanel', 'viewer']) {
  if (!homePageOverlayPropsModel.includes(token)) fail(`homePageOverlayPropsModel 缺少首页弹窗 props 合约：${token}`);
}

const dailyPageRoute = read('src/app/DailyPageRoute.jsx');
for (const token of ['DailyPageRoute', 'DailyAtri', 'useDailyPageModel']) {
  if (!dailyPageRoute.includes(token)) fail(`DailyPageRoute 缺少每日页编排边界：${token}`);
}

const dailyPageModel = read('src/app/useDailyPageModel.js');
for (const token of ['useDailyPageModel', 'useFeaturedMemories', 'dailyAtriModel', 'dailyAtriProps']) {
  if (!dailyPageModel.includes(token)) fail(`useDailyPageModel 缺少每日页数据边界：${token}`);
}

const galleryPageRoute = read('src/app/GalleryPageRoute.jsx');
for (const token of ['GalleryPageRoute', 'useGalleryPageModel', 'Gallery', 'HomeStatusStack', 'AppOverlays']) {
  if (!galleryPageRoute.includes(token)) fail(`GalleryPageRoute 缺少相册页编排边界：${token}`);
}

const pageRoutingSource = read('src/app/pageRouting.js');
for (const token of ['/case-study', '项目', 'Case Study']) {
  if (!pageRoutingSource.includes(token)) fail(`pageRouting 缺少项目案例路由：${token}`);
}

const appSource = read('src/App.jsx');
for (const token of ['CaseStudyPageRoute', "path === '/case-study'"]) {
  if (!appSource.includes(token)) fail(`App 缺少项目案例路由接线：${token}`);
}

const caseStudyRoute = read('src/app/CaseStudyPageRoute.jsx');
for (const token of ['caseStudyPage', 'caseStudySections', 'caseStudyEvidenceCommands', 'case-study-page', '项目案例']) {
  if (!caseStudyRoute.includes(token)) fail(`CaseStudyPageRoute 缺少项目案例展示边界：${token}`);
}

const caseStudyContent = read('src/lib/caseStudyContent.js');
for (const token of ['ATRI Memories', '权限模型', 'npm run verify', 'npm run smoke', 'npm run release:preflight', '产品浏览路径']) {
  if (!caseStudyContent.includes(token)) fail(`caseStudyContent 缺少项目叙事：${token}`);
}

const adminDemoSummary = read('src/lib/adminDemoSummary.js');
for (const token of ['adminDemoSummaryCards', '内容运营', '账号权限', '治理队列', '上线准备', 'targetTab']) {
  if (!adminDemoSummary.includes(token)) fail(`adminDemoSummary 缺少后台演示摘要模型：${token}`);
}

const galleryPageModel = read('src/app/useGalleryPageModel.js');
for (const token of ['useGalleryPageModel', 'useMemories', 'useUserSummary', 'useMemoryFavorites', 'useGalleryManagement', 'buildHomeStatusProps', 'buildHomeOverlayProps', 'galleryProps', 'statusProps', 'overlaysProps', 'openViewerMemory', 'deleteMemoryFromViewer', 'toggleMemoryFavorite', 'showUploadCompleted', 'showBatchDeleteCompleted', 'showCurrentUserScope', 'showFavoritesScope', 'galleryScope', 'showAllPublicImages', 'showMyFavorites', 'favoriteIds', 'onboarding', 'resetMyImagesFilters', 'toggleGalleryMemorySelected', 'deleteSelectedGalleryMemories', 'gallerySelectedIds', 'galleryActivityById', 'galleryManageNotice', 'markGalleryActivity', 'refreshSummary', 'pendingGalleryOverlay']) {
  if (!galleryPageModel.includes(token)) fail(`useGalleryPageModel 缺少相册数据边界：${token}`);
}

const homePageModel = read('src/app/useHomePageModel.js');
for (const token of ['useHomePageModel', 'useAuth', 'useSiteSettings', 'useAppFiltersState', 'useAppUiState', 'buildHomeOverlayProps', 'pendingGalleryOverlay', 'galleryRuntimeState', 'heroProps', 'headerProps', 'overlayProps', 'galleryRouteProps', 'requestGalleryOverlay', 'showMyImagesFromShell', 'showFavoritesFromShell', 'signUpWithPolicy', 'signOutWithReset']) {
  if (!homePageModel.includes(token)) fail(`useHomePageModel 缺少首页壳层边界：${token}`);
}
for (const token of ['useMemories', 'useUserSummary', 'useMemoryFavorites', 'useGalleryManagement', 'useHomePageGalleryScope', 'useHomePageStatus', 'galleryProps', 'statusProps', 'openViewerMemory', 'deleteMemoryFromViewer', 'toggleMemoryFavorite']) {
  if (homePageModel.includes(token)) fail(`useHomePageModel 不应继续持有相册重数据逻辑：${token}`);
}

const homePageGalleryScope = read('src/app/useHomePageGalleryScope.js');
for (const token of ['useHomePageGalleryScope', 'ownerScopedFilters', 'favoriteScopedFilters', 'DEFAULT_MEMORY_FILTERS', 'showMyImages', 'showMyImagesByTag', 'showMyFavorites', 'clearOwnerFilterWithJourney', 'resetGalleryFilters', 'selectGalleryTag', 'selectViewerTag', 'showAllPublicImages', 'resetMyImagesFilters', 'resetFavoriteFilters', 'resetToPublicGallery', 'gallery-panel']) {
  if (!homePageGalleryScope.includes(token)) fail(`useHomePageGalleryScope 缺少首页范围动作边界：${token}`);
}

const homeActions = read('src/lib/homeActions.js');
for (const token of ['buildHomeActionItems', '登录后开始整理', '我的收藏', '批量上传', '管理后台']) {
  if (!homeActions.includes(token)) fail(`homeActions 缺少首页主路径模型：${token}`);
}
for (const redundantToken of ['public-gallery', 'scroll-featured']) {
  if (homeActions.includes(redundantToken)) fail(`homeActions 不应恢复冗余首页入口：${redundantToken}`);
}

const featuredMemoriesPrioritySource = read('src/features/gallery/FeaturedMemories.jsx');
for (const token of ['memories.map((memory, index)', 'priority={index === 0}']) {
  if (!featuredMemoriesPrioritySource.includes(token)) fail(`FeaturedMemories 缺少精选图加载优先级控制：${token}`);
}

const featuredMemoryCardSource = read('src/features/gallery/FeaturedMemoryCard.jsx');
for (const token of ['priority = false', "loading={priority ? 'eager' : 'lazy'}", "fetchPriority={priority ? 'high' : 'low'}"]) {
  if (!featuredMemoryCardSource.includes(token)) fail(`FeaturedMemoryCard 缺少资源优先级控制：${token}`);
}

const themeModalSource = read('src/components/ThemeModal.jsx');
for (const token of ['loading="lazy"', 'decoding="async"']) {
  if (!themeModalSource.includes(token)) fail(`ThemeModal 缺少背景缩略图加载优化：${token}`);
}

const uploadBatchListSource = read('src/features/upload/UploadBatchList.jsx');
for (const token of ['loading="lazy"', 'decoding="async"']) {
  if (!uploadBatchListSource.includes(token)) fail(`UploadBatchList 缺少上传预览图加载优化：${token}`);
}

const imageViewerSource = read('src/features/viewer/ImageViewer.jsx');
for (const token of ['decoding="async"', 'fetchPriority="high"']) {
  if (!imageViewerSource.includes(token)) fail(`ImageViewer 缺少大图加载优化：${token}`);
}

const userJourneyBatch = read('src/lib/userJourney.js');
for (const token of ['batchDeleteJourneyNotice', 'memoryUpdatedJourneyNotice', 'memoryDeletedJourneyNotice', '已删除', '删除失败的图片会继续保留为选中状态']) {
  if (!userJourneyBatch.includes(token)) fail(`userJourney 缺少批量整理反馈模型：${token}`);
}

const appUiState = read('src/app/useAppUiState.js');
for (const token of ['useAppFiltersState', 'useAppUiState', 'memoryIdFromLocation', 'showCurrentUserImages', 'showFavoriteImages', 'navigateMemory']) {
  if (!appUiState.includes(token)) fail(`useAppUiState 缺少 app 状态边界：${token}`);
}

const routes = read('src/lib/routes.js');
for (const token of ['memorySharePreviewUrl', 'preferredMemoryShareUrl', 'shareLinkMode', 'sharePreviewStrategy', 'VITE_PUBLIC_SITE_URL', 'VITE_SHARE_LINK_MODE']) {
  if (!routes.includes(token)) fail(`routes 缺少分享链接策略：${token}`);
}

const smokeCheck = read('scripts/smoke-check.mjs');
for (const token of ['playwright-core', 'checkShareMemoryPreview', 'shareMemoryDetail', 'Smoke checks passed', 'parseArgs', 'writeSmokeReport', 'smoke-local-report.json', 'desktopDemo', 'mobileDemo', 'homeActions', 'gallerySearch', 'reportForm', 'authFlow', '--local-only', '--skip-share', '--skip-connected', 'share-memory', 'Preview mode', '首页主操作', '标签筛选', 'checkValidity', '举报表单联系邮箱输入框没有触发浏览器 email 校验', '请先填写邮箱地址', '重置密码和重发确认邮件都需要先提供邮箱。', 'smoke-home.png', 'smoke-home-actions.png', 'smoke-gallery-search.png', 'smoke-viewer.png', 'smoke-report-form.png', 'viewer-tag-button', 'smoke-viewer-tag-filter.png', 'smoke-auth.png', 'smoke-auth-register.png', 'smoke-auth-email-required.png', 'smoke-mobile-home.png', 'smoke-mobile-viewer.png', 'smoke-mobile-auth.png', 'smoke-mobile-auth-register.png', 'smoke-case-study.png', 'smoke-mobile-case-study.png', 'SMOKE_ADMIN_EMAIL', 'SMOKE_ADMIN_SESSION_JSON', 'SMOKE_USER_EMAIL', 'SMOKE_USER_SESSION_JSON', 'storageKeyForSupabaseUrl', 'Cloud linked', '管理后台', '我的空间', '运营管理路径', '项目案例']) {
  if (!smokeCheck.includes(token)) fail(`smoke-check 缺少核心回归覆盖：${token}`);
}

const smokeSession = read('scripts/create-smoke-session.mjs');
for (const token of ['createClient', 'signInWithPassword', 'SMOKE_ADMIN_SESSION_JSON', 'SMOKE_USER_SESSION_JSON', '--role', '--email', '--password']) {
  if (!smokeSession.includes(token)) fail(`create-smoke-session 缺少会话生成能力：${token}`);
}

const smokeDoctor = read('scripts/smoke-doctor.mjs');
for (const token of ['Smoke Doctor', 'checkShareMemoryPreview', 'share-memory 真实预览', 'share-memory OG/Twitter meta', 'VITE_SUPABASE_URL', 'SMOKE_ADMIN_SESSION_JSON', 'SMOKE_USER_SESSION_JSON', '访客桌面端 smoke', '管理员已登录 smoke', 'npm run smoke:session']) {
  if (!smokeDoctor.includes(token)) fail(`smoke-doctor 缺少环境诊断能力：${token}`);
}

const sharePreviewDiagnostics = read('scripts/share-preview-diagnostics.mjs');
for (const token of ['fetchFirstPublicMemoryId', 'checkShareMemoryPreview', 'shareMemoryDetail', 'twitter:card', '服务端分享预览', 'hasCanonical']) {
  if (!sharePreviewDiagnostics.includes(token)) fail(`share-preview-diagnostics 缺少真实分享预览诊断能力：${token}`);
}

const launchDoctor = read('scripts/launch-doctor.mjs');
for (const token of ['Launch Doctor', 'checkShareMemoryPreview', 'share-memory 真实预览', 'share-memory OG/Twitter meta', 'VITE_PUBLIC_SITE_URL', 'VITE_SHARE_LINK_MODE', 'share-memory 云端可达性', 'Supabase Auth site_url / redirect URLs', 'PUBLIC_SITE_URL']) {
  if (!launchDoctor.includes(token)) fail(`launch-doctor 缺少上线自检能力：${token}`);
}

const envExample = read('.env.example');
for (const token of ['SMOKE_ADMIN_EMAIL', 'SMOKE_ADMIN_PASSWORD', 'SMOKE_ADMIN_SESSION_JSON', 'SMOKE_USER_EMAIL', 'SMOKE_USER_PASSWORD', 'SMOKE_USER_SESSION_JSON']) {
  if (!envExample.includes(token)) fail(`.env.example 缺少 smoke 凭据示例：${token}`);
}

const smokeGuide = read('docs/SMOKE_TESTING_GUIDE.md');
for (const token of ['npm run smoke', 'npm run smoke:session', 'SMOKE_ADMIN_SESSION_JSON', 'SMOKE_USER_SESSION_JSON', '桌面端', '认证弹窗', '详情标签筛选回流', '手机视口', 'Cloud linked', 'output/playwright/']) {
  if (!smokeGuide.includes(token)) fail(`SMOKE_TESTING_GUIDE 缺少测试接入说明：${token}`);
}

const manualQaTemplate = read('docs/MANUAL_QA_TEMPLATE.md');
for (const token of ['npm run qa:init', 'npm run qa:doctor', 'docs/manual-qa-runs/', 'QA_AUDIT_STATUS', 'passed', '执行信息', '自动化前置结果', '访客路径', '普通用户路径', '管理员路径', '手机端路径', '分享预览专项', '阻断上线', '最终结论']) {
  if (!manualQaTemplate.includes(token)) fail(`MANUAL_QA_TEMPLATE 缺少手工验收结构：${token}`);
}

const qaInit = read('scripts/create-manual-qa-run.mjs');
for (const token of ['docs/manual-qa-runs', 'MANUAL_QA_TEMPLATE.md', 'QA_AUDIT_STATUS: pending', '--env', '--date', '--slug', '--force', 'npm run qa:init']) {
  if (!qaInit.includes(token)) fail(`create-manual-qa-run 缺少归档生成能力：${token}`);
}

const qaDoctor = read('scripts/qa-doctor.mjs');
for (const token of ['QA Doctor', 'latestManualQaRun', 'analyzeManualQaRun', '--file', '--json', 'QA_AUDIT_STATUS', '未勾选项目', '空白字段', '可作为完成审计证据']) {
  if (!qaDoctor.includes(token)) fail(`qa-doctor 缺少手工 QA 诊断能力：${token}`);
}

const completionAudit = read('scripts/create-completion-audit-report.mjs');
for (const token of ['Completion audit status', 'latestManualQaRun', 'analyzeManualQaRun', 'latestLocalSmokeReport', 'latestLocalSmokeSourceChange', 'smokeReportFresh', 'localSmokeEvidenceSummary', 'smoke-local-report.json', 'authFlow', 'canBeLocalEvidence', 'canBeCompletionEvidence', 'manualQaPassed', 'architecture:doctor', 'product:doctor', 'docs/MASTER_DELIVERY_PLAN.md', '完成定义', 'NOT_COMPLETE', 'COMPLETE', 'release-preflight.md', 'npm run release:preflight -- --strict']) {
  if (!completionAudit.includes(token)) fail(`create-completion-audit-report 缺少完成度审计能力：${token}`);
}

const releasePreflight = read('scripts/create-release-preflight-report.mjs');
for (const token of ['release:preflight', '--strict', 'strictMode', 'stripAnsi', 'Supabase CLI', 'output', 'release', 'npm run verify', 'npm run deploy:doctor', 'npm run launch:doctor', 'npm run smoke:doctor', 'npm run qa:doctor', 'npm run smoke', 'PASS_WITH_WARNINGS', '待处理项', '完成审计证据']) {
  if (!releasePreflight.includes(token)) fail(`create-release-preflight-report 缺少预发布报告能力：${token}`);
}

const architectureDoctor = read('scripts/architecture-doctor.mjs');
for (const token of ['Architecture Doctor', 'featureContracts', 'legacyComponentNames', 'src/styles.css 应只负责分层导入', 'App.jsx 页面编排边界', 'lazyPanels', '结构检查通过']) {
  if (!architectureDoctor.includes(token)) fail(`architecture-doctor 缺少架构诊断能力：${token}`);
}

const productDoctor = read('scripts/product-doctor.mjs');
for (const token of ['Product Doctor', '用户侧路径', '管理侧路径', '数据与权限边界', '验证与交接', 'ViewerReportForm', 'UploadProgressMeter', 'AdminReportsTab', 'memoryQueries.js', 'memoryMutations.js', 'memoryUpload.js']) {
  if (!productDoctor.includes(token)) fail(`product-doctor 缺少产品流程诊断能力：${token}`);
}

const deployDoctor = read('scripts/deploy-doctor.mjs');
for (const token of ['Deploy Doctor', 'Supabase CLI', 'Supabase project ref', 'functions deploy share-memory', 'PUBLIC_SITE_URL', 'share-memory HTML 响应头', 'npm run launch:doctor']) {
  if (!deployDoctor.includes(token)) fail(`deploy-doctor 缺少部署准备诊断能力：${token}`);
}

const lazyPanels = read('src/app/lazyPanels.js');
for (const token of ['lazy(', 'AdminPanel', 'ThemeModal', 'ImageViewer']) {
  if (!lazyPanels.includes(token)) fail(`lazyPanels 缺少按需加载边界：${token}`);
}

const authHook = read('src/hooks/useAuth.js');
for (const token of ['resendConfirmation', 'sendPasswordReset', 'resetPasswordForEmail']) {
  if (!authHook.includes(token)) fail(`useAuth 缺少认证自助能力：${token}`);
}

const authModal = read('src/features/auth/AuthModal.jsx');
for (const token of ['registrationsEnabled', '当前未开放公开注册', 'AuthAccessPolicyCard', 'AuthForm', 'AuthSecondaryActions', 'StatusNotice', 'registrationClosedNotice', 'authModeModel', 'authAccessPolicyModel']) {
  if (!authModal.includes(token)) fail(`AuthModal 缺少认证自助入口：${token}`);
}

const authForm = read('src/features/auth/AuthForm.jsx');
for (const token of ['auth-form', '邮箱', '密码', 'labels.submitLabel']) {
  if (!authForm.includes(token)) fail(`AuthForm 缺少认证表单能力：${token}`);
}

const authSecondaryActions = read('src/features/auth/AuthSecondaryActions.jsx');
for (const token of ['忘记密码', '重发确认邮件', '当前未开放公开注册', 'labels.toggleLabel']) {
  if (!authSecondaryActions.includes(token)) fail(`AuthSecondaryActions 缺少辅助认证动作：${token}`);
}

const authFlowModel = read('src/features/auth/authFlowModel.js');
for (const token of ['authModeModel', 'authAccessPolicyModel', '公开注册开放', '邀请制', 'canToggleMode']) {
  if (!authFlowModel.includes(token)) fail(`authFlowModel 缺少认证入口策略模型：${token}`);
}

const authAccessPolicyCard = read('src/features/auth/AuthAccessPolicyCard.jsx');
for (const token of ['auth-policy-card', '账号入口策略', 'policy.detail']) {
  if (!authAccessPolicyCard.includes(token)) fail(`AuthAccessPolicyCard 缺少认证策略展示能力：${token}`);
}

const galleryFeature = read('src/features/gallery/Gallery.jsx');
for (const token of ['GalleryFilters', 'GalleryManageBar', 'GalleryScopeBar', 'GalleryLoadingCards', 'GalleryEmptyState', 'MemoryCard', 'galleryScopeSummary', 'galleryManageState', 'favoriteIds', 'onShowFavorites']) {
  if (!galleryFeature.includes(token)) fail(`Gallery 缺少 feature 内部边界：${token}`);
}
if (galleryFeature.includes('GalleryQuickFilters')) fail('Gallery 不应恢复冗余的快速浏览层。');

const galleryManageBar = read('src/features/gallery/GalleryManageBar.jsx');
for (const token of ['整理我的图片', '全选当前', '批量删除', '当前范围内共有', 'gallery-manage-notice', 'StatusNotice']) {
  if (!galleryManageBar.includes(token)) fail(`GalleryManageBar 缺少批量整理能力：${token}`);
}

const galleryManageModel = read('src/features/gallery/galleryManageModel.js');
for (const token of ['galleryManageState', 'isCurrentUserScope', 'selectedCount', 'confirmingDelete']) {
  if (!galleryManageModel.includes(token)) fail(`galleryManageModel 缺少批量整理模型：${token}`);
}

const galleryManagementHook = read('src/features/gallery/useGalleryManagement.js');
for (const token of ['useGalleryManagement', 'selectedIds', 'activityById', 'activityTimersRef', 'markActivity', 'toggleSelected', 'selectVisible', 'deleteSelected', 'batchDeleteJourneyNotice']) {
  if (!galleryManagementHook.includes(token)) fail(`useGalleryManagement 缺少画廊整理状态边界：${token}`);
}

const galleryScopeBar = read('src/features/gallery/GalleryScopeBar.jsx');
for (const token of ['gallery-scope-bar', '当前画廊范围', '查看我的收藏', '重置筛选', 'resetPatch', '清除']) {
  if (!galleryScopeBar.includes(token)) fail(`GalleryScopeBar 缺少范围导航能力：${token}`);
}

const galleryScopeModel = read('src/features/gallery/galleryScopeModel.js');
for (const token of ['galleryScopeSummary', 'canShowMyImages', 'canShowFavorites', 'canShowPublic', 'hasRefinedFilters', 'buildGalleryFilterChips']) {
  if (!galleryScopeModel.includes(token)) fail(`galleryScopeModel 缺少范围摘要模型：${token}`);
}

const galleryFilterSummaryModel = read('src/features/gallery/galleryFilterSummaryModel.js');
for (const token of ['buildGalleryFilterChips', 'hasGalleryRefinements', '搜索：', '标签：', '时间：', '排序：', 'resetPatch', 'PUBLIC_MEMORY_SORT_OPTIONS']) {
  if (!galleryFilterSummaryModel.includes(token)) fail(`galleryFilterSummaryModel 缺少可扩展筛选摘要模型：${token}`);
}

const galleryStates = read('src/features/gallery/GalleryStates.jsx');
for (const token of ['StatusNotice', 'galleryEmptyNotice']) {
  if (!galleryStates.includes(token)) fail(`GalleryStates 缺少统一空状态模型：${token}`);
}

const galleryFilters = read('src/features/gallery/GalleryFilters.jsx');
for (const token of ['PUBLIC_MEMORY_SORT_OPTIONS', '标签筛选', '排序', 'sortBy', 'sortDir']) {
  if (!galleryFilters.includes(token)) fail(`GalleryFilters 缺少统一排序模型：${token}`);
}

for (const token of ['上传者 A-Z', '文件最大', '文件最小', 'owner_email', 'file_size_bytes']) {
  if (!memoryContent.includes(token)) fail(`memoryContent 缺少公开排序扩展：${token}`);
}

const featuredMemories = read('src/features/gallery/FeaturedMemories.jsx');
if (!featuredMemories.includes('FeaturedMemoryCard')) {
  fail('FeaturedMemories 未拆出精选卡片子组件。');
}

const memoryCard = read('src/features/gallery/MemoryCard.jsx');
for (const token of ['memoryPresentationModel', 'memory-select', 'memory-activity', 'activityState', 'favorited', 'selectable', 'selected']) {
  if (!memoryCard.includes(token)) fail(`MemoryCard 缺少用户整理态能力：${token}`);
}

const featuredMemoryCard = read('src/features/gallery/FeaturedMemoryCard.jsx');
if (!featuredMemoryCard.includes('memoryPresentationModel')) {
  fail('FeaturedMemoryCard 未接入统一展示摘要模型。');
}

const featuredMemoriesHook = read('src/hooks/useFeaturedMemories.js');
for (const token of ['MEMORY_COLUMNS', 'normalizeMemories', 'isPublicMemory', 'MEMORY_VISIBILITY_PUBLIC']) {
  if (!featuredMemoriesHook.includes(token)) fail(`useFeaturedMemories 未接入统一内容模型：${token}`);
}

const siteSettingsHook = read('src/hooks/useSiteSettings.js');
for (const token of ['uploadBatchMax', 'upload_batch_max', 'DEFAULT_UPLOAD_BATCH_MAX', 'uploadHourLimit', 'upload_hour_limit', 'DEFAULT_UPLOAD_HOUR_LIMIT', 'uploadDayLimit', 'upload_day_limit', 'DEFAULT_UPLOAD_DAY_LIMIT', 'inviteHourLimit', 'invite_hour_limit', 'DEFAULT_INVITE_HOUR_LIMIT', 'inviteDayLimit', 'invite_day_limit', 'DEFAULT_INVITE_DAY_LIMIT', 'uploadsEnabled', 'uploads_enabled', 'registrationsEnabled', 'registrations_enabled']) {
  if (!siteSettingsHook.includes(token)) fail(`useSiteSettings 缺少站点速率配置：${token}`);
}

const uploadModal = read('src/features/upload/UploadModal.jsx');
if (!uploadModal.includes('uploadBatchMax') || uploadModal.includes('MAX_BATCH_FILES')) {
  fail('UploadModal 批量数量仍未完全改为站点配置。');
}
for (const token of ['UploadTagSuggestions', 'UploadBatchList', 'UploadProgressMeter', 'useUploadDraftSelection', 'pendingEntries', 'StatusNotice', 'uploadResultNotice', 'buildUploadDraftSummary', 'uploadDraftBlockedNotice']) {
  if (!uploadModal.includes(token)) fail(`UploadModal 缺少 feature 内部边界：${token}`);
}

const uploadProgressMeter = read('src/features/upload/UploadProgressMeter.jsx');
for (const token of ['upload-progress-meter', 'progressbar', 'aria-valuenow', '上传批次进度']) {
  if (!uploadProgressMeter.includes(token)) fail(`UploadProgressMeter 缺少批次进度能力：${token}`);
}

const uploadBatchList = read('src/features/upload/UploadBatchList.jsx');
for (const token of ['batch-list', 'upload-status', '移除', 'batch-preview', 'uploadFileSizeLabel']) {
  if (!uploadBatchList.includes(token)) fail(`UploadBatchList 缺少批次列表能力：${token}`);
}

const uploadDraftModel = read('src/features/upload/uploadDraftModel.js');
for (const token of ['buildUploadDraftSummary', 'buildUploadProgressModel', 'buildUploadSelectionIssues', 'uploadDraftFileKey', 'uploadDraftEntryIssue', 'uploadFileSizeLabel', 'canSubmit', 'hasLocalBlockers', 'percent', 'actionable', '疑似重复']) {
  if (!uploadDraftModel.includes(token)) fail(`uploadDraftModel 缺少上传草稿摘要能力：${token}`);
}

const uploadUtils = read('src/features/upload/uploadUtils.js');
for (const token of ['buildUploadSelectionIssues', 'selectionEntries', 'localIssue']) {
  if (!uploadUtils.includes(token)) fail(`uploadUtils 缺少上传选择校验接线：${token}`);
}

const uploadDraftSelection = read('src/features/upload/useUploadDraftSelection.js');
for (const token of ['useUploadDraftSelection', 'entriesRef', 'URL.revokeObjectURL', 'buildUploadDraftSummary', 'buildUploadProgressModel', 'replaceSelection', 'pendingEntries']) {
  if (!uploadDraftSelection.includes(token)) fail(`useUploadDraftSelection 缺少上传草稿选择边界：${token}`);
}

const uploadTagSuggestions = read('src/features/upload/UploadTagSuggestions.jsx');
for (const token of ['tag-suggestions', 'tag-chip', 'normalizeTags']) {
  if (!uploadTagSuggestions.includes(token)) fail(`UploadTagSuggestions 缺少标签建议能力：${token}`);
}

const mediaHelper = read('src/lib/memoryMedia.js');
for (const token of ['memoryImageUrl', 'memoryOriginalUrl', 'hydrateMemoryMediaUrls', 'display_url', 'signed_url']) {
  if (!mediaHelper.includes(token)) fail(`图片 URL 适配层缺少：${token}`);
}

const pageMeta = read('src/lib/pageMeta.js');
for (const token of ['memoryMetaModel', 'og:image', 'meta.imageUrl']) {
  if (!pageMeta.includes(token)) fail(`pageMeta 未接入统一内容元信息：${token}`);
  }

for (const file of [
  'src/lib/memoryQueries.js',
  'src/lib/memoryMutations.js',
  'src/hooks/useFeaturedMemories.js',
  'src/hooks/useAdminMemories.js',
  'src/hooks/useAdminOverview.js',
]) {
  if (!read(file).includes('hydrateMemoryMediaUrls') && !read(file).includes('hydrateMemoryMediaUrl')) {
    fail(`图片数据流未接入媒体 URL 补全：${file}`);
  }
}

const mediaUrlsFunction = read('supabase/functions/media-urls/index.ts');
for (const token of ['createSignedUrl', 'visibility_status', 'owner_id', 'admin_users']) {
  if (!mediaUrlsFunction.includes(token)) fail(`media-urls 权限签名函数缺少：${token}`);
}
for (const token of ['SUPABASE_PUBLIC_URL', 'API_EXTERNAL_URL', 'x-forwarded-host', 'isInternalHost', 'normalizedPublicOrigin', 'rewritePublicStorageUrl', 'publicObjectUrl', '/storage/v1/object/']) {
  if (!mediaUrlsFunction.includes(token)) fail(`media-urls 自托管公网 URL 改写缺少：${token}`);
}
if (!mediaUrlsFunction.includes("row.storage_path ? '' : row.image_url")) {
  fail('media-urls 不应在有 storage_path 时回退到可伪造 image_url。');
}
const memoryMedia = read('src/lib/memoryMedia.js');
for (const token of ['isInternalSupabaseUrl', "parsed.hostname === 'wsrv.nl'", 'isUnsafeStorageUrl']) {
  if (!memoryMedia.includes(token)) fail(`前端媒体 URL 兜底缺少：${token}`);
}

const manageMemoriesFunction = read('supabase/functions/manage-memories/index.ts');
for (const token of ['createSignedUrl', 'storage_path', 'HEAD']) {
  if (!manageMemoriesFunction.includes(token)) fail(`manage-memories 私有 bucket 回填逻辑缺少：${token}`);
}

const privateStorageMigration = read('supabase/migrations/202605240010_private_storage_bucket.sql');
if (!privateStorageMigration.includes('public = false')) {
  fail('Storage 私有化迁移未关闭 bucket public。');
}

const restrictStorageSelectMigration = read('supabase/migrations/202605240011_restrict_storage_object_select.sql');
for (const token of ['drop policy if exists "Anyone can view ATRI images"', 'to authenticated', 'public.is_admin', 'storage.foldername']) {
  if (!restrictStorageSelectMigration.includes(token)) fail(`Storage 直读收紧迁移缺少：${token}`);
}

const adminPanel = read('src/features/admin/AdminPanel.jsx');
const adminPanelTabContent = read('src/features/admin/AdminPanelTabContent.jsx');
const adminPanelMessages = read('src/features/admin/AdminPanelMessages.jsx');
const adminPanelFilters = read('src/features/admin/useAdminPanelFilters.js');
const adminPanelSurface = `${adminPanel}\n${adminPanelTabContent}\n${adminPanelMessages}\n${adminPanelFilters}`;
for (const token of ['useAdminOverview', 'useAdminMemorySelection', 'useAdminSettingsForm', 'useAdminPanelFilters', 'overviewSummary', 'adminTagOptions', 'AdminChrome', 'AdminPanelMessages', 'AdminPanelTabContent', 'AdminImagesTab', 'AdminOverviewTab', 'AdminUsersTab', 'AdminReportsTab', 'AdminLogsTab', 'AdminSettingsTab']) {
  if (!adminPanelSurface.includes(token)) fail(`AdminPanel 缺少运维概览入口：${token}`);
}
for (const token of ['downloadProgress', 'overviewError', 'adminMemoryError', 'settingsMessage']) {
  if (!adminPanelMessages.includes(token)) fail(`AdminPanelMessages 缺少后台反馈边界：${token}`);
}
for (const token of ['filterAdminUsers', 'buildAdminUserSegments', 'filterAdminReports', 'buildAdminReportQueueSummary', 'filterAdminLogs', 'buildAdminLogSummary', 'reportStatus', 'filteredUsers', 'filteredReports', 'filteredLogs']) {
  if (!adminPanelFilters.includes(token)) fail(`useAdminPanelFilters 缺少后台筛选边界：${token}`);
}

const adminMemorySelection = read('src/features/admin/useAdminMemorySelection.js');
for (const token of ['useAdminMemorySelection', 'selectedMemories', 'confirmingDelete', 'selectVisible', 'clearSelection', 'removeSelectedIds']) {
  if (!adminMemorySelection.includes(token)) fail(`useAdminMemorySelection 缺少后台图片选择边界：${token}`);
}

const adminSettingsForm = read('src/features/admin/useAdminSettingsForm.js');
for (const token of ['useAdminSettingsForm', 'normalizeTags', 'tagsToText', 'uploadHourLimit', 'inviteDayLimit', 'registrationsEnabled', 'payload', 'clearMessage']) {
  if (!adminSettingsForm.includes(token)) fail(`useAdminSettingsForm 缺少后台设置表单边界：${token}`);
}

const adminChrome = read('src/features/admin/AdminChrome.jsx');
for (const token of ['adminTabs', '管理后台页签', 'admin-stats', 'adminChromeSummaryItems']) {
  if (!adminChrome.includes(token)) fail(`AdminChrome 缺少后台顶层导航：${token}`);
}

const adminImagesTab = read('src/features/admin/AdminImagesTab.jsx');
for (const token of ['批量下载 ZIP', '回填大小', '全部标签', 'tagOptions', 'onUpdateAdminFilters', 'memoryPresentationModel', 'reportSummaryLabel', '待处理举报']) {
  if (!adminImagesTab.includes(token)) fail(`AdminImagesTab 缺少图片管理模块：${token}`);
}

const adminOverviewTab = read('src/features/admin/AdminOverviewTab.jsx');
for (const token of ['最近上传', 'onOpenImagesTab', 'onOpenReportsTab', 'onOpenSettingsTab', 'memoryPresentationModel', 'reportSummaryLabel', 'overviewMetricCards', 'buildRuntimeMonitoringItems', 'runtimeMonitoringHeadline', '运行监控', 'buildSiteHealthChecks', 'healthHeadline', '站点健康检查', '注册与邀请信号', 'buildAuthAnomalySignals', 'authSignalHeadline', 'buildLaunchReadinessChecks', 'launchReadinessHeadline', '上线准备', '数据留存与清理', 'retentionActionQueue', 'retentionHeadline']) {
  if (!adminOverviewTab.includes(token)) fail(`AdminOverviewTab 缺少概览模块：${token}`);
}

const adminUsersTab = read('src/features/admin/AdminUsersTab.jsx');
for (const token of ['邀请用户', '发送邀请', '邀请中', 'inviteLimitSummary', 'inviteUsageSummary', '已达发送上限', 'admin-user-segments', '用户状态分组', 'aria-pressed', 'userSegments']) {
  if (!adminUsersTab.includes(token)) fail(`AdminUsersTab 缺少用户管理模块：${token}`);
}

const adminSettingsTab = read('src/features/admin/AdminSettingsTab.jsx');
const adminSettingsSections = read('src/features/admin/AdminSettingsSections.jsx');
const adminSettingsSurface = `${adminSettingsTab}\n${adminSettingsSections}`;
for (const token of ['上线准备', 'launchConfigItems', 'launchReadinessHeadline', '登录配置提醒', '公开注册策略', '站点入口地址', 'buildSiteHealthChecks', 'readinessChecks', '站点健康检查', 'backupAssets', 'backupRecoveryPlan', '导出与备份策略', 'monitoringMetricDefinitions', 'buildRuntimeMonitoringItems', '运行监控口径', 'retentionAssets', 'retentionActionQueue', '数据留存与清理策略', 'abuseGuardrails', 'abuseGaps', '反滥用与频率限制口径', '当前缺口与下一步', '每小时上传上限（张）', '每日上传上限（张）', '每小时邀请上限（封）', '每日邀请上限（封）']) {
  if (!adminSettingsSurface.includes(token)) fail(`AdminSettingsTab 缺少站点设置模块：${token}`);
}
for (const token of ['SettingsFields', 'SettingsTagPreview', 'SettingsLaunchReadiness', 'SettingsAuthReminder', 'SettingsOperationsPanel', 'HealthCheckList', 'AdminDisclosureSection']) {
  if (!adminSettingsSurface.includes(token)) fail(`AdminSettingsTab 缺少设置 section 边界：${token}`);
}

const manageOverview = read('supabase/functions/manage-overview/index.ts');
for (const token of ['uploaded_24h', 'recent_memories', 'recent_logs', 'disabled_upload_users', 'hidden_count', 'open_reports_count', 'resolved_reports_count', 'dismissed_reports_count', 'invited_pending_users', 'registrations_enabled', 'uploads_enabled', 'supabase.auth.admin.listUsers', 'report_summary', 'registrations_24h', 'invites_sent_24h', 'recent_unconfirmed_registrations_24h', 'stale_invited_pending_users']) {
  if (!manageOverview.includes(token)) fail(`manage-overview 缺少概览数据：${token}`);
}

const shareMemory = read('supabase/functions/share-memory/index.ts');
for (const token of ['PUBLIC_SITE_URL', 'og:title', 'twitter:card', 'memoryAppUrl', 'share-memory', 'MEMORY_VISIBILITY_PUBLIC', 'HTML_CONTENT_TYPE', 'content-type', 'nosniff']) {
  if (!shareMemory.includes(token)) fail(`share-memory 缺少服务端分享预览能力：${token}`);
}
if (shareMemory.includes('../../../src/')) {
  fail('share-memory 仍错误依赖前端 src 模块，Supabase 云端打包会失败。');
}

const manageMemories = read('supabase/functions/manage-memories/index.ts');
for (const token of ['report_summary', 'memory_reports', 'attachReportSummaries']) {
  if (!manageMemories.includes(token)) fail(`manage-memories 缺少图片举报汇总：${token}`);
}

const manageUsers = read('supabase/functions/manage-users/index.ts');
for (const token of ['set-upload-policy', 'upload_limit_total', 'update_user_upload_policy', 'invite-user', 'inviteUserByEmail', 'invited_at', 'admin_invite_policy_state', 'invite_policy', 'invite_rate_limited']) {
  if (!manageUsers.includes(token)) fail(`manage-users 缺少用户与邀请治理策略：${token}`);
}

const uploadPolicyMigration = read('supabase/migrations/202605240008_user_upload_policy.sql');
for (const token of ['can_upload_memory', 'upload_limit_total', 'update_user_upload_policy']) {
  if (!uploadPolicyMigration.includes(token)) fail(`上传策略迁移缺少：${token}`);
}

const globalUploadSettingMigration = read('supabase/migrations/202605240012_global_upload_setting.sql');
for (const token of ['uploads_enabled', 'can_upload_memory', 'public.is_admin']) {
  if (!globalUploadSettingMigration.includes(token)) fail(`全站上传开关迁移缺少：${token}`);
}

const registrationSettingMigration = read('supabase/migrations/202605240014_registration_setting.sql');
for (const token of ['registrations_enabled', 'site_settings']) {
  if (!registrationSettingMigration.includes(token)) fail(`公开注册开关迁移缺少：${token}`);
}

const inviteAuditMigration = read('supabase/migrations/202605240015_invite_user_audit_action.sql');
for (const token of ['invite_user', 'admin_audit_logs_action_check']) {
  if (!inviteAuditMigration.includes(token)) fail(`邀请用户审计迁移缺少：${token}`);
}

const reportsHook = read('src/hooks/useReports.js');
for (const token of ['submit-report', 'manage-reports', 'REPORT_REASON_OPTIONS', 'normalizeReport', 'reporter_email', 'readFunctionErrorPayload', 'reportSubmissionErrorMessage']) {
  if (!reportsHook.includes(token)) fail(`useReports 缺少举报工作流：${token}`);
}

const imageViewer = read('src/features/viewer/ImageViewer.jsx');
for (const token of ['hasPrevious', 'hasNext', 'ArrowLeft', 'ArrowRight', 'useViewerEditForm', 'useViewerReportForm', 'interactionLocked', 'editForm.visibilityStatus', '加入收藏', '取消收藏', 'favoriteNotice', '举报图片', 'ViewerEditForm', 'ViewerInfoGrid', 'ViewerLinkActions', 'ViewerReportForm', 'memoryDetailModel', 'linkActions', 'action.text', 'viewer-tag-button', 'onSelectTag', 'viewer-governance', 'reportSummaryLabel', '删除后会自动切换到当前整理序列里的相邻图片']) {
  if (!imageViewer.includes(token)) fail(`ImageViewer 缺少大图导航能力：${token}`);
}

const viewerEditModel = read('src/features/viewer/useViewerEditForm.js');
for (const token of ['useViewerEditForm', 'continueDirection', 'normalizeTags', 'tagsToText', 'visibilityStatus', 'onUpdate', 'onNext']) {
  if (!viewerEditModel.includes(token)) fail(`useViewerEditForm 缺少查看器编辑状态边界：${token}`);
}

const viewerReportModel = read('src/features/viewer/useViewerReportForm.js');
for (const token of ['useViewerReportForm', 'reportReasons', 'useReports', 'reporterEmail', 'submitReport', '联系邮箱格式不正确', '举报已提交']) {
  if (!viewerReportModel.includes(token)) fail(`useViewerReportForm 缺少查看器举报状态边界：${token}`);
}

const viewerInfoGrid = read('src/features/viewer/ViewerInfoGrid.jsx');
for (const token of ['viewer-info-grid', '图片信息摘要', 'dt', 'dd']) {
  if (!viewerInfoGrid.includes(token)) fail(`ViewerInfoGrid 缺少详情摘要展示能力：${token}`);
}

const viewerLinkActions = read('src/features/viewer/ViewerLinkActions.jsx');
for (const token of ['viewer-link-actions', '复制链接', 'onCopy', 'action.url']) {
  if (!viewerLinkActions.includes(token)) fail(`ViewerLinkActions 缺少详情链接动作：${token}`);
}

const adminReportsTab = read('src/features/admin/AdminReportsTab.jsx');
for (const token of ['memoryPresentationModel', 'reportStatusTone', 'reportStatusLabel', 'ADMIN_REPORT_REASON_FILTERS', '举报队列摘要', '搜索举报']) {
  if (!adminReportsTab.includes(token)) fail(`AdminReportsTab 缺少统一举报图片摘要：${token}`);
}

for (const token of ['UserProfileForm', 'UserSummaryStats', 'UserTagStatsCard', 'UserUploadPolicyCard', 'userDisplayName']) {
  if (!userPanel.includes(token)) fail(`UserPanel 缺少 feature 内部边界：${token}`);
}
for (const token of ['StatusNotice', 'uploadDisabledNotice', 'profileSavedNotice', 'UserGalleryScopeCard', 'UserOnboardingCard', 'userSummaryStatsModel', 'userUploadPolicyModel', 'onboarding']) {
  if (!userPanel.includes(token)) fail(`UserPanel 缺少统一用户反馈入口：${token}`);
}

const userGalleryScopeCard = read('src/features/user/UserGalleryScopeCard.jsx');
for (const token of ['当前画廊范围', 'scope-pill', '返回全部公开', '切到我的图片', '查看我的收藏']) {
  if (!userGalleryScopeCard.includes(token)) fail(`UserGalleryScopeCard 缺少用户范围卡片能力：${token}`);
}

const userOnboardingCard = read('src/features/user/UserOnboardingCard.jsx');
for (const token of ['下一步', 'userOnboardingNotice', 'open-upload', 'show-public', 'reset-my-images']) {
  if (!userOnboardingCard.includes(token)) fail(`UserOnboardingCard 缺少 onboarding 展示能力：${token}`);
}

const userTagStatsCard = read('src/features/user/UserTagStatsCard.jsx');
for (const token of ['常用标签', '常用标签快捷筛选', 'onSelectTag', 'userTagStatsEmptyNotice']) {
  if (!userTagStatsCard.includes(token)) fail(`UserTagStatsCard 缺少用户标签快捷筛选：${token}`);
}

const userUploadPolicyCard = read('src/features/user/UserUploadPolicyCard.jsx');
for (const token of ['上传权限', '上传额度和限速', '打开上传', '可上传', '受限']) {
  if (!userUploadPolicyCard.includes(token)) fail(`UserUploadPolicyCard 缺少上传权限摘要：${token}`);
}

const userProfileForm = read('src/features/user/UserProfileForm.jsx');
for (const token of ['profile-form', '显示名', '简介']) {
  if (!userProfileForm.includes(token)) fail(`UserProfileForm 缺少资料编辑能力：${token}`);
}

const userSummaryStats = read('src/features/user/UserSummaryStats.jsx');
for (const token of ['user-summary-grid', 'stats.map', 'small']) {
  if (!userSummaryStats.includes(token)) fail(`UserSummaryStats 缺少个人统计能力：${token}`);
}

const adminUsersModel = read('src/features/admin/adminUsersModel.js');
for (const token of ['ADMIN_USER_SEGMENTS', 'buildAdminUserSegments', 'filterAdminUsers', 'blocked-upload', 'limited-upload']) {
  if (!adminUsersModel.includes(token)) fail(`adminUsersModel 缺少用户分组过滤模型：${token}`);
}

const adminReportsModel = read('src/features/admin/adminReportsModel.js');
for (const token of ['ADMIN_REPORT_REASON_FILTERS', 'buildAdminReportQueueSummary', 'filterAdminReports', 'missingMemoryCount', 'anonymousCount']) {
  if (!adminReportsModel.includes(token)) fail(`adminReportsModel 缺少举报队列模型：${token}`);
}

const adminLogsTab = read('src/features/admin/AdminLogsTab.jsx');
for (const token of ['ADMIN_LOG_ACTION_FILTERS', '操作日志摘要', '搜索日志', 'logSummary']) {
  if (!adminLogsTab.includes(token)) fail(`AdminLogsTab 缺少操作日志过滤入口：${token}`);
}

const adminLogsModel = read('src/features/admin/adminLogsModel.js');
for (const token of ['ADMIN_LOG_ACTION_FILTERS', 'buildAdminLogSummary', 'filterAdminLogs', 'actorCount', 'actionCounts']) {
  if (!adminLogsModel.includes(token)) fail(`adminLogsModel 缺少操作日志模型：${token}`);
}

const viewerEditForm = read('src/features/viewer/ViewerEditForm.jsx');
for (const token of ['公开展示', '设为首页精选', 'edit-form', '保存并下一张', 'hasNext', 'onSubmitAndNext']) {
  if (!viewerEditForm.includes(token)) fail(`ViewerEditForm 缺少编辑表单能力：${token}`);
}

const viewerReportForm = read('src/features/viewer/ViewerReportForm.jsx');
for (const token of ['report-form', '举报原因', '联系邮箱（可选）', '提交举报']) {
  if (!viewerReportForm.includes(token)) fail(`ViewerReportForm 缺少举报表单能力：${token}`);
}

const updateMemory = read('supabase/functions/update-memory/index.ts');
if (!updateMemory.includes('isAdmin') || !updateMemory.includes('is_featured') || !updateMemory.includes('visibility_status')) {
  fail('update-memory 未体现管理员精选/可见性字段控制。');
}

const manageReports = read('supabase/functions/manage-reports/index.ts');
for (const token of ['resolve_report', 'memory_reports', 'action === \'list\'', 'action === \'update\'']) {
  if (!manageReports.includes(token)) fail(`manage-reports 缺少举报管理能力：${token}`);
}

const submitReport = read('supabase/functions/submit-report/index.ts');
for (const token of ['memory_reports', 'reporter_email', 'visibility_status', 'allowedReasons', 'REPORT_BURST_LIMIT', 'SAME_MEMORY_COOLDOWN_MS', 'reporter_fingerprint', 'buildReporterFingerprint', 'duplicate_open_report', 'memory_report_cooldown', 'report_rate_limited']) {
  if (!submitReport.includes(token)) fail(`submit-report 缺少举报提交能力：${token}`);
}

const reportMigration = read('supabase/migrations/202605240013_memory_reports.sql');
for (const token of ['memory_reports', 'resolve_report', 'status text not null default \'open\'', 'reporter_email']) {
  if (!reportMigration.includes(token)) fail(`举报迁移缺少：${token}`);
}

const reportRateLimitMigration = read('supabase/migrations/202605240016_report_rate_limits.sql');
for (const token of ['reporter_fingerprint', 'memory_reports_reporter_fingerprint_created_at_idx', 'memory_reports_open_reporter_memory_key']) {
  if (!reportRateLimitMigration.includes(token)) fail(`举报限频迁移缺少：${token}`);
}

const uploadRateWindowMigration = read('supabase/migrations/202605240017_upload_rate_windows.sql');
for (const token of ['upload_hour_limit', 'upload_day_limit', 'upload_policy_state', 'allows_upload', 'upload_hour_count', 'upload_day_count']) {
  if (!uploadRateWindowMigration.includes(token)) fail(`上传时间窗口迁移缺少：${token}`);
}

const inviteRateWindowMigration = read('supabase/migrations/202605240019_invite_rate_windows.sql');
for (const token of ['invite_hour_limit', 'invite_day_limit', 'admin_invite_policy_state', 'allows_invite', 'invite_hour_count', 'invite_day_count', 'invite_user']) {
  if (!inviteRateWindowMigration.includes(token)) fail(`邀请时间窗口迁移缺少：${token}`);
}

const invitePolicyExecMigration = read('supabase/migrations/202605240020_restrict_admin_invite_policy_exec.sql');
for (const token of ['admin_invite_policy_state', 'from public', 'from anon', 'from authenticated', 'to authenticated', 'to service_role']) {
  if (!invitePolicyExecMigration.includes(token)) fail(`邀请策略执行权限迁移缺少：${token}`);
}

const visibilityMigration = read('supabase/migrations/202605240009_memory_visibility.sql');
for (const token of ['visibility_status', 'hidden', 'owner_id = auth.uid()', 'public.is_admin']) {
  if (!visibilityMigration.includes(token)) fail(`可见性迁移缺少：${token}`);
}

const restrictMigration = read('supabase/migrations/202605240006_restrict_memory_column_updates.sql');
if (!restrictMigration.includes('grant update (title, caption, tags)')) {
  fail('列级 UPDATE 权限迁移未限制为 title/caption/tags。');
}

const adminHardeningMigration = read('supabase/migrations/20260603015309_harden_admin_and_featured_insert_policies.sql');
for (const token of [
  'create or replace function public.is_admin()',
  'revoke all on function public.is_admin(uuid) from authenticated',
  'grant execute on function public.is_admin() to anon, authenticated, service_role',
  'coalesce(is_featured, false) = false',
  'create or replace function public.upload_policy_state(check_user_id uuid)',
  'create or replace function public.admin_invite_policy_state(check_user_id uuid)',
]) {
  if (!adminHardeningMigration.includes(token)) fail(`管理员加固迁移缺少：${token}`);
}

const blogCommentHardeningMigration = read('supabase/migrations/202606260001_harden_media_and_blog_comments.sql');
for (const token of [
  'storage_path ~',
  'right(',
  'drop policy if exists "Anyone can insert comments"',
  'Service role can insert comments',
  'reporter_fingerprint',
  'submit_blog_comment',
  'blog_comment_rate_limited',
]) {
  if (!blogCommentHardeningMigration.includes(token)) fail(`媒体/博客评论加固迁移缺少：${token}`);
}

const blogModel = read('src/app/useBlogPageModel.js');
for (const token of ['submit-blog-comment', 'setEditorError(`博客保存失败', 'setError(`博客删除失败', 'useCallback(async (postData)']) {
  if (!blogModel.includes(token)) fail(`博客模型缺少失败显式处理：${token}`);
}
if (/saving locally|deleting locally|inserting locally/.test(blogModel)) {
  fail('博客模型在 Supabase 模式下不应静默保存到 localStorage。');
}

const readme = read('README.md');
for (const phrase of ['公开画廊', '图片查看器', '账号空间', '批量上传', '内容治理', '管理后台', '响应式体验', '本地质量检查', 'React 19', 'Vite 6', 'Supabase JS', 'Edge Functions', 'Playwright Core', 'npm run project:check', 'npm run deploy:aliyun', 'VITE_PUBLIC_SITE_URL', 'VITE_SHARE_LINK_MODE', 'SMOKE_ADMIN_*', 'ALIYUN_*', 'your-site.example.com', 'docs/GIT_WORKFLOW.md', 'docs/SITE_ARCHITECTURE_PLAN.md', 'docs/SMOKE_TESTING_GUIDE.md', '公开仓库注意事项']) {
  if (!readme.includes(phrase)) fail(`README 缺少说明：${phrase}`);
}

const plan = read('docs/SITE_ARCHITECTURE_PLAN.md');
for (const phrase of ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Phase 5', '举报']) {
  if (!plan.includes(phrase)) fail(`架构规划缺少阶段：${phrase}`);
}

if (failures.length) {
  console.error('质量检查失败：');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log('质量检查通过。');
