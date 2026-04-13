/**
 * Loading spinner shown during planning and step verification states.
 * Port of BlueCursorSpinnerView from OverlayWindow.swift.
 */
export class SpinnerOverlay {
  private element: HTMLDivElement;

  constructor(container: HTMLDivElement) {
    this.element = document.createElement('div');
    this.element.className = 'clicky-spinner clicky-hidden';
    this.element.innerHTML = '<div class="clicky-spinner-ring"></div>';
    container.appendChild(this.element);
  }

  /** Show the spinner at a position */
  show(x: number, y: number): void {
    this.element.classList.remove('clicky-hidden');
    this.element.style.transform = `translate(${x}px, ${y}px)`;
  }

  /** Update position */
  setPosition(x: number, y: number): void {
    this.element.style.transform = `translate(${x}px, ${y}px)`;
  }

  /** Hide the spinner */
  hide(): void {
    this.element.classList.add('clicky-hidden');
  }

  /** Clean up */
  destroy(): void {
    this.element.remove();
  }
}
