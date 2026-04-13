import type { PointingParseResult } from './types';

/**
 * Parses a [POINT:x,y:label] or [POINT:none] tag from the end of Claude's response.
 * Direct port of CompanionManager.parsePointingCoordinates() from the Swift app.
 */
export function parsePointingCoordinates(responseText: string): PointingParseResult {
  const pattern = /\[POINT:(?:none|(\d+)\s*,\s*(\d+)(?::([^\]:\s][^\]:]*?))?(?::screen(\d+))?)\]\s*$/;
  const match = responseText.match(pattern);

  if (!match) {
    return { spokenText: responseText, coordinate: null, elementLabel: null };
  }

  // Remove the tag from the spoken text
  const tagStartIndex = responseText.lastIndexOf('[POINT:');
  const spokenText = responseText.substring(0, tagStartIndex).trim();

  // Check if it's [POINT:none] — no coordinate captured
  if (!match[1] || !match[2]) {
    return { spokenText, coordinate: null, elementLabel: 'none' };
  }

  const x = parseInt(match[1], 10);
  const y = parseInt(match[2], 10);
  const elementLabel = match[3]?.trim() || null;

  return {
    spokenText,
    coordinate: { x, y },
    elementLabel,
  };
}

/**
 * Extracts the estimated total steps from Claude's response text.
 * Looks for patterns like "step 2 of ~5:" or "step 3 of 4:".
 */
export function extractStepTotal(responseText: string): number | null {
  const pattern = /step \d+ of ~?(\d+)/i;
  const match = responseText.match(pattern);
  if (!match) return null;
  return parseInt(match[1], 10);
}
