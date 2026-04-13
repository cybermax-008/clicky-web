/**
 * Instruction text bubble that appears when the cursor points at a UI element.
 * Pops in with a scale animation and streams text character by character.
 * Port of the navigation bubble from OverlayWindow.swift.
 */
export class BubbleOverlay {
  private element: HTMLDivElement;

  constructor(container: HTMLDivElement) {
    this.element = document.createElement('div');
    this.element.className = 'clicky-bubble clicky-hidden';
    container.appendChild(this.element);
  }

  /** Show the bubble at a position with initial scale for pop-in animation */
  show(x: number, y: number): void {
    this.element.classList.remove('clicky-hidden');
    this.element.textContent = '';
    this.element.style.opacity = '1';
    this.element.style.transform = `translate(${x + 10}px, ${y + 18}px) scale(0.5)`;
  }

  /** Update position (follows the cursor element) */
  setPosition(x: number, y: number): void {
    const currentScale = this.element.style.transform.includes('scale(0.5)') ? 0.5 : 1;
    this.element.style.transform = `translate(${x + 10}px, ${y + 18}px) scale(${currentScale})`;
  }

  /** Append a character and trigger scale-up on first character */
  appendCharacter(char: string): void {
    this.element.textContent += char;
    // Scale up to 1.0 on first character (spring entrance)
    if (this.element.textContent!.length === 1) {
      const currentTransform = this.element.style.transform;
      this.element.style.transform = currentTransform.replace(/scale\([^)]+\)/, 'scale(1)');
    }
  }

  /** Fade out the bubble */
  fadeOut(): void {
    this.element.style.opacity = '0';
  }

  /** Hide completely */
  hide(): void {
    this.element.classList.add('clicky-hidden');
    this.element.textContent = '';
    this.element.style.opacity = '0';
  }

  /** Clean up */
  destroy(): void {
    this.element.remove();
  }
}
