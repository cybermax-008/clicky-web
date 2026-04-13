import { ClickySDK } from './ClickySDK';
import type { ClickyConfig, NavigationState } from './types';

export type { ClickyConfig, NavigationState };

let instance: ClickySDK | null = null;

/**
 * Initialize the Clicky SDK.
 *
 * Script tag usage:
 *   <script src="clicky-sdk.js" data-api-key="ck_xxx" data-worker-url="https://..."></script>
 *
 * Programmatic usage:
 *   import Clicky from '@clicky/sdk';
 *   Clicky.init({ apiKey: 'ck_xxx', workerUrl: 'https://...' });
 */
const Clicky = {
  /** Initialize the SDK with configuration */
  init(config: ClickyConfig): void {
    if (instance) {
      console.warn('Clicky SDK: Already initialized. Call destroy() first to reinitialize.');
      return;
    }
    instance = new ClickySDK(config);
  },

  /** Remove the SDK from the page and clean up all listeners */
  destroy(): void {
    if (instance) {
      instance.destroy();
      instance = null;
    }
  },

  /** Programmatically start a navigation session */
  startNavigation(query: string): void {
    if (!instance) {
      console.error('Clicky SDK: Not initialized. Call Clicky.init() first.');
      return;
    }
    instance.startNavigation(query);
  },

  /** Cancel any active navigation */
  cancelNavigation(): void {
    instance?.cancelNavigation();
  },

  /** Check if a navigation is currently active */
  isActive(): boolean {
    return instance?.isActive() ?? false;
  },

  /** Get current navigation state */
  getState(): NavigationState | null {
    return instance?.getState() ?? null;
  },
};

// Auto-initialize from script tag attributes
if (typeof document !== 'undefined') {
  // Wait for DOM to be ready
  const autoInit = () => {
    const currentScript = document.querySelector('script[data-api-key][src*="clicky"]');
    if (currentScript) {
      const apiKey = currentScript.getAttribute('data-api-key');
      const workerUrl = currentScript.getAttribute('data-worker-url');
      if (apiKey && workerUrl) {
        Clicky.init({ apiKey, workerUrl });
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
}

export default Clicky;
