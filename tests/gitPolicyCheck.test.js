import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isValidBranchName,
  isValidCommitSubject,
  normalizeBranchName,
  validateWhitespaceClean,
} from '../scripts/git-policy-check.mjs';

test('accepts protected and task branch names used by the project', () => {
  for (const branch of [
    'main',
    'codex/git-standard',
    'feat/mobile-home',
    'fix/blog-tags',
    'docs/git-workflow',
    'release/2026-06-30',
    'hotfix/gallery-cache',
  ]) {
    assert.equal(isValidBranchName(branch), true, branch);
  }
});

test('rejects branch names that make review and release history noisy', () => {
  for (const branch of [
    '',
    'Feature/mobile-home',
    'fix/',
    'tmp/test',
    'main/extra',
    'feat/mobile_home',
    'hotfix/Gallery-Cache',
  ]) {
    assert.equal(isValidBranchName(branch), false, branch);
  }
});

test('normalizes local and GitHub branch references before validation', () => {
  assert.equal(normalizeBranchName('refs/heads/codex/git-standard'), 'codex/git-standard');
  assert.equal(normalizeBranchName('origin/fix/blog-tags'), 'fix/blog-tags');
});

test('validates conventional commit subjects used in git history', () => {
  for (const subject of [
    'feat: add blog and visual site updates',
    'fix: speed up gallery image loading',
    'chore(git): add project workflow checks',
    'ci: run project verification on pull requests',
  ]) {
    assert.equal(isValidCommitSubject(subject), true, subject);
  }
});

test('rejects vague or oversized commit subjects', () => {
  for (const subject of [
    '',
    'update things',
    'feat add missing colon',
    'Fix: uppercase type',
    'feat: ',
    `docs: ${'x'.repeat(80)}`,
  ]) {
    assert.equal(isValidCommitSubject(subject), false, subject);
  }
});

test('reports git diff whitespace failures with the checked range', () => {
  const failures = validateWhitespaceClean([
    ['main...HEAD', { ok: false, output: 'src/example.css:1: trailing whitespace.' }],
    ['working tree', { ok: true, output: '' }],
  ]);

  assert.deepEqual(failures, [
    'Git diff whitespace check failed (main...HEAD): src/example.css:1: trailing whitespace.',
  ]);
});
