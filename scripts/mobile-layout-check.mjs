import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = dirname(__dirname);
const outputDir = join(root, 'output', 'playwright');
const defaultPort = Number(process.env.MOBILE_CHECK_PORT ?? 4185);
const defaultChromePath =
  process.env.SMOKE_BROWSER_PATH
  ?? process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const horizontalOverflowTolerance = 4;

export const MOBILE_LAYOUT_VIEWPORTS = [
  { name: 'compact-phone', width: 360, height: 740 },
  { name: 'large-phone', width: 390, height: 844 },
];

export const MOBILE_LAYOUT_ROUTES = [
  {
    name: '首页',
    path: '/',
    readySelector: '.official-kv-panel',
    keySelectors: ['.site-header', '.official-kv-panel', '.official-kv-actions'],
  },
  {
    name: '相册',
    path: '/gallery',
    readySelector: '.gallery-panel',
    keySelectors: ['.site-header', '.gallery-panel', '.gallery-header-controls'],
  },
  {
    name: '博客',
    path: '/blog',
    readySelector: '.blog-route-container',
    keySelectors: ['.site-header', '.blog-route-container', '.blog-list-header'],
  },
  {
    name: '项目',
    path: '/case-study',
    readySelector: '.case-study-page',
    keySelectors: ['.site-header', '.case-study-page', '.case-study-demo-checklist'],
  },
  {
    name: '后台',
    path: '/admin',
    readySelector: '.admin-page-shell',
    keySelectors: ['.site-header', '.admin-page-shell', '.admin-tabs'],
    demoSession: 'admin',
  },
];

function log(message) {
  process.stdout.write(`${message}\n`);
}

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const args = {
    skipBuild: false,
    baseUrl: '',
    port: defaultPort,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--skip-build') args.skipBuild = true;
    else if (arg === '--base-url') args.baseUrl = argv[++index] ?? '';
    else if (arg === '--port') args.port = Number(argv[++index] ?? defaultPort);
    else throw new Error(`未知参数：${arg}`);
  }

  return args;
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
      reject(new Error(`${label} 失败（退出码 ${code}）。\n${stdout}${stderr}`.trim()));
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

export function formatRouteLabel(route) {
  return `${route.name} ${route.path}`;
}

export function hasHorizontalOverflow(metrics, tolerance = horizontalOverflowTolerance) {
  const scrollWidth = Number(metrics.scrollWidth) || 0;
  const bodyWidth = Number(metrics.bodyWidth) || 0;
  const clientWidth = Number(metrics.clientWidth) || 0;
  return Math.max(scrollWidth, bodyWidth) - clientWidth > tolerance;
}

export function assertRouteMetrics({ route, viewport, metrics }) {
  const failures = [];
  const routeLabel = `${formatRouteLabel(route)} @ ${viewport.width}x${viewport.height}`;

  if (hasHorizontalOverflow(metrics)) {
    failures.push(
      `${routeLabel} 横向溢出：scrollWidth=${metrics.scrollWidth}, bodyWidth=${metrics.bodyWidth}, clientWidth=${metrics.clientWidth}`,
    );
  }

  if (metrics.visibleKeyElements < metrics.keyElementCount) {
    failures.push(
      `${routeLabel} 关键元素不可见：visible=${metrics.visibleKeyElements}/${metrics.keyElementCount}`,
    );
  }

  if (metrics.pageHeight <= 0) {
    failures.push(`${routeLabel} 页面高度异常：${metrics.pageHeight}`);
  }

  return failures;
}

async function waitForBootIntroToFinish(page) {
  await page.locator('#boot-intro').waitFor({ state: 'hidden', timeout: 4_000 }).catch(() => {});
}

async function routeMetrics(page, route) {
  return page.evaluate((selectors) => {
    const doc = document.documentElement;
    const body = document.body;
    const visibleKeyElements = selectors.filter((selector) => {
      const element = document.querySelector(selector);
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0
        && rect.height > 0
        && style.visibility !== 'hidden'
        && style.display !== 'none';
    }).length;

    return {
      scrollWidth: Math.max(doc.scrollWidth, body?.scrollWidth ?? 0),
      clientWidth: doc.clientWidth,
      bodyWidth: Math.ceil(body?.getBoundingClientRect().width ?? 0),
      pageHeight: Math.max(doc.scrollHeight, body?.scrollHeight ?? 0),
      visibleKeyElements,
      keyElementCount: selectors.length,
    };
  }, route.keySelectors);
}

function screenshotName(route, viewport) {
  const routeSlug = route.path === '/' ? 'home' : route.path.replace(/^\/+/, '').replace(/[^a-z0-9-]/gi, '-');
  return `mobile-layout-${routeSlug}-${viewport.width}x${viewport.height}.png`;
}

async function checkMobileLayout(baseUrl) {
  if (!existsSync(defaultChromePath)) {
    fail(`缺少可执行浏览器：${defaultChromePath}。可设置 SMOKE_BROWSER_PATH。`);
  }

  mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    executablePath: defaultChromePath,
    headless: true,
  });
  const failures = [];

  try {
    for (const viewport of MOBILE_LAYOUT_VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      for (const route of MOBILE_LAYOUT_ROUTES) {
        const url = new URL(route.path, baseUrl).toString();
        if (route.demoSession === 'admin') {
          await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
          await page.evaluate(() => {
            const mockUser = {
              id: 'demo-admin-id',
              email: 'admin@example.com',
              user_metadata: { full_name: 'ATRI 管理员' },
            };
            sessionStorage.setItem('demo-session', JSON.stringify({
              session: { user: mockUser },
              user: mockUser,
              isAdmin: true,
            }));
          });
        }
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.locator(route.readySelector).first().waitFor({ state: 'visible', timeout: 15_000 });
        await waitForBootIntroToFinish(page);
        await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

        const metrics = await routeMetrics(page, route);
        failures.push(...assertRouteMetrics({ route, viewport, metrics }));

        await page.screenshot({
          path: join(outputDir, screenshotName(route, viewport)),
          fullPage: true,
        });
      }

      if (pageErrors.length > 0) {
        failures.push(`${viewport.width}x${viewport.height} 页面运行时错误：${pageErrors.join(' | ')}`);
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    fail(`移动端布局检查失败：\n- ${failures.join('\n- ')}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const localEnvOverrides = {
    VITE_SUPABASE_URL: '',
    VITE_SUPABASE_PUBLISHABLE_KEY: '',
    VITE_SUPABASE_ANON_KEY: '',
  };

  if (args.baseUrl) {
    log(`检查移动端布局：${args.baseUrl}`);
    await checkMobileLayout(args.baseUrl);
    log(`Mobile layout check passed. Artifacts: ${outputDir}`);
    return;
  }

  if (!args.skipBuild) {
    log('1/3 构建本地预览包（demo 数据模式）...');
    await spawnCommand('npm', ['run', 'build'], {
      env: { ...process.env, ...localEnvOverrides },
      label: 'mobile layout build',
    });
  } else {
    log('1/3 跳过构建，复用当前 dist。');
  }

  log('2/3 启动本地预览服务器...');
  const previewServer = startPreviewServer(args.port, localEnvOverrides);

  try {
    const baseUrl = `http://127.0.0.1:${args.port}`;
    await waitForHttp(baseUrl);
    log('3/3 执行移动端布局检查...');
    await checkMobileLayout(baseUrl);
  } finally {
    previewServer.stop();
  }

  log(`Mobile layout check passed. Artifacts: ${outputDir}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
