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

/** Minimum fraction of the smaller rect's area that must be covered to count as "over". */
export const DELETE_OVERLAP_THRESHOLD = 0.3;

/**
 * Fraction (0-1) of overlap between two rects, relative to the SMALLER of the two
 * areas. Relative to a fixed rect (e.g. always the drop zone) a small dragged rect
 * could never reach a meaningful fraction even when fully contained inside a much
 * larger one - e.g. an 80x60 note inside a 168x128 drop zone covers at most ~22%
 * of the zone's area no matter how it's positioned. Measuring against whichever
 * rect is smaller means full containment of either rect always yields 1.
 */
export function overlapFraction(a: Rect, b: Rect): number {
  const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  const overlapArea = overlapX * overlapY;
  const smallerArea = Math.min(a.width * a.height, b.width * b.height);
  return smallerArea > 0 ? overlapArea / smallerArea : 0;
}

/** Builds a rect from two arbitrary corner points, so a draw gesture works in any direction. */
export function normalizeRect(a: Point, b: Point): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) };
}

/**
 * Resolves a create-by-draw gesture (used live for the preview and again at
 * commit, so both agree) into a final rect: normalizes the two corner points,
 * enforces the minimum note size, THEN clamps the origin against the already-
 * final width/height. Clamping width against "remaining space from a fixed x"
 * (the previous approach) could force width up to MIN_WIDTH without moving x,
 * leaving x + width past the canvas edge for a draw gesture started near the
 * right/bottom edge - the note would be created partly or wholly off-screen.
 */
export function resolveCreateRect(origin: Point, current: Point, canvas: Size): Rect {
  const normalized = normalizeRect(origin, current);
  const width = clamp(normalized.width, MIN_WIDTH, Math.max(MIN_WIDTH, canvas.width));
  const height = clamp(normalized.height, MIN_HEIGHT, Math.max(MIN_HEIGHT, canvas.height));
  const x = clamp(normalized.x, 0, Math.max(0, canvas.width - width));
  const y = clamp(normalized.y, 0, Math.max(0, canvas.height - height));
  return { x, y, width, height };
}
