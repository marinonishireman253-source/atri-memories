import test from 'node:test';
import assert from 'node:assert/strict';

import { adminDemoSummaryCards } from '../src/lib/adminDemoSummary.js';

test('builds four admin operations cards from overview summary', () => {
  const cards = adminDemoSummaryCards({
    total_memories: 42,
    uploaded_24h: 3,
    uploaded_7d: 9,
    total_storage_bytes: 10485760,
    total_users: 8,
    admin_count: 2,
    unconfirmed_users: 1,
    disabled_upload_users: 1,
    open_reports_count: 4,
    resolved_reports_count: 6,
    dismissed_reports_count: 2,
    registrations_enabled: false,
    uploads_enabled: true,
    legacy_count: 1,
    unknown_size_count: 2,
    hidden_count: 3,
  }, {
    currentOrigin: 'https://example.test',
  });

  assert.deepEqual(
    cards.map((card) => card.key),
    ['content-ops', 'permissions', 'governance', 'launch-readiness'],
  );
  assert.deepEqual(
    cards.map((card) => card.targetTab),
    ['images', 'users', 'reports', 'settings'],
  );
  assert.equal(cards[0].title, '内容运营');
  assert.match(cards[0].value, /42/);
  assert.match(cards[0].detail, /24 小时新增 3 张/);
  assert.equal(cards[1].title, '账号权限');
  assert.match(cards[1].detail, /2 个管理员/);
  assert.equal(cards[2].title, '治理队列');
  assert.match(cards[2].value, /4/);
  assert.equal(cards[3].title, '上线准备');
  assert.equal(cards[3].tone, 'ok');
  assert.match(cards[3].detail, /邀请制/);
});

test('classifies non-production origins as launch readiness warnings', () => {
  const localOrigins = [
    '',
    'not-a-url',
    'file:///tmp/index.html',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://0.0.0.0:5173',
    'http://10.0.0.2:5173',
    'http://172.16.1.5:5173',
    'http://192.168.1.10:5173',
    'http://169.254.1.10:5173',
    'http://[::1]:5173',
    'http://[::]:5173',
    'http://[::ffff:127.0.0.1]:5173',
    'http://[::ffff:192.168.1.1]:5173',
    'http://[fe80::1]:5173',
    'http://[febf::1]:5173',
    'http://[fc00::1]:5173',
    'http://[fd00::1]:5173',
    'http://atri-dev.local:5173',
    'http://app.localhost:5173',
    'http://localhost.:5173',
    'http://app.localhost.:5173',
    'http://atri-dev.local.:5173',
  ];

  for (const origin of localOrigins) {
    const readiness = adminDemoSummaryCards(undefined, { currentOrigin: origin })
      .find((card) => card.key === 'launch-readiness');

    assert.equal(readiness.tone, 'warning', origin);
    assert.match(readiness.value, /本地/, origin);
  }
});

test('classifies public http origins as production launch readiness', () => {
  const readiness = adminDemoSummaryCards(undefined, { currentOrigin: 'https://example.test' })
    .find((card) => card.key === 'launch-readiness');

  assert.equal(readiness.tone, 'ok');
  assert.match(readiness.value, /生产/);
});

test('uses overview fallbacks when summary is missing', () => {
  const cards = adminDemoSummaryCards(undefined, { currentOrigin: 'https://example.test' });
  const readiness = cards.find((card) => card.key === 'launch-readiness');

  assert.equal(cards.length, 4);
  assert.match(cards[0].value, /0/);
  assert.equal(readiness.tone, 'ok');
});
