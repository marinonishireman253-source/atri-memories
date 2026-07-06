import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import {
  checkShareMemoryPreview,
  shareMemoryDetail,
} from './share-preview-diagnostics.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = dirname(__dirname);
const outputDir = join(root, 'output', 'playwright');
const localReportPath = join(outputDir, 'smoke-local-report.json');
const galleryImageDiagnosticsPath = join(outputDir, 'smoke-gallery-image-diagnostics.json');
const galleryImageDiagnostics = [];
const publicPort = Number(process.env.SMOKE_PUBLIC_PORT ?? 4173);
const connectedPort = Number(process.env.SMOKE_CONNECTED_PORT ?? 4174);
const chromePath = process.env.SMOKE_BROWSER_PATH
  ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browserLaunchOptions = {
  executablePath: chromePath,
  headless: true,
  args: ['--no-proxy-server'],
};
const SMOKE_ACTION_TIMEOUT_MS = Number(process.env.SMOKE_ACTION_TIMEOUT_MS ?? 30_000);
const ADMIN_IMAGE_EDITOR_TIMEOUT_MS = Number(process.env.SMOKE_ADMIN_IMAGE_EDITOR_TIMEOUT_MS ?? 60_000);

mkdirSync(outputDir, { recursive: true });

function configureSmokeTimeouts(playwrightTarget) {
  playwrightTarget.setDefaultTimeout(SMOKE_ACTION_TIMEOUT_MS);
  playwrightTarget.setDefaultNavigationTimeout(SMOKE_ACTION_TIMEOUT_MS);
}

function parseArgs(argv) {
  const flags = new Set(argv.filter((arg) => arg.startsWith('--')));
  const localOnly = flags.has('--local-only');

  return {
    localOnly,
    skipShare: localOnly || flags.has('--skip-share'),
    skipConnected: localOnly || flags.has('--skip-connected'),
  };
}

function smokeArtifactStatus(names) {
  return names.map((name) => {
    const path = join(outputDir, name);
    if (!existsSync(path)) {
      return { name, exists: false, sizeBytes: 0 };
    }
    const stat = statSync(path);
    return { name, exists: true, sizeBytes: stat.size };
  });
}

function writeGalleryImageDiagnostics(generatedAt = new Date()) {
  writeFileSync(
    galleryImageDiagnosticsPath,
    `${JSON.stringify({ generatedAt: generatedAt.toISOString(), diagnostics: galleryImageDiagnostics }, null, 2)}\n`,
    'utf8',
  );
}

function writeSmokeReport({ options, startedAt, endedAt }) {
  writeGalleryImageDiagnostics(endedAt);

  const desktopArtifacts = [
    'smoke-home.png',
    'smoke-home-actions.png',
    'smoke-gallery-search.png',
    'smoke-gallery-image-diagnostics.json',
    'smoke-viewer.png',
    'smoke-report-form.png',
    'smoke-viewer-tag-filter.png',
    'smoke-case-study.png',
    'smoke-auth.png',
    'smoke-auth-register.png',
    'smoke-auth-email-required.png',
  ];
  const mobileArtifacts = [
    'smoke-mobile-home.png',
    'smoke-mobile-viewer.png',
    'smoke-mobile-auth.png',
    'smoke-mobile-auth-register.png',
    'smoke-mobile-case-study.png',
  ];
  const localArtifacts = smokeArtifactStatus([...desktopArtifacts, ...mobileArtifacts]);
  const missingArtifacts = localArtifacts.filter((artifact) => !artifact.exists || artifact.sizeBytes <= 0);
  if (missingArtifacts.length) {
    fail(`本地 smoke 产物缺失或为空：${missingArtifacts.map((artifact) => artifact.name).join(', ')}`);
  }

  const report = {
    generatedAt: endedAt.toISOString(),
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    mode: options.localOnly ? 'local-only' : 'full',
    status: 'passed',
    checks: {
      desktopDemo: 'passed',
      mobileDemo: 'passed',
      homeActions: 'passed',
      gallerySearch: 'passed',
      galleryImageDiagnostics: 'passed',
      reportForm: 'passed',
      authFlow: 'passed',
      caseStudy: 'passed',
      sharePreview: options.skipShare ? 'skipped' : 'passed',
      connectedAuth: options.skipConnected ? 'skipped' : 'passed-or-skipped-by-credentials',
    },
    artifacts: localArtifacts,
  };

  writeFileSync(localReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  log(`Smoke report: ${localReportPath}`);
}

function log(message) {
  process.stdout.write(`${message}\n`);
}

function fail(message) {
  throw new Error(message);
}

function parseEnvFile(path) {
  try {
    const content = readFileSync(path, 'utf8');
    return Object.fromEntries(
      content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => {
          const index = line.indexOf('=');
          const key = line.slice(0, index).trim();
          const value = line.slice(index + 1).trim();
          return [key, value];
        }),
    );
  } catch {
    return {};
  }
}

