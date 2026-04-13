import type { ViewportCoordinate } from './types';

/**
 * Maps coordinates from Claude's screenshot pixel space to browser viewport space.
 * Simplified from the native app — no Y-axis flip needed since both coordinate
 * systems use top-left origin with Y increasing downward.
 */
export function mapScreenshotToViewport(
  screenshotX: number,
  screenshotY: number,
  screenshotWidth: number,
  screenshotHeight: number,
): ViewportCoordinate {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Clamp to screenshot bounds
  const clampedX = Math.max(0, Math.min(screenshotX, screenshotWidth));
  const clampedY = Math.max(0, Math.min(screenshotY, screenshotHeight));

  // Scale from screenshot space to viewport space
  return {
    x: clampedX * (viewportWidth / screenshotWidth),
    y: clampedY * (viewportHeight / screenshotHeight),
  };
}
