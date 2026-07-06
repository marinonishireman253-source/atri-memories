import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGalleryFilterChips,
  hasGalleryRefinements,
} from '../src/features/gallery/galleryFilterSummaryModel.js';

const defaultFilters = {
  query: '',
  dateRange: 'all',
  tag: 'all',
  ownerId: 'all',
  ownerLabel: '',
  favoritesOnly: false,
  sortBy: 'created_at',
  sortDir: 'desc',
};

test('builds an owner chip with a reset patch', () => {
  const chips = buildGalleryFilterChips({
    ...defaultFilters,
    ownerId: 'user-123',
    ownerLabel: 'atri@example.com',
  });

  assert.deepEqual(chips, [
    {
      key: 'owner',
      label: '上传者：atri@example.com',
      resetPatch: {
        ownerId: 'all',
        ownerLabel: '',
      },
    },
  ]);
});

test('falls back to owner id when owner label is blank', () => {
  const chips = buildGalleryFilterChips({
    ...defaultFilters,
    ownerId: 'user-123',
    ownerLabel: '',
  });

  assert.equal(chips[0]?.label, '上传者：user-123');
});

test('owner filter counts as a gallery refinement', () => {
  assert.equal(
    hasGalleryRefinements({
      ...defaultFilters,
      ownerId: 'user-123',
      ownerLabel: 'atri@example.com',
    }),
    true,
  );
});

test('blank owner id is still a non-default owner refinement', () => {
  const chips = buildGalleryFilterChips({
    ...defaultFilters,
    ownerId: '',
    ownerLabel: '',
  });

  assert.deepEqual(chips, [
    {
      key: 'owner',
      label: '上传者：',
      resetPatch: {
        ownerId: 'all',
        ownerLabel: '',
      },
    },
  ]);
});

test('keeps query owner tag chip ordering for mixed filters', () => {
  const chips = buildGalleryFilterChips({
    ...defaultFilters,
    query: 'atri',
    ownerId: 'user-123',
    ownerLabel: 'atri@example.com',
    tag: 'portrait',
  });

  assert.deepEqual(
    chips.map((chip) => chip.key),
    ['query', 'owner', 'tag'],
  );
});