function envValue(envFile, key) {
  return process.env[key] ?? envFile[key] ?? '';
}

function parseJsonEnv(value, label) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    fail(`${label} 不是合法 JSON。`);
  }
}

function storageKeyForSupabaseUrl(supabaseUrl) {
  const hostname = new URL(supabaseUrl).hostname;
  return `sb-${hostname.split('.')[0]}-auth-token`;
}

function spawnCommand(command, args, { env = process.env, label }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          `${label} 失败（退出码 ${code}）。\n${stdout}${stderr}`.trim(),
        ),
      );
    });
  });
}

async function waitForHttp(url, timeoutMs = 30_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // wait for server
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  fail(`等待本地站点启动超时：${url}`);
}

function startPreviewServer(port, envOverrides) {
  let shuttingDown = false;
  const child = spawn(
    'npm',
    ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      cwd: root,
      env: { ...process.env, ...envOverrides },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  child.on('exit', (code) => {
    if (!shuttingDown && code && code !== 0) {
      process.stderr.write(`preview server exited unexpectedly (${code}).\n${stderr}`);
    }
  });

  child.stop = () => {
    shuttingDown = true;
    child.kill('SIGTERM');
  };

  return child;
}

async function assertViewerOverlayPortal(page, label) {
  await page.locator('.viewer-overlay').waitFor({ state: 'visible', timeout: 10_000 });
  await page.mouse.move(720, 520);
  await page.waitForFunction(() => document.querySelector('.custom-cursor-wrap'), null, {
    timeout: 3_000,
  });

  const metrics = await page.evaluate(() => {
    const overlay = document.querySelector('.viewer-overlay');
    const cursor = document.querySelector('.custom-cursor-wrap');
    const overlayStyle = overlay ? window.getComputedStyle(overlay) : null;
    const cursorStyle = cursor ? window.getComputedStyle(cursor) : null;
    const overlayRect = overlay?.getBoundingClientRect();

    return {
      overlayParentIsBody: Boolean(overlay && overlay.parentElement === document.body),
      cursorParentIsBody: Boolean(cursor && cursor.parentElement === document.body),
      overlayZ: overlayStyle ? Number.parseInt(overlayStyle.zIndex, 10) : 0,
      cursorZ: cursorStyle ? Number.parseInt(cursorStyle.zIndex, 10) : 0,
      overlayWidth: Math.round(overlayRect?.width ?? 0),
      overlayHeight: Math.round(overlayRect?.height ?? 0),
    };
  });

  if (!metrics.overlayParentIsBody) {
    fail(`${label} 查看器 overlay 没有挂到 document.body。`);
  }
  if (!metrics.cursorParentIsBody) {
    fail(`${label} 自定义鼠标没有挂到 document.body。`);
  }
  if (metrics.cursorZ <= metrics.overlayZ) {
    fail(`${label} 自定义鼠标层级不应低于查看器：cursor=${metrics.cursorZ}, overlay=${metrics.overlayZ}`);
  }
  if (metrics.overlayWidth < 1000 || metrics.overlayHeight < 700) {
    fail(`${label} 查看器 overlay 没有按视口展开：${metrics.overlayWidth}x${metrics.overlayHeight}`);
  }
}

function trackGalleryImageFailures(page, failedImageRequests) {
  page.on('requestfailed', (request) => {
    if (request.resourceType() !== 'image') return;
    failedImageRequests.push({
      url: request.url(),
      failure: request.failure()?.errorText ?? 'requestfailed',
    });
  });

  page.on('response', (response) => {
    const request = response.request();
    if (request.resourceType() !== 'image') return;
    if (response.status() < 400) return;
    failedImageRequests.push({
      url: response.url(),
      status: response.status(),
    });
  });
}

async function assertGalleryImageDiagnostics(page, label, failedImageRequests, { minimumReadyCards = 1 } = {}) {
  let readyWaitError = null;
  try {
    await page.waitForFunction(
      (requiredReadyCards) => document.querySelectorAll('.memory-card.image-ready').length >= requiredReadyCards,
      minimumReadyCards,
      { timeout: 15_000 },
    );
  } catch (error) {
    readyWaitError = error;
  }

  const metrics = await page.evaluate(() => {
    const visibleCards = Array.from(document.querySelectorAll('.memory-card')).filter((card) => {
      const rect = card.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0 && rect.height > 0;
    });
    const visibleReadyCards = visibleCards.filter((card) => card.classList.contains('image-ready'));
    const visibleOfflineCards = visibleCards.filter((card) => card.querySelector('.memory-offline-placeholder'));
    const imageRows = visibleCards.map((card) => {
      const image = card.querySelector('img');
      const currentSrc = image?.currentSrc || image?.src || '';
      const configuredSrc = card.getAttribute('data-gallery-image-src') || '';
      const fallbackSrc = card.getAttribute('data-gallery-fallback-src') || '';
      return {
        memoryId: card.getAttribute('data-memory-id') || '',
        currentSrc,
        configuredSrc,
        fallbackSrc,
        usesProxy: currentSrc.includes('wsrv.nl'),
        directConfiguredButProxy: Boolean(configuredSrc && !configuredSrc.includes('wsrv.nl') && currentSrc.includes('wsrv.nl')),
      };
    });

    return {
      visibleCards: visibleCards.length,
      visibleReadyCards: visibleReadyCards.length,
      visibleOfflineCards: visibleOfflineCards.length,
      proxyImageUrls: imageRows.filter((row) => row.usesProxy).length,
      directConfiguredButProxy: imageRows.filter((row) => row.directConfiguredButProxy).length,
      images: imageRows,
    };
  });

  const diagnostics = {
    label,
    ...metrics,
    readyWaitTimedOut: Boolean(readyWaitError),
    failedImageRequests: failedImageRequests.slice(),
  };
  galleryImageDiagnostics.push(diagnostics);
  writeGalleryImageDiagnostics();

  if (readyWaitError) {
    fail(`${label} 等待图片加载超时：ready=${metrics.visibleReadyCards}, required=${minimumReadyCards}`);
  }
  if (failedImageRequests.length > 0) {
    fail(`${label} 存在失败图片请求：${failedImageRequests.map((item) => item.status || item.failure).join(', ')}`);
  }
  if (metrics.visibleReadyCards < minimumReadyCards) {
    fail(`${label} 可见图片未完成加载：ready=${metrics.visibleReadyCards}, required=${minimumReadyCards}`);
  }
  if (metrics.visibleOfflineCards > 0) {
    fail(`${label} 可见图片进入离线占位：${metrics.visibleOfflineCards}`);
  }
  if (metrics.directConfiguredButProxy > 0) {
    fail(`${label} 已有直接图片地址但仍使用外部代理：${metrics.directConfiguredButProxy}`);
  }

  return diagnostics;
}

async function verifyLocalSite() {
  const browser = await chromium.launch(browserLaunchOptions);

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    configureSmokeTimeouts(page);
    const pageErrors = [];
    const failedImageRequests = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto(`http://127.0.0.1:${publicPort}`, { waitUntil: 'domcontentloaded' });
    await page.getByText('ATRI MEMORIES').waitFor({ state: 'visible' });
    await page.getByText('Preview mode').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: '登录', exact: true }).waitFor({ state: 'visible' });

    await page.screenshot({ path: join(outputDir, 'smoke-home.png') });

    await page.getByLabel('首页主操作').getByRole('button', { name: '登录或注册' }).waitFor({ state: 'visible' });
    await page.screenshot({ path: join(outputDir, 'smoke-home-actions.png') });

    // Navigate to /gallery
    trackGalleryImageFailures(page, failedImageRequests);
    await page.getByRole('link', { name: '相册' }).click();

    await page.getByRole('heading', { name: '记忆碎片' }).waitFor({ state: 'visible' });
    const desktopScopeBar = page.locator('.gallery-desktop-controls').getByLabel('当前画廊范围');
    await desktopScopeBar.waitFor({ state: 'visible' });

    const memoryButtons = page.locator('.memory-open');
    const memoryCount = await memoryButtons.count();
    if (memoryCount < 3) {
      fail(`公开画廊卡片数量异常，当前只找到 ${memoryCount} 张。`);
    }
    await assertGalleryImageDiagnostics(page, '桌面公开画廊', failedImageRequests, {
      minimumReadyCards: Math.min(2, memoryCount),
    });
    const firstCardTop = await memoryButtons.first().evaluate((element) =>
      Math.round(element.getBoundingClientRect().top),
    );
    if (firstCardTop > 700) {
      fail(`公开画廊首屏没有露出图片首行：第一张卡片 top=${firstCardTop}px。`);
    }

    const firstCardTitle = (await page.locator('.card-title-badge').first().textContent())?.trim();
    if (!firstCardTitle) {
      fail('公开画廊第一张卡片标题为空，无法验证搜索。');
    }
    const desktopSearchInput = page.locator('.gallery-desktop-controls').getByPlaceholder('按标题、描述、标签或上传者查找');
    await desktopSearchInput.fill(firstCardTitle);
    await desktopScopeBar.getByText(`搜索：${firstCardTitle}`).waitFor({ state: 'visible' });
    await page.locator('.card-title-badge').filter({ hasText: firstCardTitle }).first().waitFor({ state: 'visible' });
    await page.screenshot({ path: join(outputDir, 'smoke-gallery-search.png') });
    await desktopSearchInput.fill('');

    await memoryButtons.first().click();
    const viewerDialog = page.getByRole('dialog');
    await viewerDialog.waitFor({ state: 'visible' });
    await viewerDialog.getByRole('button', { name: '下载原图' }).waitFor({ state: 'visible' });
    await viewerDialog.getByRole('button', { name: '复制分享链接' }).waitFor({ state: 'visible' });
    await viewerDialog.getByRole('button', { name: '举报图片' }).waitFor({ state: 'visible' });
    await assertViewerOverlayPortal(page, '公开画廊');
    const viewerTagButtons = viewerDialog.locator('.viewer-tag-button');
    const viewerTagCount = await viewerTagButtons.count();
    if (viewerTagCount < 1) {
      fail('大图详情没有可点击的标签入口。');
    }
    const firstViewerTag = (await viewerTagButtons.first().textContent())?.trim();
    if (!firstViewerTag) {
      fail('大图详情标签文案为空，无法验证标签筛选入口。');
    }

    if (firstCardTitle) {
      await viewerDialog.getByRole('heading', { name: firstCardTitle }).waitFor({ state: 'visible' });
    }

    await page.screenshot({ path: join(outputDir, 'smoke-viewer.png') });
    await viewerDialog.getByRole('button', { name: '举报图片' }).click();
    await viewerDialog.getByLabel('举报原因').waitFor({ state: 'visible' });
    const reporterEmailInput = viewerDialog.getByLabel('联系邮箱（可选）');
    await reporterEmailInput.fill('invalid-email');
    await viewerDialog.getByLabel('补充说明（可选）').fill('本地 smoke 验证举报表单校验。');
    const emailIsValid = await reporterEmailInput.evaluate((element) => element.checkValidity());
    if (emailIsValid) {
      fail('举报表单联系邮箱输入框没有触发浏览器 email 校验。');
    }
    await page.screenshot({ path: join(outputDir, 'smoke-report-form.png') });
    await viewerDialog.getByRole('button', { name: '取消' }).click();
    await viewerTagButtons.first().click();
    await viewerDialog.waitFor({ state: 'hidden' });
    const desktopTagFilter = page.locator('.gallery-desktop-controls').getByLabel('标签筛选');
    const selectedTagValue = await desktopTagFilter.inputValue();
    if (selectedTagValue !== firstViewerTag) {
      fail(`大图标签筛选没有同步到画廊筛选器：期望 ${firstViewerTag}，实际 ${selectedTagValue || '空'}`);
    }
    await desktopScopeBar.getByText(`标签：${firstViewerTag}`).waitFor({ state: 'visible' });
    await page.screenshot({ path: join(outputDir, 'smoke-viewer-tag-filter.png') });

    await page.getByRole('button', { name: '登录', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'visible' });
    await page.getByRole('heading', { name: '登录账户' }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: '没有账户？注册一个' }).waitFor({ state: 'visible' });
    await page.screenshot({ path: join(outputDir, 'smoke-auth.png') });

    const authDialog = page.getByRole('dialog');
    await authDialog.getByRole('button', { name: '没有账户？注册一个' }).click();
    await authDialog.getByRole('heading', { name: '注册账户' }).waitFor({ state: 'visible' });
    await authDialog.getByRole('button', { name: '已有账户？去登录' }).waitFor({ state: 'visible' });
    await authDialog.getByRole('button', { name: '注册', exact: true }).waitFor({ state: 'visible' });
    await page.screenshot({ path: join(outputDir, 'smoke-auth-register.png') });
    await authDialog.getByRole('button', { name: '已有账户？去登录' }).click();
    await authDialog.getByRole('heading', { name: '登录账户' }).waitFor({ state: 'visible' });
    await authDialog.getByRole('button', { name: '忘记密码' }).click();
    await authDialog.getByText('请先填写邮箱地址').waitFor({ state: 'visible' });
    await authDialog.getByRole('button', { name: '重发确认邮件' }).click();
    await authDialog.getByText('重置密码和重发确认邮件都需要先提供邮箱。').waitFor({ state: 'visible' });
    await page.screenshot({ path: join(outputDir, 'smoke-auth-email-required.png') });
    await page.getByRole('button', { name: '关闭' }).click();

    await page.getByRole('link', { name: '每日' }).click();
    await page.getByRole('heading', { name: '每日 ATRI' }).waitFor({ state: 'visible' });
    const dailyHeadingCount = await page.getByRole('heading', { name: '每日 ATRI' }).count();
    if (dailyHeadingCount !== 1) {
      fail(`每日页标题不应重复出现，当前找到 ${dailyHeadingCount} 个“每日 ATRI”标题。`);
    }

    await page.getByRole('link', { name: '项目' }).click();
    await page.getByRole('heading', { name: '项目案例' }).waitFor({ state: 'visible' });
    await page.getByText('权限模型', { exact: true }).waitFor({ state: 'visible' });
    await page.getByText('部署与验证', { exact: true }).waitFor({ state: 'visible' });
    await page.getByText('npm run verify', { exact: true }).waitFor({ state: 'visible' });
    await page.screenshot({ path: join(outputDir, 'smoke-case-study.png'), fullPage: true });

    if (pageErrors.length > 0) {
      fail(`本地页面运行时出现错误：${pageErrors.join(' | ')}`);
    }
  } finally {
    await browser.close();
  }
}

