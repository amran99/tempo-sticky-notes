export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; width: number; height: number }
export interface Delta { dx: number; dy: number }
export interface Size { width: number; height: number }

export const MIN_WIDTH = 80;
export const MIN_HEIGHT = 60;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function computeMovePosition(startRect: Rect, delta: Delta, canvas: Size): Point {
  const x = clamp(startRect.x + delta.dx, 0, Math.max(0, canvas.width - startRect.width));
  const y = clamp(startRect.y + delta.dy, 0, Math.max(0, canvas.height - startRect.height));
  return { x, y };
}

export function computeResizeDimensions(startRect: Rect, delta: Delta, canvas: Size): Size {
  const width = clamp(startRect.width + delta.dx, MIN_WIDTH, Math.max(MIN_WIDTH, canvas.width - startRect.x));
  const height = clamp(startRect.height + delta.dy, MIN_HEIGHT, Math.max(MIN_HEIGHT, canvas.height - startRect.y));
  return { width, height };
}

/** Minimum fraction of the drop zone's area a dragged note must cover to count as "over" it. */
export const DELETE_OVERLAP_THRESHOLD = 0.3;

/** Fraction (0-1) of rect `b`'s area that overlaps with rect `a`. */
export function overlapFraction(a: Rect, b: Rect): number {
  const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  const bArea = b.width * b.height;
  return bArea > 0 ? (overlapX * overlapY) / bArea : 0;
}

/** Builds a rect from two arbitrary corner points, so a draw gesture works in any direction. */
export function normalizeRect(a: Point, b: Point): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) };
}

/** Clamps a rect's origin and size so it stays fully within the canvas bounds. */
export function clampRectToCanvas(rect: Rect, canvas: Size): Rect {
  const x = clamp(rect.x, 0, canvas.width);
  const y = clamp(rect.y, 0, canvas.height);
  const width = clamp(rect.width, 0, canvas.width - x);
  const height = clamp(rect.height, 0, canvas.height - y);
  return { x, y, width, height };
}
