import { test, expect } from '@playwright/test';
import { drawNote, resetBoard, styleValue } from './helpers';

test.beforeEach(async ({ page }) => {
  await resetBoard(page);
});

test('a secondary (right) mouse button does not start a drag', async ({ page }) => {
  await drawNote(page, 300, 300, 500, 440);
  const header = page.locator('[class*="header"]').first();
  const noteRoot = header.locator('xpath=..');
  const before = await noteRoot.evaluate((el) => el.getAttribute('style'));
  const leftBefore = styleValue(before, 'left');
  const topBefore = styleValue(before, 'top');

  const hb = await header.boundingBox();
  if (!hb) throw new Error('header not found');
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(hb.x + 150, hb.y + 100, { steps: 5 });
  await page.waitForTimeout(50);
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(50);

  // Position must be completely untouched (a right-click still bubbles to the
  // outer div's own pointerdown, which brings the note to front regardless of
  // button - that's unrelated to whether a drag started, so zIndex is not
  // checked here).
  const after = await noteRoot.evaluate((el) => el.getAttribute('style'));
  expect(styleValue(after, 'left')).toBe(leftBefore);
  expect(styleValue(after, 'top')).toBe(topBefore);
  expect(after).not.toContain('transform');
});

test('a second pointer cannot hijack an in-progress drag', async ({ page }) => {
  await drawNote(page, 300, 300, 500, 440);
  const header = page.locator('[class*="header"]').first();
  const noteRoot = header.locator('xpath=..');
  const beforeStyle = await noteRoot.evaluate((el) => el.getAttribute('style'));
  const leftBefore = styleValue(beforeStyle, 'left');
  const topBefore = styleValue(beforeStyle, 'top');

  const hb = await header.boundingBox();
  if (!hb) throw new Error('header not found');
  const startX = hb.x + hb.width / 2;
  const startY = hb.y + hb.height / 2;

  // Raw PointerEvents with distinct pointerIds, since Playwright's mouse API
  // only models a single cursor and can't simulate two concurrent pointers.
  await page.evaluate(
    ({ startX, startY }) => {
      const el = document.querySelector('[class*="header"]') as HTMLElement;
      el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: startX, clientY: startY, button: 0, bubbles: true }));
      el.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: startX + 40, clientY: startY + 30, button: 0, bubbles: true }));
      // A second, distinct pointer presses down on the same element mid-drag -
      // must be ignored, not hijack the active interaction.
      el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, clientX: startX + 500, clientY: startY + 500, button: 0, bubbles: true }));
    },
    { startX, startY },
  );
  await page.waitForTimeout(80); // let the rAF-batched frame apply

  const midTransform = await noteRoot.evaluate((el) => (el as HTMLElement).style.transform);
  expect(midTransform).toBe('translate(40px, 30px)'); // still only pointer 1's delta

  // Pointer 1 finishes its own drag - must still be honored despite pointer 2's
  // intervening (and ignored) pointerdown.
  await page.evaluate(
    ({ startX, startY }) => {
      const el = document.querySelector('[class*="header"]') as HTMLElement;
      el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: startX + 40, clientY: startY + 30, button: 0, bubbles: true }));
    },
    { startX, startY },
  );
  await page.waitForTimeout(80);

  if (leftBefore === null || topBefore === null) throw new Error('could not read initial position');
  const afterStyle = await noteRoot.evaluate((el) => el.getAttribute('style'));
  expect(styleValue(afterStyle, 'left')).toBeCloseTo(leftBefore + 40);
  expect(styleValue(afterStyle, 'top')).toBeCloseTo(topBefore + 30);
  expect(afterStyle).not.toContain('transform');
});
