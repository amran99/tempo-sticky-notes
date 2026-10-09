import { describe, it, expect } from 'vitest';
import {
  clamp,
  computeMovePosition,
  computeResizeDimensions,
  isPointInRect,
  normalizeRect,
  clampRectToCanvas,
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

describe('isPointInRect', () => {
  const rect = { x: 10, y: 10, width: 50, height: 40 };

  it('returns true for a point inside the rect, including edges', () => {
    expect(isPointInRect({ x: 30, y: 30 }, rect)).toBe(true);
    expect(isPointInRect({ x: 10, y: 10 }, rect)).toBe(true);
    expect(isPointInRect({ x: 60, y: 50 }, rect)).toBe(true);
  });

  it('returns false for a point outside the rect', () => {
    expect(isPointInRect({ x: 5, y: 30 }, rect)).toBe(false);
    expect(isPointInRect({ x: 30, y: 51 }, rect)).toBe(false);
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

describe('clampRectToCanvas', () => {
  it('leaves an in-bounds rect untouched', () => {
    expect(clampRectToCanvas({ x: 10, y: 10, width: 100, height: 80 }, canvas)).toEqual({
      x: 10, y: 10, width: 100, height: 80,
    });
  });

  it('clamps a rect whose origin is past the canvas edge', () => {
    expect(clampRectToCanvas({ x: 1200, y: 900, width: 100, height: 80 }, canvas)).toEqual({
      x: 1000, y: 800, width: 0, height: 0,
    });
  });

  it('clamps a rect that overflows the canvas from a valid origin', () => {
    expect(clampRectToCanvas({ x: 900, y: 700, width: 300, height: 300 }, canvas)).toEqual({
      x: 900, y: 700, width: 100, height: 100,
    });
  });
});
