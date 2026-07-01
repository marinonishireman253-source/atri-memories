import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeManualQaRun, latestManualQaRun } from './qa-doctor.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportsDir = join(root, 'output', 'release');

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function exists(path) {
  return existsSync(join(root, path));
}

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function latestReleasePreflight() {
  if (!exists('output/release')) return null;
  const files = readdirSync(reportsDir)
    .filter((name) => name.endsWith('-release-preflight.md'))
    .map((name) => {
      const path = join(reportsDir, name);
      return { name, path, mtimeMs: statSync(path).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return files[0] ?? null;
}

function walkFiles(dir, files = []) {
  for (const entry of readdirSync(join(root, dir))) {
    if (entry === 'node_modules' || entry === 'dist' || entry === 'output') continue;
    const fullPath = join(root, dir, entry);
    const relativePath = relative(root, fullPath);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walkFiles(relativePath, files);
    } else {
      files.push(relativePath);
    }
  }
  return files;
}

function latestLocalSmokeSourceChange() {
  const candidates = [
    ...walkFiles('src'),
    ...walkFiles('public'),
    'index.html',
    'package.json',
    'scripts/smoke-check.mjs',
  ].filter((path) => exists(path));

  return candidates
    .map((path) => ({
      path,
      mtimeMs: statSync(join(root, path)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0] ?? null;
}

function latestLocalSmokeReport() {
  const path = join(root, 'output', 'playwright', 'smoke-local-report.json');
  if (!existsSync(path)) return null;

  try {
    const report = JSON.parse(readFileSync(path, 'utf8'));
    const latestSource = latestLocalSmokeSourceChange();
    const generatedAtMs = Date.parse(report.generatedAt ?? '');
    const smokeReportFresh =
      Number.isFinite(generatedAtMs)
      && (!latestSource || generatedAtMs + 1000 >= latestSource.mtimeMs);
    const artifacts = Array.isArray(report.artifacts) ? report.artifacts : [];
    const missingArtifacts = artifacts.filter((artifact) => !artifact.exists || artifact.sizeBytes <= 0);
    const requiredArtifactNames = [
      'smoke-home.png',
      'smoke-home-actions.png',
      'smoke-gallery-search.png',
      'smoke-viewer.png',
      'smoke-report-form.png',
      'smoke-viewer-tag-filter.png',
      'smoke-auth.png',
      'smoke-auth-register.png',
      'smoke-auth-email-required.png',
      'smoke-mobile-home.png',
      'smoke-mobile-viewer.png',
      'smoke-mobile-auth.png',
      'smoke-mobile-auth-register.png',
    ];
    const artifactNames = new Set(artifacts.map((artifact) => artifact.name));
    const missingRequired = requiredArtifactNames.filter((name) => !artifactNames.has(name));

    return {
      path,
      relativePath: relative(root, path),
      report,
      latestSource,
      smokeReportFresh,
      canBeLocalEvidence:
        report.status === 'passed'
        && report.checks?.desktopDemo === 'passed'
        && report.checks?.mobileDemo === 'passed'
        && report.checks?.homeActions === 'passed'
        && report.checks?.gallerySearch === 'passed'
        && report.checks?.reportForm === 'passed'
        && report.checks?.authFlow === 'passed'
        && smokeReportFresh
        && missingArtifacts.length === 0
        && missingRequired.length === 0,
      missingArtifacts,
      missingRequired,
    };
  } catch {
    return {
      path,
      relativePath: relative(root, path),
      report: null,
      latestSource: latestLocalSmokeSourceChange(),
      smokeReportFresh: false,
      canBeLocalEvidence: false,
      missingArtifacts: [],
      missingRequired: [],
    };
  }
}

function statusLabel(status) {
  return {
    proven: '已证明',
    basic: '基础可用',
    partial: '部分证明',
    missing: '缺证据',
    blocked: '外部未完成',
  }[status] ?? status;
}

function row(item) {
  return `| ${item.requirement} | ${statusLabel(item.status)} | ${item.evidence} | ${item.gap} |`;
}

const packageJson = JSON.parse(read('package.json'));
const scripts = packageJson.scripts ?? {};
const plan = read('docs/MASTER_DELIVERY_PLAN.md');
const quality = read('scripts/quality-check.mjs');
const hasProductDoctor = Boolean(scripts['product:doctor']) && exists('scripts/product-doctor.mjs');
const preflightFile = latestReleasePreflight();
const preflight = preflightFile ? read(relative(root, preflightFile.path)) : '';
const manualQaRun = latestManualQaRun();
const manualQaAnalysis = manualQaRun ? analyzeManualQaRun(manualQaRun.path) : null;
const manualQaPassed = manualQaAnalysis?.canBeCompletionEvidence === true;
const localSmokeAnalysis = latestLocalSmokeReport();
const hasStrictFail = /Strict：已启用/.test(preflight) && /总体状态：FAIL/.test(preflight);
const hasPassWithWarnings = /总体状态：PASS_WITH_WARNINGS/.test(preflight);
const hasPreflightPass = /总体状态：PASS(?:\n|-)/.test(preflight) && !hasPassWithWarnings;
const hasBasicUserSurface =
  exists('src/features/gallery/Gallery.jsx')
  && exists('src/features/auth/AuthModal.jsx')
  && exists('src/features/upload/UploadModal.jsx')
  && exists('src/features/viewer/ImageViewer.jsx')
  && exists('src/features/user/UserPanel.jsx')
  && hasProductDoctor;
const hasBasicAdminSurface =
  exists('src/features/admin/AdminPanel.jsx')
  && exists('src/features/admin/AdminOverviewTab.jsx')
  && exists('src/features/admin/AdminImagesTab.jsx')
  && exists('src/features/admin/AdminUsersTab.jsx')
  && exists('src/features/admin/AdminReportsTab.jsx')
  && exists('src/features/admin/AdminLogsTab.jsx')
  && exists('src/features/admin/AdminSettingsTab.jsx')
  && hasProductDoctor;
const hasBasicArchitecture =
  exists('src/features/admin/AdminPanel.jsx')
  && exists('src/lib/memoryMedia.js')
  && exists('src/lib/memoryContent.js')
  && scripts['architecture:doctor']
  && hasProductDoctor
  && exists('supabase/functions/media-urls/index.ts');

function manualQaEvidenceSummary() {
  if (!manualQaAnalysis) return '未找到最新手工 QA 记录。';

  return `最新手工 QA：\`${manualQaAnalysis.relativePath}\`，状态 ${manualQaAnalysis.status}，未勾选 ${manualQaAnalysis.uncheckedCount} 项，空白字段 ${manualQaAnalysis.blankFields.length} 项，可作为完成审计证据：${manualQaAnalysis.canBeCompletionEvidence ? '是' : '否'}。`;
}

function manualQaGap(fallback) {
  if (!manualQaAnalysis) {
    return fallback;
  }

  if (manualQaAnalysis.canBeCompletionEvidence) {
    return `最新手工 QA 已通过完整性检查：\`${manualQaAnalysis.relativePath}\`。`;
  }

  const details = [];
  if (manualQaAnalysis.status !== 'passed') details.push(`状态为 ${manualQaAnalysis.status}`);
  if (manualQaAnalysis.uncheckedCount) details.push(`${manualQaAnalysis.uncheckedCount} 个未勾选项`);
  if (manualQaAnalysis.blankFields.length) details.push(`${manualQaAnalysis.blankFields.length} 个空白字段`);

  return `最新手工 QA 还不能作为完成证据：${details.join('、') || '完整性不足'}。`;
}

function localSmokeEvidenceSummary() {
  if (!localSmokeAnalysis) return '未找到本地 smoke 报告。';
  if (!localSmokeAnalysis.report) return `本地 smoke 报告 \`${localSmokeAnalysis.relativePath}\` 不是合法 JSON。`;

  const freshness = localSmokeAnalysis.smokeReportFresh
    ? '未过期'
    : `已过期${localSmokeAnalysis.latestSource ? `（晚于报告的源码：${localSmokeAnalysis.latestSource.path}）` : ''}`;

  return `本地 smoke：\`${localSmokeAnalysis.relativePath}\`，状态 ${localSmokeAnalysis.report.status ?? 'unknown'}，桌面 ${localSmokeAnalysis.report.checks?.desktopDemo ?? 'unknown'}，手机 ${localSmokeAnalysis.report.checks?.mobileDemo ?? 'unknown'}，首页入口 ${localSmokeAnalysis.report.checks?.homeActions ?? 'unknown'}，搜索 ${localSmokeAnalysis.report.checks?.gallerySearch ?? 'unknown'}，举报表单 ${localSmokeAnalysis.report.checks?.reportForm ?? 'unknown'}，认证弹窗 ${localSmokeAnalysis.report.checks?.authFlow ?? 'unknown'}，报告${freshness}，可作为本地浏览器证据：${localSmokeAnalysis.canBeLocalEvidence ? '是' : '否'}。`;
}

const items = [
  {
    requirement: '用户侧路径完整',
    status: hasBasicUserSurface
      ? (manualQaPassed ? 'proven' : 'basic')
      : 'missing',
    evidence: '`gallery/auth/upload/viewer/user` feature 文件存在，`product:doctor` 固定检查浏览、上传、详情、认证、用户中心关键路径，`quality-check` 覆盖上传、收藏、举报、编辑、删除、分享关键 token。',
    gap: manualQaPassed
      ? manualQaGap('')
      : '基础小网站阶段已具备本地主路径；发布前再补真实账号 smoke 和手工 QA。',
  },
  {
    requirement: '管理侧路径完整',
    status: hasBasicAdminSurface
      ? (manualQaPassed ? 'proven' : 'basic')
      : 'missing',
    evidence: '`features/admin` 已包含概览、图片、用户、举报、日志、设置页签；`product:doctor` 固定检查管理主路径，相关 Edge Functions 和审计模型在质量门禁内。',
    gap: manualQaPassed
      ? manualQaGap('')
      : '基础小网站阶段已有后台入口和核心页签；发布前再补管理员真实会话 smoke 或手工 QA。',
  },
  {
    requirement: '前后端边界清晰',
    status: hasBasicArchitecture
      ? 'proven'
      : 'missing',
    evidence: '`app/features/components/hooks/lib` 分层存在；六个业务模块已进入 `features/`；媒体 URL、内容模型、权限函数有独立边界；`architecture:doctor` 与 `product:doctor` 已接入 `npm run verify`。',
    gap: '无当前代码层缺口。',
  },
  {
    requirement: '部署侧可落地',
    status: hasPassWithWarnings ? 'blocked' : (hasPreflightPass ? 'proven' : 'partial'),
    evidence: preflightFile
      ? `最新 preflight：\`${relative(root, preflightFile.path)}\`。`
      : '未找到 release preflight 报告。',
    gap: hasPassWithWarnings || hasStrictFail
      ? '发布阶段再处理：Supabase CLI、生产域名、远端 share-memory text/html 响应头、Dashboard Auth/Secret 配置。'
      : '如未启用 strict，仍建议用 `npm run release:preflight -- --strict` 做最终闸门。',
  },
  {
    requirement: '验证侧可复核',
    status: scripts.verify && scripts.smoke && scripts['smoke:local'] && scripts['release:preflight'] && scripts['qa:doctor'] && hasProductDoctor ? 'partial' : 'missing',
    evidence: `\`verify\`、\`architecture:doctor\`、\`product:doctor\`、\`smoke:local\`、\`smoke\`、\`deploy:doctor\`、\`launch:doctor\`、\`smoke:doctor\`、\`qa:doctor\`、\`release:preflight\` 均已接入。${localSmokeEvidenceSummary()}${manualQaEvidenceSummary()}`,
    gap: hasPreflightPass
      ? '无当前自动化缺口。'
      : '基础小网站阶段使用 `verify` 和 `smoke:local` 即可；发布阶段再处理 preflight warning。',
  },
  {
    requirement: '测试接入可交接',
    status: exists('docs/SMOKE_TESTING_GUIDE.md') && exists('scripts/create-smoke-session.mjs')
      ? (localSmokeAnalysis?.canBeLocalEvidence ? 'proven' : 'partial')
      : 'missing',
    evidence: `\`SMOKE_TESTING_GUIDE.md\`、\`smoke:local\`、\`smoke:doctor\`、\`smoke:session\` 说明并支持本地访客回归、会话生成和已登录回归接入。${localSmokeEvidenceSummary()}`,
    gap: '基础小网站阶段不强制管理员 / 普通用户 smoke 会话；发布阶段再配置真实会话。',
  },
  {
    requirement: '手工验收可交接',
    status: exists('docs/MANUAL_QA_TEMPLATE.md') && exists('scripts/create-manual-qa-run.mjs')
      ? (manualQaPassed ? 'proven' : 'partial')
      : 'missing',
    evidence: manualQaRun
      ? `\`MANUAL_QA_TEMPLATE.md\`、\`qa:init\` 和 \`qa:doctor\` 已存在；${manualQaEvidenceSummary()}`
      : '`MANUAL_QA_TEMPLATE.md` 和 `qa:init` 已存在，可生成真实验收记录。',
    gap: manualQaPassed
      ? '最新手工 QA 已通过 qa:doctor 完整性检查。'
      : '基础小网站阶段不强制完整手工 QA；发布阶段再生成 `QA_AUDIT_STATUS: passed` 的验收结果。',
  },
];

const incomplete = items.filter((item) => item.status !== 'proven');
const basicReady =
  hasBasicUserSurface
  && hasBasicAdminSurface
  && hasBasicArchitecture
  && Boolean(scripts.verify)
  && localSmokeAnalysis?.canBeLocalEvidence === true;
const launchReady = incomplete.length === 0;
const currentStage = basicReady ? 'BASIC_READY' : 'BASIC_NOT_READY';
const launchStage = launchReady ? 'LAUNCH_READY' : 'LAUNCH_NOT_READY';
const overall = launchReady ? 'COMPLETE' : 'NOT_COMPLETE';
const generatedAt = new Date();

const report = `# ATRI Memories Completion Audit

- 生成时间：${generatedAt.toISOString()}
- 当前阶段结论：${currentStage}
- 发布准备结论：${launchStage}
- 完整发布口径：${overall}
- 规划来源：\`docs/MASTER_DELIVERY_PLAN.md\`
- 最新预发布报告：${preflightFile ? `\`${relative(root, preflightFile.path)}\`` : '未找到'}
- 最新本地 smoke 报告：${localSmokeAnalysis ? `\`${localSmokeAnalysis.relativePath}\`（可作为本地浏览器证据：${localSmokeAnalysis.canBeLocalEvidence ? '是' : '否'}）` : '未找到'}
- 最新手工 QA 记录：${manualQaAnalysis ? `\`${manualQaAnalysis.relativePath}\`（${manualQaAnalysis.status}，可作为完成审计证据：${manualQaAnalysis.canBeCompletionEvidence ? '是' : '否'}）` : '未找到'}

## 完成定义逐项审计

| 要求 | 状态 | 当前证据 | 剩余缺口 |
| --- | --- | --- | --- |
${items.map(row).join('\n')}

## 结论

${basicReady
    ? '按当前“小网站先有基本功能”的目标，基础功能已经可本地使用；发布相关证据暂不阻塞当前阶段。'
    : '按当前“小网站先有基本功能”的目标，基础功能证据仍不足；下一步优先修复本地功能、`verify` 或 `smoke:local`。'}

${launchReady
    ? '发布准备也已满足完整口径。'
    : '发布阶段再补生产域名 / Supabase 部署配置 / 已登录 smoke 会话 / 手工 QA 记录，然后运行 `npm run release:preflight -- --strict` 和本审计。'}

## 审计覆盖说明

- 本审计按 \`docs/MASTER_DELIVERY_PLAN.md\` 的完成定义生成。
- 它读取当前代码结构、脚本清单、质量门禁和最新 release preflight 报告。
- 它不会替代真实浏览器 smoke、Supabase Dashboard 配置核对或手工 QA。
`;

mkdirSync(reportsDir, { recursive: true });
const outputPath = join(reportsDir, `${timestampForFile(generatedAt)}-completion-audit.md`);
writeFileSync(outputPath, report, 'utf8');

console.log(`Completion audit report: ${relative(root, outputPath)}`);
console.log(`Completion audit status: ${currentStage} (${launchStage})`);

if (!plan.includes('## 7. 完成定义')) {
  console.error('MASTER_DELIVERY_PLAN.md 缺少完成定义章节。');
  process.exit(1);
}

if (!quality.includes('completion:audit')) {
  console.error('quality-check 尚未覆盖 completion:audit。');
  process.exit(1);
}
