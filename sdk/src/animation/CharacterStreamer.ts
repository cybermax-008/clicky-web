/**
 * Streams text one character at a time with random delays for a natural
 * "speaking" rhythm. Port of streamNavigationBubbleCharacter from OverlayWindow.swift.
 */

/**
 * Streams characters from `text` into the callback, one at a time.
 * Returns a cancel function to stop the animation.
 */
export function streamCharacters(
  text: string,
  onCharacter: (char: string, index: number) => void,
  onComplete: () => void,
): () => void {
  let currentIndex = 0;
  let cancelled = false;
  let timeoutId: ReturnType<typeof setTimeout>;

  function nextCharacter(): void {
    if (cancelled || currentIndex >= text.length) {
      if (!cancelled) onComplete();
      return;
    }

    onCharacter(text[currentIndex], currentIndex);
    currentIndex++;

    // Random 30-60ms delay per character (matches Swift's 0.03...0.06)
    const delay = 30 + Math.random() * 30;
    timeoutId = setTimeout(nextCharacter, delay);
  }

  nextCharacter();

  return () => {
    cancelled = true;
    clearTimeout(timeoutId);
  };
}
