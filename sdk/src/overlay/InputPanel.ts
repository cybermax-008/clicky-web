/**
 * Floating text input panel that appears near the cursor when Cmd/Ctrl+K is pressed.
 * Port of CmdKInputPanelManager.swift.
 */
export class InputPanel {
  private element: HTMLDivElement;
  private inputElement: HTMLInputElement;
  private submitButton: HTMLButtonElement;
  private onSubmitCallback: ((query: string) => void) | null = null;
  private onCancelCallback: (() => void) | null = null;
  private boundKeydownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(container: HTMLDivElement) {
    this.element = document.createElement('div');
    this.element.className = 'clicky-input-panel clicky-hidden';

    // Search icon
    const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    iconSvg.setAttribute('viewBox', '0 0 24 24');
    iconSvg.setAttribute('fill', 'none');
    iconSvg.setAttribute('stroke', 'currentColor');
    iconSvg.setAttribute('stroke-width', '2');
    iconSvg.innerHTML = '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>';
    this.element.appendChild(iconSvg);

    // Text input
    this.inputElement = document.createElement('input');
    this.inputElement.type = 'text';
    this.inputElement.placeholder = 'Ask anything...';
    this.inputElement.autocomplete = 'off';
    this.inputElement.spellcheck = false;
    this.element.appendChild(this.inputElement);

    // Submit button
    this.submitButton = document.createElement('button');
    this.submitButton.className = 'clicky-submit-btn';
    this.submitButton.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14v-4H7l5-5 5 5h-4v4h-2z" transform="rotate(90 12 12)"/>
      </svg>
    `;
    this.element.appendChild(this.submitButton);

    // Input event handlers
    this.inputElement.addEventListener('input', () => {
      const hasText = this.inputElement.value.trim().length > 0;
      this.submitButton.classList.toggle('visible', hasText);
    });

    this.submitButton.addEventListener('click', () => this.handleSubmit());

    container.appendChild(this.element);
  }

  /** Show the input panel near a position */
  show(
    x: number,
    y: number,
    onSubmit: (query: string) => void,
    onCancel: () => void,
  ): void {
    this.onSubmitCallback = onSubmit;
    this.onCancelCallback = onCancel;
    this.inputElement.value = '';
    this.submitButton.classList.remove('visible');

    // Position centered horizontally, above the cursor
    const panelWidth = 400;
    let panelX = x - panelWidth / 2;
    let panelY = y - 60;

    // Clamp to viewport
    panelX = Math.max(10, Math.min(panelX, window.innerWidth - panelWidth - 10));
    panelY = Math.max(10, Math.min(panelY, window.innerHeight - 54));

    this.element.style.left = `${panelX}px`;
    this.element.style.top = `${panelY}px`;
    this.element.classList.remove('clicky-hidden');

    // Focus the input after a brief delay to ensure the element is visible
    requestAnimationFrame(() => {
      this.inputElement.focus();
    });

    // Listen for Enter and Escape keys
    this.boundKeydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.handleSubmit();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.handleCancel();
      }
    };
    this.inputElement.addEventListener('keydown', this.boundKeydownHandler);
  }

  /** Hide the input panel */
  hide(): void {
    this.element.classList.add('clicky-hidden');
    if (this.boundKeydownHandler) {
      this.inputElement.removeEventListener('keydown', this.boundKeydownHandler);
      this.boundKeydownHandler = null;
    }
    this.onSubmitCallback = null;
    this.onCancelCallback = null;
  }

  /** Clean up */
  destroy(): void {
    this.hide();
    this.element.remove();
  }

  private handleSubmit(): void {
    const query = this.inputElement.value.trim();
    if (!query) return;
    this.hide();
    this.onSubmitCallback?.(query);
  }

  private handleCancel(): void {
    this.hide();
    this.onCancelCallback?.();
  }
}
