import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  analyzePublicSnapshotState,
  exitCodeForPublicSnapshotAnalysis,
  renderPublicSnapshotReport,
} from '../scripts/public-snapshot-doctor.mjs';

function cleanInput(overrides = {}) {
  return {
    branchName: 'codex/public-snapshot-workflow',
    statusLines: [],
    localMainExists: true,
    publicMainExists: true,
    hasMergeBase: false,
    localAhead: 56,
    localBehind: 1,
    hasPublicWorkflowDoc: true,
    ...overrides,
  };
}

test('isolated public snapshot history is the expected safe double-track shape', () => {
  const analysis = analyzePublicSnapshotState(cleanInput(), { strict: true });

  assert.equal(analysis.status, 'ok');
  assert.equal(exitCodeForPublicSnapshotAnalysis(analysis), 0);
  assert.match(renderPublicSnapshotReport(analysis), /公开快照历史与本地开发历史已隔离/);
});

test('dirty working tree warns by default and fails strict mode', () => {
  const input = cleanInput({ statusLines: [' M README.md'] });
  const defaultAnalysis = analyzePublicSnapshotState(input, { strict: false });
  const strictAnalysis = analyzePublicSnapshotState(input, { strict: true });

  assert.equal(defaultAnalysis.status, 'warn');
  assert.equal(exitCodeForPublicSnapshotAnalysis(defaultAnalysis), 0);
  assert.equal(strictAnalysis.status, 'fail');
  assert.match(renderPublicSnapshotReport(strictAnalysis), /工作区有 1 条未提交改动/);
});

test('missing refs fail strict mode', () => {
  const analysis = analyzePublicSnapshotState(cleanInput({ publicMainExists: false }), { strict: true });

  assert.equal(analysis.status, 'fail');
  assert.match(renderPublicSnapshotReport(analysis), /origin\/main 不存在/);
});

test('shared main history fails strict mode because the public line is no longer isolated', () => {
  const analysis = analyzePublicSnapshotState(cleanInput({ hasMergeBase: true }), { strict: true });

  assert.equal(analysis.status, 'fail');
  assert.match(renderPublicSnapshotReport(analysis), /不再是隔离的公开快照历史/);
});

test('missing public workflow document fails strict mode', () => {
  const analysis = analyzePublicSnapshotState(cleanInput({ hasPublicWorkflowDoc: false }), { strict: true });

  assert.equal(analysis.status, 'fail');
  assert.match(renderPublicSnapshotReport(analysis), /缺少 docs\/PUBLIC_REPO_WORKFLOW.md/);
});

test('package scripts expose public snapshot doctor commands', () => {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

  assert.equal(packageJson.scripts['public:snapshot:doctor'], 'node scripts/public-snapshot-doctor.mjs');
  assert.equal(packageJson.scripts['public:snapshot:doctor:test'], 'node --test tests/publicSnapshotDoctor.test.js');
  assert.match(packageJson.scripts['project:check'], /npm run public:snapshot:doctor:test/);
});
