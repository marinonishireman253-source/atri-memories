import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const warnings = [];

function pathFor(file) {
  return join(root, file);
}

function read(file) {
  return readFileSync(pathFor(file), 'utf8');
}

function exists(file) {
  return existsSync(pathFor(file));
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function walk(dir, files = []) {
  for (const entry of readdirSync(pathFor(dir))) {
    if (entry === 'node_modules' || entry === 'dist' || entry === 'output') continue;
    const full = join(pathFor(dir), entry);
    const rel = relative(root, full);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(rel, files);
    } else {
      files.push(rel);
    }
  }
  return files;
}

function lineCount(file) {
  return read(file).split('\n').length;
}

function statusLine(ok, label, detail) {
  const prefix = ok ? '[OK]' : '[FAIL]';
  process.stdout.write(`${prefix} ${label}${detail ? `: ${detail}` : ''}\n`);
}

const featureContracts = [
  {
    name: 'gallery',
    files: ['Gallery.jsx', 'GalleryFilters.jsx', 'GalleryScopeBar.jsx', 'MemoryCard.jsx', 'gallery.css'],
    models: ['galleryFilterSummaryModel.js', 'galleryScopeModel.js', 'useGalleryManagement.js'],
  },
  {
    name: 'viewer',
    files: ['ImageViewer.jsx', 'ViewerEditForm.jsx', 'ViewerInfoGrid.jsx', 'ViewerLinkActions.jsx', 'ViewerReportForm.jsx', 'viewer.css'],
    models: ['viewerFormatters.js', 'useViewerEditForm.js', 'useViewerReportForm.js'],
  },
  {
    name: 'upload',
    files: ['UploadModal.jsx', 'UploadBatchList.jsx', 'UploadProgressMeter.jsx', 'UploadTagSuggestions.jsx', 'upload.css'],
    models: ['uploadDraftModel.js', 'uploadUtils.js', 'useUploadDraftSelection.js'],
  },
  {
    name: 'auth',
    files: ['AuthModal.jsx', 'AuthForm.jsx', 'AuthSecondaryActions.jsx', 'AuthAccessPolicyCard.jsx', 'auth.css'],
    models: ['authFlowModel.js'],
  },
  {
    name: 'user',
    files: ['UserPanel.jsx', 'UserProfileForm.jsx', 'UserSummaryStats.jsx', 'UserTagStatsCard.jsx', 'UserUploadPolicyCard.jsx', 'user.css'],
    models: ['userFormatters.js'],
  },
  {
    name: 'admin',
    files: ['AdminPanel.jsx', 'AdminChrome.jsx', 'AdminImagesTab.jsx', 'AdminUsersTab.jsx', 'AdminReportsTab.jsx', 'AdminLogsTab.jsx', 'AdminSettingsTab.jsx', 'AdminPanelMessages.jsx', 'AdminPanelTabContent.jsx', 'admin.css'],
    models: ['adminLogsModel.js', 'adminReportsModel.js', 'adminUsersModel.js', 'useAdminPanelFilters.js', 'useAdminMemorySelection.js', 'useAdminSettingsForm.js'],
  },
];

const requiredTopLevel = ['src/app', 'src/features', 'src/components', 'src/hooks', 'src/lib', 'src/data', 'src/styles'];
for (const dir of requiredTopLevel) {
  if (!exists(dir)) fail(`缺少目标架构目录：${dir}`);
}

for (const feature of featureContracts) {
  const base = `src/features/${feature.name}`;
  if (!exists(base)) {
    fail(`缺少 feature 目录：${base}`);
    continue;
  }
  for (const file of [...feature.files, ...feature.models]) {
    const target = `${base}/${file}`;
    if (!exists(target)) fail(`feature ${feature.name} 缺少边界文件：${target}`);
  }
}

const legacyComponentNames = [
  'AdminPanel.jsx',
  'AuthModal.jsx',
  'FeaturedMemories.jsx',
  'Gallery.jsx',
  'ImageViewer.jsx',
  'UploadModal.jsx',
  'UserPanel.jsx',
];
for (const name of legacyComponentNames) {
  if (exists(`src/components/${name}`)) fail(`业务组件退回 components：src/components/${name}`);
}

