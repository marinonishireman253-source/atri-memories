import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const templatePath = join(root, 'docs', 'MANUAL_QA_TEMPLATE.md');
const runsDir = join(root, 'docs', 'manual-qa-runs');
const runsDirLabel = 'docs/manual-qa-runs';

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = 'true';
      continue;
    }
    options[key] = next;
    index += 1;
  }
  return options;
}

function printHelp() {
  console.log(`用法：
  npm run qa:init -- --env staging
  npm run qa:init -- --env production --slug prelaunch
  npm run qa:init -- --env local --date 2026-05-25 --owner kuzao

可选参数：
  --env <name>      验收环境名，默认 local
  --date <yyyy-mm-dd>
  --slug <text>     追加到文件名里的短标识
  --owner <name>    预填执行人
  --site <url>      预填站点域名
  --force           已存在时覆盖
  --help            显示帮助
`);
}

function sanitizeSegment(value, fallback) {
  return (value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || fallback;
}

function resolveDate(input) {
  if (input) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      throw new Error('`--date` 必须是 YYYY-MM-DD 格式。');
    }
    return input;
  }
  return new Date().toISOString().slice(0, 10);
}

function buildOutputPath({ date, envName, slug }) {
  const parts = [date, envName];
  if (slug) parts.push(slug);
  parts.push('manual-qa');
  return join(runsDir, `${parts.join('-')}.md`);
}

function renderRunDocument(template, { date, envLabel, owner, site, outputPath }) {
  return template
    .replace('# 上线前手工验收模板', '# 手工验收记录')
    .replace(
      /用途：[\s\S]*?---\n\n/,
      `用途：本文件由 \`npm run qa:init\` 自动生成，用于记录一次真实的手工验收执行结果。\n\n<!-- QA_AUDIT_STATUS: pending -->\n<!-- QA_AUDIT_ENV: ${envLabel} -->\n<!-- QA_AUDIT_DATE: ${date} -->\n\n- 生成时间：${new Date().toISOString()}\n- 归档目录：\`${runsDirLabel}\`\n- 记录文件：\`${outputPath}\`\n- 模板来源：\`docs/MANUAL_QA_TEMPLATE.md\`\n\n---\n\n`,
    )
    .replace('- 执行日期：', `- 执行日期：${date}`)
    .replace('- 执行环境：`local / staging / production`', `- 执行环境：\`${envLabel}\``)
    .replace('- 执行人：', `- 执行人：${owner || ''}`)
    .replace('- 站点域名：', `- 站点域名：${site || ''}`);
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help === 'true') {
    printHelp();
    process.exit(0);
  }

  const date = resolveDate(options.date);
  const envName = sanitizeSegment(options.env, 'local');
  const slug = options.slug ? sanitizeSegment(options.slug, '') : '';
  const outputPath = buildOutputPath({ date, envName, slug });

  mkdirSync(runsDir, { recursive: true });

  if (existsSync(outputPath) && options.force !== 'true') {
    throw new Error(`目标文件已存在：${outputPath}\n如需覆盖，请追加 --force`);
  }

  const template = readFileSync(templatePath, 'utf8');
  const rendered = renderRunDocument(template, {
    date,
    envLabel: options.env || 'local',
    owner: options.owner,
    site: options.site,
    outputPath: outputPath.replace(`${root}/`, ''),
  });

  writeFileSync(outputPath, rendered, 'utf8');

  console.log(`归档目录：${runsDirLabel}`);
  console.log(`已生成手工验收记录：${outputPath}`);
  console.log('下一步：填写自动化结果、页面验收结果和附加证据。');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
