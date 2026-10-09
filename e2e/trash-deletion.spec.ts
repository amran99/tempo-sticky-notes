import { test, expect } from '@playwright/test';
import { drawNote, resetBoard } from './helpers';

test.beforeEach(async ({ page }) => {
  await resetBoard(page);
});

test('a minimum-size note can be deleted via the trash drop zone', async ({ page }) => {
  // A near-zero drag creates an 80x60 minimum-size note. This is the exact
  // reported bug: overlapFraction used to measure overlap as a fraction of the
  // trash zone's own area, so a minimum-size note could never cross the 30%
  // threshold even positioned fully inside the (much larger) expanded zone.
  await drawNote(page, 200, 200, 202, 201);
  const headers = page.locator('[class*="header"]');
  await expect(headers).toHaveCount(1);

  const header = headers.first();
  const hb = await header.boundingBox();
  if (!hb) throw new Error('header not found');
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + 30, hb.y + 20, { steps: 5 }); // expand the drop zone
  await page.waitForTimeout(50);

  const trash = page.getByLabel('Delete note drop zone');
  const tb = await trash.boundingBox();
  if (!tb) throw new Error('trash zone not found');
  await page.mouse.move(tb.x + tb.width / 2 - hb.width / 2, tb.y + tb.height / 2 - hb.height / 2, { steps: 15 });
  await page.waitForTimeout(60);
  await expect(trash).toHaveClass(/armed/);

  await page.mouse.up();
  await expect(headers).toHaveCount(0);
});

test('a note that only grazes the drop zone (below the overlap threshold) is not deleted', async ({ page }) => {
  await drawNote(page, 200, 200, 380, 320);
  const header = page.locator('[class*="header"]').first();
  const hb = await header.boundingBox();
  if (!hb) throw new Error('header not found');
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + 20, hb.y + 10, { steps: 5 });
  await page.waitForTimeout(40);

  const trash = page.getByLabel('Delete note drop zone');
  const tb = await trash.boundingBox();
  if (!tb) throw new Error('trash zone not found');
  // Nudge just the corner of the note into the zone - a small sliver, not a
  // meaningful overlap.
  await page.mouse.move(tb.x - hb.width * 0.85, tb.y - hb.height * 0.1, { steps: 10 });
  await page.waitForTimeout(60);
  await expect(trash).not.toHaveClass(/armed/);

  await page.mouse.up();
  await expect(page.locator('[class*="header"]')).toHaveCount(1);
});