async function verifyMobileSite() {
  const browser = await chromium.launch(browserLaunchOptions);

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    });
    configureSmokeTimeouts(context);
    const page = await context.newPage();
    const pageErrors = [];
    const failedImageRequests = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto(`http://127.0.0.1:${publicPort}`, { waitUntil: 'domcontentloaded' });
    await page.getByText('ATRI MEMORIES').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: '登录', exact: true }).waitFor({ state: 'visible' });

    // Navigate to /gallery
    trackGalleryImageFailures(page, failedImageRequests);
    await page.getByRole('link', { name: '相册' }).click();

    await page.getByRole('heading', { name: '记忆碎片' }).waitFor({ state: 'visible' });
    const mobileSearchInput = page.getByLabel('移动相册筛选').getByPlaceholder('按标题、描述、标签或上传者查找');
    await mobileSearchInput.waitFor({ state: 'visible' });

    const memoryButtons = page.locator('.memory-open');
    const memoryCount = await memoryButtons.count();
    if (memoryCount < 1) {
      fail('移动端公开画廊没有可点击的图片卡片。');
    }
    await assertGalleryImageDiagnostics(page, '移动端公开画廊', failedImageRequests, {
      minimumReadyCards: 1,
    });

    await page.screenshot({ path: join(outputDir, 'smoke-mobile-home.png'), fullPage: true });

    await memoryButtons.first().click();
    const viewerDialog = page.getByRole('dialog');
    await viewerDialog.waitFor({ state: 'visible' });
    await viewerDialog.getByRole('button', { name: '关闭大图' }).waitFor({ state: 'visible' });
    await viewerDialog.getByRole('button', { name: '下载原图' }).waitFor({ state: 'visible' });
    await page.screenshot({ path: join(outputDir, 'smoke-mobile-viewer.png') });
    await viewerDialog.getByRole('button', { name: '关闭大图' }).click();
    await viewerDialog.waitFor({ state: 'hidden' });

    await page.getByRole('button', { name: '登录', exact: true }).click();
    const authDialog = page.getByRole('dialog');
    await authDialog.waitFor({ state: 'visible' });
    await authDialog.getByRole('heading', { name: '登录账户' }).waitFor({ state: 'visible' });
    await authDialog.getByRole('button', { name: '忘记密码' }).waitFor({ state: 'visible' });
    await page.screenshot({ path: join(outputDir, 'smoke-mobile-auth.png') });
    await authDialog.getByRole('button', { name: '没有账户？注册一个' }).click();
    await authDialog.getByRole('heading', { name: '注册账户' }).waitFor({ state: 'visible' });
    await authDialog.getByRole('button', { name: '已有账户？去登录' }).waitFor({ state: 'visible' });
    await page.screenshot({ path: join(outputDir, 'smoke-mobile-auth-register.png') });
    await authDialog.getByRole('button', { name: '关闭' }).click();
    await authDialog.waitFor({ state: 'hidden' });

    await page.getByRole('link', { name: '项目' }).click();
    await page.getByRole('heading', { name: '项目案例' }).waitFor({ state: 'visible' });
    await page.getByLabel('产品浏览路径').waitFor({ state: 'visible' });
    await page.screenshot({ path: join(outputDir, 'smoke-mobile-case-study.png'), fullPage: true });

    if (pageErrors.length > 0) {
      fail(`移动端页面运行时出现错误：${pageErrors.join(' | ')}`);
    }

    await context.close();
  } finally {
    await browser.close();
  }
}

