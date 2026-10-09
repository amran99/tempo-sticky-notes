import { test, expect } from '@playwright/test';

test('a note persisted at a larger viewport is repositioned back into view at the minimum viewport', async ({ page }) => {
  // Seed localStorage directly, as if the note had been created on a wide
  // screen (x=1800), then load the app at the app's stated minimum supported
  // viewport (1024x768).
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('sticky-notes', JSON.stringify([
      { id: 'a', x: 1800, y: 900, width: 200, height: 150, text: 'off-screen', color: '#fef08a', zIndex: 1 },
    ]));
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.reload();
  await page.waitForTimeout(100);

  const header = page.locator('[class*="header"]').first();
  const noteRoot = header.locator('xpath=..');
  const box = await noteRoot.boundingBox();
  if (!box) throw new Error('note not found');
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(1024);
  expect(box.y + box.height).toBeLessThanOrEqual(768);
  expect(box.width).toBeCloseTo(200); // repositioned, not shrunk - it still fits
});

test('shrinking the browser window repositions an already-visible note back into bounds', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.reload();

  await page.getByRole('button', { name: 'Add Note' }).click();
  await page.mouse.move(1250, 750);
  await page.mouse.down();
  await page.mouse.move(1380, 870, { steps: 5 });
  await page.waitForTimeout(20);
  await page.mouse.up();
  await page.waitForTimeout(20);

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(150); // resize listener + reducer update

  const header = page.locator('[class*="header"]').first();
  const noteRoot = header.locator('xpath=..');
  const box = await noteRoot.boundingBox();
  if (!box) throw new Error('note not found');
  expect(box.x + box.width).toBeLessThanOrEqual(1024);
  expect(box.y + box.height).toBeLessThanOrEqual(768);
});
