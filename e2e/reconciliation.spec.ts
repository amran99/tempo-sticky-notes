import { test, expect } from '@playwright/test';
import { drawNote, resetBoard, styleValue } from './helpers';

test.beforeEach(async ({ page }) => {
  await resetBoard(page);
});

test('committing a move back to the exact starting position clears the DOM transform', async ({ page }) => {
  await drawNote(page, 300, 300, 500, 440);
  const header = page.locator('[class*="header"]').first();
  const noteRoot = header.locator('xpath=..');
  const before = await noteRoot.evaluate((el) => el.getAttribute('style'));
  const leftBefore = styleValue(before, 'left');
  const topBefore = styleValue(before, 'top');

  const hb = await header.boundingBox();
  if (!hb) throw new Error('header not found');
  const cx = hb.x + hb.width / 2;
  const cy = hb.y + hb.height / 2;

  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 80, cy + 60, { steps: 5 });
  await page.waitForTimeout(30);
  // Drag back to the exact pointerdown position - the final committed x/y will
  // equal the note's original x/y, the one case where a cleanup effect keyed on
  // those values would never re-fire.
  await page.mouse.move(cx, cy, { steps: 5 });
  await page.waitForTimeout(30);
  await page.mouse.up();
  await page.waitForTimeout(100);

  const after = await noteRoot.evaluate((el) => el.getAttribute('style'));
  // left/top must be exactly back to where they started (not just "close",
  // since a leftover transform would silently shift the visible position
  // without changing these declarative values at all).
  expect(styleValue(after, 'left')).toBe(leftBefore);
  expect(styleValue(after, 'top')).toBe(topBefore);
  expect(after).not.toContain('transform');
});

test('committing a resize back to the exact starting size clears the DOM width/height override', async ({ page }) => {
  await drawNote(page, 300, 300, 500, 440);
  const handle = page.getByLabel('Resize note').first();
  const noteRoot = handle.locator('xpath=..');
  const before = await noteRoot.evaluate((el) => el.getAttribute('style'));
  const widthBefore = styleValue(before, 'width');
  const heightBefore = styleValue(before, 'height');

  const rb = await handle.boundingBox();
  if (!rb) throw new Error('handle not found');
  const cx = rb.x + rb.width / 2;
  const cy = rb.y + rb.height / 2;

  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 60, cy + 40, { steps: 5 });
  await page.waitForTimeout(30);
  // Drag the handle back to its own starting position - final width/height will
  // equal the note's original size. React's style diffing then sees no change
  // in the width/height style values and would skip reapplying them.
  await page.mouse.move(cx, cy, { steps: 5 });
  await page.waitForTimeout(30);
  await page.mouse.up();
  await page.waitForTimeout(100);

  const after = await noteRoot.evaluate((el) => el.getAttribute('style'));
  expect(styleValue(after, 'width')).toBe(widthBefore);
  expect(styleValue(after, 'height')).toBe(heightBefore);
});
