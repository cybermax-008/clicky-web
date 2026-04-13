import html2canvas from 'html2canvas';
import type { ScreenshotResult } from './types';

/** Maximum pixel dimension for the screenshot's longest edge */
const DEFAULT_MAX_DIMENSION = 1280;
/** JPEG compression quality (matches native app's 0.8) */
const JPEG_QUALITY = 0.8;

/**
 * Captures a screenshot of the current viewport using html2canvas.
 * Excludes SDK overlay elements (marked with data-clicky-exclude) so
 * Claude only sees the host page content.
 */
export async function captureViewportScreenshot(
  maxDimension: number = DEFAULT_MAX_DIMENSION,
): Promise<ScreenshotResult> {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Scale down so the longest edge doesn't exceed maxDimension
  const longestEdge = Math.max(viewportWidth, viewportHeight);
  const scale = Math.min(1, maxDimension / longestEdge);

  const canvas = await html2canvas(document.body, {
    // Exclude SDK overlay elements from the screenshot
    ignoreElements: (element: Element) => element.hasAttribute('data-clicky-exclude'),
    scale,
    useCORS: true,
    logging: false,
    // Capture only the visible viewport, not the full scrollable page
    width: viewportWidth,
    height: viewportHeight,
    windowWidth: viewportWidth,
    windowHeight: viewportHeight,
    x: window.scrollX,
    y: window.scrollY,
  });

  // Convert to JPEG base64
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  // Strip the "data:image/jpeg;base64," prefix — the API expects raw base64
  const base64Data = dataUrl.split(',')[1];

  return {
    base64Data,
    width: canvas.width,
    height: canvas.height,
    mediaType: 'image/jpeg',
  };
}
