import { getSDKStyles } from '../styles';

/**
 * Creates and manages the Shadow DOM container that isolates all SDK UI
 * from the host page's styles. All overlay elements (cursor, bubble,
 * spinner, input panel) live inside this container.
 */
export class OverlayManager {
  private hostElement: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private container: HTMLDivElement | null = null;

  /** Initialize the Shadow DOM overlay container */
  mount(cursorColor?: string): void {
    if (this.hostElement) return;

    this.hostElement = document.createElement('div');
    this.hostElement.id = 'clicky-sdk-root';
    // Marker for html2canvas to exclude this element from screenshots
    this.hostElement.setAttribute('data-clicky-exclude', '');
    document.body.appendChild(this.hostElement);

    this.shadowRoot = this.hostElement.attachShadow({ mode: 'open' });

    // Inject styles into the Shadow DOM
    const styleElement = document.createElement('style');
    styleElement.textContent = getSDKStyles(cursorColor);
    this.shadowRoot.appendChild(styleElement);

    // Create the main overlay container
    this.container = document.createElement('div');
    this.container.className = 'clicky-container';
    this.shadowRoot.appendChild(this.container);
  }

  /** Remove the overlay from the DOM entirely */
  unmount(): void {
    if (this.hostElement) {
      this.hostElement.remove();
      this.hostElement = null;
      this.shadowRoot = null;
      this.container = null;
    }
  }

  /** Get the container element inside the Shadow DOM */
  getContainer(): HTMLDivElement {
    if (!this.container) {
      throw new Error('OverlayManager not mounted. Call mount() first.');
    }
    return this.container;
  }

  /** Get the shadow root for direct element queries */
  getShadowRoot(): ShadowRoot {
    if (!this.shadowRoot) {
      throw new Error('OverlayManager not mounted. Call mount() first.');
    }
    return this.shadowRoot;
  }
}