async function signInAtPreview(page, { email, password }) {
  await page.getByRole('button', { name: '登录', exact: true }).click();
  const authDialog = page.getByRole('dialog');
  await authDialog.waitFor({ state: 'visible' });
  await page.evaluate(() => {
    window.__atriSmokeAuthFailed = false;
    if (!window.__atriSmokeAuthFailureListenerInstalled) {
      window.addEventListener('atri-auth-failure', () => {
        window.__atriSmokeAuthFailed = true;
      });
      window.__atriSmokeAuthFailureListenerInstalled = true;
    }
  });
  await authDialog.getByLabel('邮箱').fill(email);
  await authDialog.getByLabel('密码').fill(password);
  await authDialog.getByRole('button', { name: '登录', exact: true }).click();
  const authFailure = page
    .waitForFunction(() => window.__atriSmokeAuthFailed === true, undefined, { timeout: 30_000 })
    .then(() => 'failure');
  authFailure.catch(() => {});
  const outcome = await Promise.race([
    authDialog.waitFor({ state: 'hidden', timeout: 30_000 }).then(() => 'success'),
    authFailure,
  ]);
  if (outcome === 'failure') {
    const dialogText = await authDialog.innerText().catch(() => '');
    fail(`登录失败：${dialogText.replace(/\s+/g, ' ').trim() || '认证弹窗仍然可见'}`);
  }
}

