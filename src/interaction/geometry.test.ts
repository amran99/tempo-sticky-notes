import { describe, it, expect } from 'vitest';
import {
  clamp,
  computeMovePosition,
  computeResizeDimensions,
  overlapFraction,
  normalizeRect,
  resolveCreateRect,
  MIN_WIDTH,
  MIN_HEIGHT,
} from './geometry';

const canvas = { width: 1000, height: 800 };

describe('clamp', () => {
  it('clamps below min and above max', () => {
    expect(clamp(-10, 0, 100)).toBe(0);
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(50, 0, 100)).toBe(50);
  });
});

describe('computeMovePosition', () => {
  const startRect = { x: 100, y: 100, width: 200, height: 150 };

  it('applies the delta under normal conditions', () => {
    expect(computeMovePosition(startRect, { dx: 20, dy: -10 }, canvas)).toEqual({ x: 120, y: 90 });
  });

  it('clamps so the note cannot move past the left/top canvas edge', () => {
    expect(computeMovePosition(startRect, { dx: -500, dy: -500 }, canvas)).toEqual({ x: 0, y: 0 });
  });

  it('clamps so the note cannot move past the right/bottom canvas edge', () => {
    expect(computeMovePosition(startRect, { dx: 5000, dy: 5000 }, canvas)).toEqual({
      x: canvas.width - startRect.width,
      y: canvas.height - startRect.height,
    });
  });
});

describe('computeResizeDimensions', () => {
  const startRect = { x: 100, y: 100, width: 200, height: 150 };

  it('applies the delta under normal conditions', () => {
    expect(computeResizeDimensions(startRect, { dx: 50, dy: 30 }, canvas)).toEqual({ width: 250, height: 180 });
  });

  it('clamps to the minimum note size', () => {
    expect(computeResizeDimensions(startRect, { dx: -1000, dy: -1000 }, canvas)).toEqual({
      width: MIN_WIDTH,
      height: MIN_HEIGHT,
    });
  });

  it('clamps so the note cannot grow past the canvas edge', () => {
    expect(computeResizeDimensions(startRect, { dx: 5000, dy: 5000 }, canvas)).toEqual({
      width: canvas.width - startRect.x,
      height: canvas.height - startRect.y,
    });
  });
});

describe('overlapFraction', () => {
  const dropZone = { x: 100, y: 100, width: 50, height: 50 }; // area 2500

  it('returns 0 for non-overlapping rects', () => {
    expect(overlapFraction({ x: 0, y: 0, width: 50, height: 50 }, dropZone)).toBe(0);
  });

  it('returns 1 when the dragged rect fully covers the drop zone', () => {
    expect(overlapFraction({ x: 50, y: 50, width: 200, height: 200 }, dropZone)).toBe(1);
  });

  it('returns the exact covered fraction for a partial overlap', () => {
    // Overlaps the right/bottom 25x25 quadrant of the 50x50 drop zone -> 625/2500 = 0.25
    const dragged = { x: 125, y: 125, width: 50, height: 50 };
    expect(overlapFraction(dragged, dropZone)).toBeCloseTo(0.25);
  });

  it('is symmetric: fraction is relative to whichever rect is smaller, not argument order', () => {
    const small = { x: 100, y: 100, width: 10, height: 10 }; // fully inside dropZone
    expect(overlapFraction(small, dropZone)).toBe(1);
    expect(overlapFraction(dropZone, small)).toBe(1);
  });

  it('regression: a minimum-size note fully inside a much larger drop zone is deletable', () => {
    // The expanded trash drop zone (168x128) vs an 80x60 minimum-size note - this
    // is the exact shape of the "notes at minimum size can't be deleted" bug:
    // measured against the drop zone's own area the note could cover at most
    // 4800/21504 ≈ 0.22, always under any reasonable threshold.
    const dropZoneLarge = { x: 1100, y: 770, width: 168, height: 128 };
    const minNote = { x: 1150, y: 800, width: MIN_WIDTH, height: MIN_HEIGHT }; // fully inside
    expect(overlapFraction(minNote, dropZoneLarge)).toBe(1);
  });
});

describe('normalizeRect', () => {
  it('handles a down-right drag (origin is the top-left corner)', () => {
    expect(normalizeRect({ x: 10, y: 10 }, { x: 60, y: 40 })).toEqual({ x: 10, y: 10, width: 50, height: 30 });
  });

  it('handles an up-left drag (origin is the bottom-right corner)', () => {
    expect(normalizeRect({ x: 60, y: 40 }, { x: 10, y: 10 })).toEqual({ x: 10, y: 10, width: 50, height: 30 });
  });

  it('handles a down-left drag', () => {
    expect(normalizeRect({ x: 60, y: 10 }, { x: 10, y: 40 })).toEqual({ x: 10, y: 10, width: 50, height: 30 });
  });

  it('handles an up-right drag', () => {
    expect(normalizeRect({ x: 10, y: 40 }, { x: 60, y: 10 })).toEqual({ x: 10, y: 10, width: 50, height: 30 });
  });
});

describe('resolveCreateRect', () => {
  it('resolves a normal in-bounds draw unchanged', () => {
    expect(resolveCreateRect({ x: 100, y: 100 }, { x: 300, y: 250 }, canvas)).toEqual({
      x: 100, y: 100, width: 200, height: 150,
    });
  });

  it('enforces the minimum size for a near-zero drag away from any edge', () => {
    expect(resolveCreateRect({ x: 400, y: 400 }, { x: 402, y: 401 }, canvas)).toEqual({
      x: 400, y: 400, width: MIN_WIDTH, height: MIN_HEIGHT,
    });
  });

  it('regression: a tiny drag flush against the right/bottom edge still fits fully on-canvas', () => {
    // Drawing right at the canvas's bottom-right corner - the old implementation
    // forced width/height up to the minimum without ever moving x/y, so the note
    // extended past the canvas edge and was partly invisible/unreachable.
    const rect = resolveCreateRect({ x: 998, y: 798 }, { x: 999, y: 799 }, canvas);
    expect(rect.width).toBe(MIN_WIDTH);
    expect(rect.height).toBe(MIN_HEIGHT);
    expect(rect.x + rect.width).toBeLessThanOrEqual(canvas.width);
    expect(rect.y + rect.height).toBeLessThanOrEqual(canvas.height);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
  });

  it('regression: a tiny drag flush against the top/left edge still fits fully on-canvas', () => {
    const rect = resolveCreateRect({ x: 1, y: 1 }, { x: 0, y: 0 }, canvas);
    expect(rect).toEqual({ x: 0, y: 0, width: MIN_WIDTH, height: MIN_HEIGHT });
  });

  it('keeps the drawn size and shifts the origin back when the drag overshoots the edge', () => {
    // Dragged a 300x300 rect starting at (900,700) in an 800x1000 canvas, which
    // would overflow past the right/bottom edge if the origin stayed put. The
    // drawn SIZE is honored (the same rule used for the minimum-size case above);
    // the origin slides back just enough to keep the whole rect on-canvas.
    expect(resolveCreateRect({ x: 900, y: 700 }, { x: 1200, y: 1000 }, canvas)).toEqual({
      x: 700, y: 500, width: 300, height: 300,
    });
  });
});
