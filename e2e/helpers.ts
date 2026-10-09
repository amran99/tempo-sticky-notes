import type { Page } from '@playwright/test';

/** Draws a note via the toolbar's Add Note + drag gesture, same as a real user. */
export async function drawNote(page: Page, sx: number, sy: number, ex: number, ey: number) {
  await page.getByRole('button', { name: 'Add Note' }).click();
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(ex, ey, { steps: 6 });
  await page.waitForTimeout(20);
  await page.mouse.up();
  await page.waitForTimeout(20);
}

export async function resetBoard(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

/** Pulls one numeric px value out of an inline style string, e.g. "left: 12px". */
export function styleValue(style: string | null, prop: string): number | null {
  const match = new RegExp(`${prop}:\\s*([\\d.]+)px`).exec(style ?? '');
  return match ? Number(match[1]) : null;
}
