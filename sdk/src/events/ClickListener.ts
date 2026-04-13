/**
 * Click detection during the awaitingUserClick navigation state.
 * Uses capture phase to observe clicks before host app handlers.
 * Does NOT call preventDefault — the click must reach the target element.
 * Port of GlobalShortcutMonitor.swift's mouse click monitoring.
 */

export class ClickListener {
  private boundHandler: ((e: MouseEvent) => void) | null = null;
  private isEnabled = false;

  /** Start monitoring for clicks */
  enable(onClicked: (x: number, y: number) => void): void {
    if (this.isEnabled) return;
    this.isEnabled = true;

    this.boundHandler = (e: MouseEvent) => {
      if (!this.isEnabled) return;
      onClicked(e.clientX, e.clientY);
    };

    // Capture phase to observe before host app handlers
    document.addEventListener('click', this.boundHandler, { capture: true });
  }

  /** Stop monitoring */
  disable(): void {
    this.isEnabled = false;
    if (this.boundHandler) {
      document.removeEventListener('click', this.boundHandler, { capture: true });
      this.boundHandler = null;
    }
  }

  /** Clean up */
  destroy(): void {
    this.disable();
  }
}
