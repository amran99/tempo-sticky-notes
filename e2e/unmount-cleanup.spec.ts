import { test, expect } from '@playwright/test';
import { drawNote, resetBoard } from './helpers';

test.beforeEach(async ({ page }) => {
  await resetBoard(page);
});

test('deleting the selected note via keyboard mid-drag does not throw and leaves the app usable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await drawNote(page, 300, 300, 500, 440);
  const header = page.locator('[class*="header"]').first();
  const hb = await header.boundingBox();
  if (!hb) throw new Error('header not found');

  // Start a drag (which also selects the note) but never release the pointer -
  // then delete it via the keyboard while the hook's interaction is still
  // active and a frame may be pending.
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + 50, hb.y + 30, { steps: 5 });
  await page.keyboard.press('Delete');
  await page.waitForTimeout(100); // give any stray pending rAF a chance to fire

  await expect(page.locator('[class*="header"]')).toHaveCount(0);
  await page.mouse.up(); // release the now-dangling physical pointer press

  // The app should still be fully usable afterward - no leftover drag/armed
  // state blocking further interaction.
  await drawNote(page, 600, 300, 750, 400);
  await expect(page.locator('[class*="header"]')).toHaveCount(1);
  await expect(page.getByLabel('Delete note drop zone')).not.toHaveClass(/armed/);

  expect(errors).toEqual([]);
});
