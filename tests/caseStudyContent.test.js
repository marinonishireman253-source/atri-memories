import test from 'node:test';
import assert from 'node:assert/strict';

import {
  caseStudyDemoChecklist,
  caseStudyEvidenceCommands,
  caseStudyPage,
  caseStudyProductDecisions,
  caseStudySections,
} from '../src/lib/caseStudyContent.js';

test('defines the public case study content contract', () => {
  assert.equal(caseStudyPage.route, '/case-study');
  assert.equal(caseStudyPage.heading, '项目案例');
  assert.equal(caseStudyPage.demoChecklistTitle, '产品浏览路径');
  assert.ok(caseStudySections.length >= 6);
  assert.ok(caseStudyEvidenceCommands.length >= 6);
  assert.ok(caseStudyDemoChecklist.length >= 5);

  const sectionTitles = caseStudySections.map((section) => section.title);
  assert.ok(sectionTitles.includes('权限模型'));
  assert.ok(sectionTitles.includes('部署与验证'));

  const serializedContent = JSON.stringify({
    caseStudyPage,
    caseStudySections,
    caseStudyEvidenceCommands,
    caseStudyProductDecisions,
    caseStudyDemoChecklist,
  });

  assert.doesNotMatch(serializedContent, /service[_ -]?role/i);
  assert.doesNotMatch(serializedContent, /(?:\d{1,3}\.){3}\d{1,3}/);
  assert.doesNotMatch(serializedContent, /https?:\/\/[a-z0-9-]+\.supabase\.co/i);
  assert.doesNotMatch(serializedContent, /\b[a-z0-9]{20}\b/i);

  for (const command of [
    'npm run verify',
    'npm run smoke',
    'npm run release:preflight',
  ]) {
    assert.match(serializedContent, new RegExp(command.replaceAll(' ', '\\s+')));
  }
  assert.doesNotMatch(serializedContent, /\u9762\u8bd5/);
  assert.match(serializedContent, /产品浏览路径/);
});
