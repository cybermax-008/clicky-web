/**
 * Global keyboard shortcut listener for Cmd/Ctrl+K and Escape.
 * Uses capture phase to intercept before host app handlers.
 * Port of GlobalShortcutMonitor.swift's CGEvent tap pattern.
 */

export class ShortcutListener {
  private boundHandler: ((e: KeyboardEvent) => void) | null = null;
  private onCmdK: (() => void) | null = null;
  private onEscape: (() => void) | null = null;

  /** Start listening for keyboard shortcuts */
  start(onCmdK: () => void, onEscape: () => void): void {
    this.onCmdK = onCmdK;
    this.onEscape = onEscape;

    this.boundHandler = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        this.onCmdK?.();
        return;
      }

      // Escape — only prevent propagation if SDK is handling it
      if (e.key === 'Escape') {
        this.onEscape?.();
      }
    };

    // Capture phase to fire before host app event listeners
    document.addEventListener('keydown', this.boundHandler, { capture: true });
  }

  /** Stop listening */
  stop(): void {
    if (this.boundHandler) {
      document.removeEventListener('keydown', this.boundHandler, { capture: true });
      this.boundHandler = null;
    }
    this.onCmdK = null;
    this.onEscape = null;
  }
}
