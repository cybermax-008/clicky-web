import { COLORS } from '../styles';

/**
 * The blue triangle cursor that follows the mouse and flies to UI elements.
 * Port of the Triangle shape and cursor tracking from OverlayWindow.swift.
 */
export class CursorOverlay {
  private element: HTMLDivElement;
  private currentX = 0;
  private currentY = 0;
  private mouseTrackingActive = false;
  private boundMouseHandler: ((e: MouseEvent) => void) | null = null;

  constructor(container: HTMLDivElement, cursorColor: string = COLORS.cursorBlue) {
    this.element = document.createElement('div');
    this.element.className = 'clicky-cursor';
    // SVG equilateral triangle matching the Swift Triangle shape
    this.element.innerHTML = `
      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 2.5L3.07 11.5H12.93L8 2.5Z" fill="${cursorColor}"/>
      </svg>
    `;
    this.element.style.opacity = '0';
    container.appendChild(this.element);
  }

  /** Start following the mouse cursor with a +35px, +25px offset */
  startFollowing(): void {
    if (this.mouseTrackingActive) return;
    this.mouseTrackingActive = true;
    this.element.style.opacity = '1';
    // Default rotation matching the Swift -35 degrees
    this.setRotation(-35);

    this.boundMouseHandler = (e: MouseEvent) => {
      this.currentX = e.clientX + 35;
      this.currentY = e.clientY + 25;
      this.updatePosition(this.currentX, this.currentY);
    };
    document.addEventListener('mousemove', this.boundMouseHandler);
  }

  /** Stop following the mouse */
  stopFollowing(): void {
    if (this.boundMouseHandler) {
      document.removeEventListener('mousemove', this.boundMouseHandler);
      this.boundMouseHandler = null;
    }
    this.mouseTrackingActive = false;
  }

  /** Set the cursor position directly (used during bezier flight) */
  setPosition(x: number, y: number): void {
    this.currentX = x;
    this.currentY = y;
    this.updatePosition(x, y);
  }

  /** Set rotation and scale (used during bezier flight) */
  setTransform(x: number, y: number, rotationDeg: number, scale: number): void {
    this.currentX = x;
    this.currentY = y;
    this.element.style.transform = `translate(${x}px, ${y}px) rotate(${rotationDeg}deg) scale(${scale})`;
  }

  /** Set rotation only */
  setRotation(degrees: number): void {
    this.element.style.transform = `translate(${this.currentX}px, ${this.currentY}px) rotate(${degrees}deg)`;
  }

  /** Show/hide the cursor */
  setVisible(visible: boolean): void {
    this.element.style.opacity = visible ? '1' : '0';
  }

  /** Get current position */
  getPosition(): { x: number; y: number } {
    return { x: this.currentX, y: this.currentY };
  }

  /** Get the DOM element */
  getElement(): HTMLDivElement {
    return this.element;
  }

  /** Clean up */
  destroy(): void {
    this.stopFollowing();
    this.element.remove();
  }

  private updatePosition(x: number, y: number): void {
    this.element.style.transform = `translate(${x}px, ${y}px) rotate(-35deg)`;
  }
}