async function openHeaderUserAction(page, label) {
  await page.locator('.site-user-menu summary').click();
  const action = page.locator('.site-user-popover button').filter({ hasText: label }).first();
  await action.waitFor({ state: 'visible' });
  await action.click();
}

async function injectSession(context, { supabaseUrl, session }) {
  const storageKey = storageKeyForSupabaseUrl(supabaseUrl);
  const serialized = JSON.stringify(session);

  await context.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
      window.localStorage.removeItem(`${key}-code-verifier`);
    },
    { key: storageKey, value: serialized },
  );
}

async function waitForSignedInHeader(page) {
  await page.locator('.site-user-menu summary').waitFor({ state: 'visible' });
}

function edgeFunctionName(url) {
  const marker = '/functions/v1/';
  const index = url.indexOf(marker);
  if (index === -1) return '';
  return url.slice(index + marker.length).split(/[/?#]/)[0];
}

async function waitForAdminImageEditor(adminPage, functionEvents = []) {
  const adminEditButton = adminPage.getByRole('button', { name: '查看/编辑' }).first();

  try {
    await adminEditButton.waitFor({ state: 'visible', timeout: ADMIN_IMAGE_EDITOR_TIMEOUT_MS });
    return adminEditButton;
  } catch {
    const state = await adminPage.evaluate((panel) => {
      const textList = (selector) => Array.from(panel.querySelectorAll(selector))
        .map((element) => element.textContent?.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      const editButtonCount = Array.from(panel.querySelectorAll('button'))
        .filter((button) => button.textContent?.includes('查看/编辑')).length;

      return {
        rowCount: panel.querySelectorAll('.admin-table tbody tr').length,
        editButtonCount,
        messages: textList('.admin-message'),
        emptyStates: textList('.empty-state'),
      };
    });

    fail(
      `后台图片管理未出现可编辑图片：rowCount=${state.rowCount}, `
      + `editButtonCount=${state.editButtonCount}, `
      + `messages=${state.messages.join(' | ') || 'none'}, `
      + `emptyStates=${state.emptyStates.join(' | ') || 'none'}, `
      + `functionEvents=${functionEvents.slice(-8).join(' | ') || 'none'}`,
    );
  }
}

async function verifyAuthenticatedSite({
  supabaseUrl,
  email,
  password,
  session,
  role,
  expectAdmin = false,
}) {
  const browser = await chromium.launch(browserLaunchOptions);

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
    });
    configureSmokeTimeouts(context);
    if (session) {
      await injectSession(context, { supabaseUrl, session });
    }
    const page = await context.newPage();
    const pageErrors = [];
    const functionEvents = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('response', (response) => {
      const functionName = edgeFunctionName(response.url());
      if (functionName) functionEvents.push(`${functionName}:${response.status()}`);
    });
    page.on('requestfailed', (request) => {
      const functionName = edgeFunctionName(request.url());
      if (functionName) functionEvents.push(`${functionName}:failed:${request.failure()?.errorText ?? 'unknown'}`);
    });

    await page.goto(`http://127.0.0.1:${connectedPort}`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Cloud linked').waitFor({ state: 'visible' });
    if (session) {
      await waitForSignedInHeader(page);
    } else {
      await signInAtPreview(page, { email, password });
    }
    await waitForSignedInHeader(page);
    await page.getByRole('link', { name: '每日' }).click();
    await page.getByRole('heading', { name: '每日 ATRI' }).waitFor({ state: 'visible' });

    if (expectAdmin) {
      await openHeaderUserAction(page, '批量上传');
      const uploadDialog = page.getByRole('dialog');
      await uploadDialog.getByRole('heading', { name: '批量刻录记忆' }).waitFor({ state: 'visible' });
      await uploadDialog.getByRole('button', { name: '关闭' }).click();
      await uploadDialog.waitFor({ state: 'hidden' });

      await openHeaderUserAction(page, '管理后台');
      await page.waitForURL(`http://127.0.0.1:${connectedPort}/admin`, { timeout: 10_000 });
      const adminPage = page.locator('.admin-page-panel');
      await adminPage.waitFor({ state: 'visible' });
      await adminPage.getByRole('heading', { name: 'ATRI 管理室' }).waitFor({ state: 'visible' });
      await adminPage.getByRole('tablist', { name: '管理后台页签' }).waitFor({ state: 'visible' });
      await adminPage.getByText('运营管理路径', { exact: true }).waitFor({ state: 'visible' });
      await adminPage.getByText('内容运营', { exact: true }).waitFor({ state: 'visible' });
      await adminPage.getByText('账号权限', { exact: true }).waitFor({ state: 'visible' });
      await adminPage.getByText('治理队列', { exact: true }).waitFor({ state: 'visible' });
      await adminPage.getByRole('button', { name: '图片管理', exact: true }).click();
      const adminEditButton = await waitForAdminImageEditor(adminPage, functionEvents);
      await adminEditButton.click();
      await page.locator('.viewer-overlay').waitFor({ state: 'visible' });
      await assertViewerOverlayPortal(page, '管理员图片管理');
      await page.screenshot({ path: join(outputDir, 'smoke-admin-image-viewer.png') });
      await page.getByRole('button', { name: '关闭大图' }).click();
      await page.locator('.viewer-overlay').waitFor({ state: 'hidden' });
      await adminPage.getByRole('button', { name: '用户管理', exact: true }).click();
      await adminPage.getByText('邀请用户').waitFor({ state: 'visible' });
      await adminPage.getByRole('button', { name: '站点设置', exact: true }).click();
      await adminPage.getByText('上线准备', { exact: true }).waitFor({ state: 'visible' });
      await page.screenshot({ path: join(outputDir, `smoke-${role}-admin.png`) });
    } else {
      await openHeaderUserAction(page, '我的图片');
      await page.getByRole('heading', { name: '记忆碎片' }).waitFor({ state: 'visible' });
      await page.locator('.gallery-desktop-controls .gallery-scope-bar .scope-pill.active').filter({ hasText: '我的图片' }).waitFor({ state: 'visible' });

      await openHeaderUserAction(page, '我的空间');
      const userDialog = page.getByRole('dialog', { name: '我的空间' });
      await userDialog.waitFor({ state: 'visible' });
      await userDialog.getByText('当前画廊范围').waitFor({ state: 'visible' });
      await userDialog.getByRole('button', { name: '批量上传' }).waitFor({ state: 'visible' });
      await page.screenshot({ path: join(outputDir, `smoke-${role}-user.png`) });
    }

    if (pageErrors.length > 0) {
      fail(`已登录 ${role} 场景出现运行时错误：${pageErrors.join(' | ')}`);
    }

    await context.close();
  } finally {
    await browser.close();
  }
}

async function verifySharePreview(envFile) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? envFile.VITE_SUPABASE_URL;
  const publishableKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.VITE_SUPABASE_ANON_KEY
    ?? envFile.VITE_SUPABASE_PUBLISHABLE_KEY
    ?? envFile.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    log('! 跳过 share-memory 远端检查：未找到 Supabase 前端环境变量。');
    return;
  }

  const shareMemory = await checkShareMemoryPreview({ supabaseUrl, publishableKey });
  if (!shareMemory.ok) {
    const detail = shareMemoryDetail(shareMemory);
    const missingParts = [
      shareMemory.hasHtmlMeta ? '' : 'OG/Twitter meta',
      shareMemory.hasCanonical ? '' : 'canonical / og:url',
    ].filter(Boolean).join('、');
    fail(
      shareMemory.error
        ? `share-memory 远端检查失败：${detail ? `${detail}；` : ''}${shareMemory.error}`
        : `share-memory 远端检查失败：${detail}${missingParts ? `；缺少 ${missingParts}` : ''}`,
    );
  }

  if (!/text\/html/i.test(shareMemory.contentType)) {
    log(`! share-memory content-type 当前为 ${shareMemory.contentType || 'unknown'}，已保留为告警但不阻断烟测。`);
  }
}