const stylesEntry = read('src/styles.css');
const styleLines = stylesEntry
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);
const nonImportLines = styleLines.filter((line) => !line.startsWith('@import '));
if (nonImportLines.length) {
  fail('src/styles.css 应只负责分层导入，不应继续承载具体样式。');
}
for (const feature of featureContracts) {
  const expectedImport = `@import "./features/${feature.name}/${feature.name}.css";`;
  if (!stylesEntry.includes(expectedImport)) fail(`样式入口缺少 feature 导入：${expectedImport}`);
}
for (const expectedImport of [
  '@import "./styles/foundation.css";',
  '@import "./styles/app-shell.css";',
  '@import "./styles/responsive.css";',
]) {
  if (!stylesEntry.includes(expectedImport)) fail(`样式入口缺少基础层导入：${expectedImport}`);
}

const appFile = read('src/App.jsx');
if (lineCount('src/App.jsx') > 120) fail('App.jsx 已超过 120 行，页面编排边界可能重新膨胀。');
for (const forbidden of ['useMemories(', 'useAdmin', 'supabase', 'createClient']) {
  if (appFile.includes(forbidden)) fail(`App.jsx 出现跨层业务实现：${forbidden}`);
}
for (const token of ['useHomePageModel', 'AppOverlays', 'GalleryPageRoute', 'DailyPageRoute']) {
  if (!appFile.includes(token)) fail(`App.jsx 缺少 app 层编排 token：${token}`);
}

const lazyPanels = read('src/app/lazyPanels.js');
for (const token of [
  '../features/admin/AdminPanel.jsx',
  '../features/auth/AuthModal.jsx',
  '../features/viewer/ImageViewer.jsx',
  '../features/upload/UploadModal.jsx',
  '../features/user/UserPanel.jsx',
]) {
  if (!lazyPanels.includes(token)) fail(`lazyPanels 缺少 feature 懒加载入口：${token}`);
}

const featureFiles = walk('src/features').filter((file) => /\.(js|jsx)$/.test(file));
for (const file of featureFiles) {
  const content = read(file);
  if (/from ['"]\.\.\/\.\.\/features\//.test(content)) {
    warn(`feature 之间存在直接跨 feature import，扩展前确认是否应下沉到 lib/hooks：${file}`);
  }
}

const sizeWatch = [
  ['src/features/admin/AdminPanel.jsx', 650],
  ['src/features/viewer/ImageViewer.jsx', 520],
  ['src/features/admin/admin.css', 1100],
  ['src/features/gallery/gallery.css', 820],
];
for (const [file, maxLines] of sizeWatch) {
  const lines = lineCount(file);
  if (lines > maxLines) {
    warn(`${file} 当前 ${lines} 行，超过 ${maxLines} 行；下一轮扩展前优先继续拆分。`);
  }
}

process.stdout.write('Architecture Doctor\n');
process.stdout.write('===================\n');
statusLine(failures.length === 0, 'Phase 1 feature 边界', `${featureContracts.length} 个 feature 合约`);
statusLine(nonImportLines.length === 0, '样式入口分层', 'src/styles.css');
statusLine(!legacyComponentNames.some((name) => exists(`src/components/${name}`)), '业务组件迁出 components', 'legacy component check');
statusLine(lineCount('src/App.jsx') <= 120, 'App.jsx 页面编排边界', `${lineCount('src/App.jsx')} 行`);

if (warnings.length) {
  process.stdout.write('\n后续关注\n');
  process.stdout.write('--------\n');
  for (const item of warnings) process.stdout.write(`- ${item}\n`);
}

if (failures.length) {
  process.stdout.write('\n结构阻断\n');
  process.stdout.write('--------\n');
  for (const item of failures) process.stdout.write(`- ${item}\n`);
  process.exit(1);
}

process.stdout.write('\n结构检查通过。\n');
