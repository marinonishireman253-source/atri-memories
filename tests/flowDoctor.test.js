import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { analyzeFlowState, exitCodeForAnalysis, renderFlowReport } from '../scripts/flow-doctor.mjs';

function cleanInput(overrides = {}) {
  return {
    branchName: 'codex/flow-doctor',
    isLinkedWorktree: true,
    statusLines: [],
    mainExists: true,
    originMainExists: true,
    mainHasOriginMergeBase: true,
    mainAhead: 0,
    mainBehind: 0,
    hasPackageJson: true,
    hasNodeModules: true,
    ...overrides,
  };
}

test('clean workflow state passes default and strict diagnosis', () => {
  const analysis = analyzeFlowState(cleanInput(), { strict: true });

  assert.equal(analysis.status, 'ok');
  assert.deepEqual(analysis.failures, []);
  assert.equal(exitCodeForAnalysis(analysis), 0);
  assert.match(renderFlowReport(analysis), /\[OK\] 当前分支：codex\/flow-doctor/);
});

test('dirty working tree warns by default and fails in strict mode', () => {
  const input = cleanInput({ isLinkedWorktree: false, statusLines: [' M src/App.jsx'] });
  const defaultAnalysis = analyzeFlowState(input, { strict: false });
  const strictAnalysis = analyzeFlowState(input, { strict: true });

  assert.equal(defaultAnalysis.status, 'warn');
  assert.match(renderFlowReport(defaultAnalysis), /工作区有 1 条未提交改动/);
  assert.equal(exitCodeForAnalysis(defaultAnalysis), 0);
  assert.equal(strictAnalysis.status, 'fail');
  assert.equal(exitCodeForAnalysis(strictAnalysis), 1);
});

test('diverged main and origin main fails strict mode', () => {
  const analysis = analyzeFlowState(cleanInput({ mainAhead: 51, mainBehind: 1 }), { strict: true });

  assert.equal(analysis.status, 'fail');
  assert.match(renderFlowReport(analysis), /main 与 origin\/main 已分叉：本地 ahead 51，behind 1/);
});

test('unrelated local and origin main histories fail strict mode before merge attempts', () => {
  const input = cleanInput({
    mainHasOriginMergeBase: false,
    mainAhead: 51,
    mainBehind: 1,
  });
  const defaultAnalysis = analyzeFlowState(input, { strict: false });
  const strictAnalysis = analyzeFlowState(input, { strict: true });

  assert.equal(defaultAnalysis.status, 'warn');
  assert.match(renderFlowReport(defaultAnalysis), /main 与 origin\/main 没有共同祖先/);
  assert.equal(exitCodeForAnalysis(defaultAnalysis), 0);
  assert.equal(strictAnalysis.status, 'fail');
  assert.equal(exitCodeForAnalysis(strictAnalysis), 1);
});

test('missing node_modules is a strict failure for node projects', () => {
  const analysis = analyzeFlowState(cleanInput({ hasNodeModules: false }), { strict: true });

  assert.equal(analysis.status, 'fail');
  assert.match(renderFlowReport(analysis), /缺少 node_modules/);
});

test('missing current branch is always a failure', () => {
  const analysis = analyzeFlowState(cleanInput({ branchName: '' }), { strict: false });

  assert.equal(analysis.status, 'fail');
  assert.match(renderFlowReport(analysis), /无法确定当前分支/);
  assert.equal(exitCodeForAnalysis(analysis), 1);
});

test('package scripts expose flow doctor commands', () => {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

  assert.equal(packageJson.scripts['flow:doctor'], 'node scripts/flow-doctor.mjs');
  assert.equal(packageJson.scripts['flow:doctor:test'], 'node --test tests/flowDoctor.test.js');
  assert.match(packageJson.scripts['project:check'], /npm run flow:doctor:test/);
});