async function runConnectedSmoke(envFile) {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL
    ?? envFile.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    log('! 跳过已登录 smoke：未找到 VITE_SUPABASE_URL。');
    return;
  }

  const scenarios = [
    {
      key: 'admin',
      email: envValue(envFile, 'SMOKE_ADMIN_EMAIL'),
      password: envValue(envFile, 'SMOKE_ADMIN_PASSWORD'),
      session: parseJsonEnv(envValue(envFile, 'SMOKE_ADMIN_SESSION_JSON'), 'SMOKE_ADMIN_SESSION_JSON'),
      expectAdmin: true,
    },
    {
      key: 'user',
      email: envValue(envFile, 'SMOKE_USER_EMAIL'),
      password: envValue(envFile, 'SMOKE_USER_PASSWORD'),
      session: parseJsonEnv(envValue(envFile, 'SMOKE_USER_SESSION_JSON'), 'SMOKE_USER_SESSION_JSON'),
      expectAdmin: false,
    },
  ].filter((scenario) => scenario.session || (scenario.email && scenario.password));

  if (!scenarios.length) {
    log('! 跳过已登录 smoke：未提供 SMOKE_ADMIN_* / SMOKE_USER_* 会话或凭据。');
    return;
  }

  log('5/6 构建 Cloud linked 预览包（启用真实 Supabase 配置）...');
  await spawnCommand('npm', ['run', 'build'], {
    env: process.env,
    label: 'connected smoke build',
  });

  log('6/6 执行已登录用户 / 管理员烟测...');
  const previewServer = startPreviewServer(connectedPort, process.env);
  try {
    await waitForHttp(`http://127.0.0.1:${connectedPort}`);
    for (const scenario of scenarios) {
      log(`   - 场景：${scenario.key}`);
      await verifyAuthenticatedSite({
        supabaseUrl,
        email: scenario.email,
        password: scenario.password,
        session: scenario.session,
        role: scenario.key,
        expectAdmin: scenario.expectAdmin,
      });
    }
  } finally {
    previewServer.stop();
  }
}

