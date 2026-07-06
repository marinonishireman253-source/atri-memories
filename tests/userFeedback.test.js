import assert from 'node:assert/strict';
import test from 'node:test';

import { errorNotice } from '../src/lib/userFeedback.js';

test('maps invalid login credentials to a clear account/password notice', () => {
  const notice = errorNotice('Invalid login credentials');

  assert.equal(notice.title, '账号或密码不正确');
  assert.equal(notice.body, '请检查邮箱和密码后再试。');
  assert.equal(notice.tone, 'error');
  assert.equal(notice.icon, '!');
});

test('keeps unknown errors visible for diagnosis', () => {
  const notice = errorNotice('Unexpected auth failure');

  assert.equal(notice.title, '操作未完成');
  assert.equal(notice.body, 'Unexpected auth failure');
});