async function main() {
  if (!chromePath) {
    fail('缺少可执行浏览器路径，请设置 SMOKE_BROWSER_PATH。');
  }

  const options = parseArgs(process.argv.slice(2));
  const startedAt = new Date();
  const envFile = parseEnvFile(join(root, '.env'));
  const localEnvOverrides = {
    VITE_SUPABASE_URL: '',
    VITE_SUPABASE_PUBLISHABLE_KEY: '',
    VITE_SUPABASE_ANON_KEY: '',
  };

  log('1/5 构建本地预览包（强制走 demo 数据模式）...');
  await spawnCommand('npm', ['run', 'build'], {
    env: { ...process.env, ...localEnvOverrides },
    label: '本地 smoke build',
  });

  log('2/5 启动本地预览服务器...');
  const previewServer = startPreviewServer(publicPort, localEnvOverrides);

  try {
    await waitForHttp(`http://127.0.0.1:${publicPort}`);
    log('3/5 执行桌面浏览器烟测...');
    await verifyLocalSite();
    log('4/5 执行移动端烟测...');
    await verifyMobileSite();
    if (options.skipShare) {
      log('5/5 跳过远端 share-memory 预览页检查。');
    } else {
      log('5/5 校验远端 share-memory 预览页...');
      await verifySharePreview(envFile);
    }
  } finally {
    previewServer.stop();
  }

  if (options.skipConnected) {
    log('! 跳过已登录 Cloud linked smoke。');
  } else {
    await runConnectedSmoke(envFile);
  }

  writeSmokeReport({ options, startedAt, endedAt: new Date() });
  log(`Smoke checks passed. Artifacts: ${outputDir}`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
