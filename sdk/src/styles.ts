/**
 * Design tokens ported from DesignSystem.swift.
 * All styles are injected into the Shadow DOM so they never leak to the host page.
 */

export const COLORS = {
  cursorBlue: '#3380FF',
  background: 'rgba(16, 18, 17, 0.95)',
  surface: '#202221',
  textPrimary: '#ECEEED',
  textSecondary: '#ADB5B2',
  textTertiary: '#6B7370',
  borderSubtle: 'rgba(255, 255, 255, 0.1)',
  accent: '#2563EB',
} as const;

export function getSDKStyles(cursorColor: string = COLORS.cursorBlue): string {
  return `
    :host {
      all: initial;
    }

    .clicky-container {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Blue triangle cursor */
    .clicky-cursor {
      position: absolute;
      width: 16px;
      height: 16px;
      pointer-events: none;
      transition: opacity 0.25s ease-in;
      will-change: transform;
    }

    .clicky-cursor svg {
      width: 100%;
      height: 100%;
      filter: drop-shadow(0 0 8px ${cursorColor});
    }

    /* Instruction bubble */
    .clicky-bubble {
      position: absolute;
      pointer-events: none;
      font-size: 11px;
      font-weight: 500;
      color: white;
      padding: 4px 8px;
      border-radius: 6px;
      background: ${cursorColor};
      box-shadow: 0 0 6px ${cursorColor}80;
      white-space: nowrap;
      transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
                  opacity 0.5s ease-out;
      will-change: transform, opacity;
    }

    /* Spinner */
    .clicky-spinner {
      position: absolute;
      width: 14px;
      height: 14px;
      pointer-events: none;
      will-change: transform;
    }

    .clicky-spinner-ring {
      width: 100%;
      height: 100%;
      border: 2.5px solid transparent;
      border-top-color: ${cursorColor};
      border-right-color: ${cursorColor};
      border-radius: 50%;
      animation: clicky-spin 0.8s linear infinite;
      filter: drop-shadow(0 0 6px ${cursorColor}99);
    }

    @keyframes clicky-spin {
      to { transform: rotate(360deg); }
    }

    /* Cmd+K input panel */
    .clicky-input-panel {
      position: absolute;
      pointer-events: auto;
      width: 400px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: ${COLORS.background};
      border: 0.8px solid ${COLORS.borderSubtle};
      border-radius: 10px;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
      transition: opacity 0.15s ease-out;
    }

    .clicky-input-panel svg {
      width: 13px;
      height: 13px;
      flex-shrink: 0;
      color: ${COLORS.textTertiary};
    }

    .clicky-input-panel input {
      flex: 1;
      background: none;
      border: none;
      outline: none;
      font-size: 14px;
      color: ${COLORS.textPrimary};
      font-family: inherit;
    }

    .clicky-input-panel input::placeholder {
      color: ${COLORS.textTertiary};
    }

    .clicky-input-panel .clicky-submit-btn {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      color: ${COLORS.accent};
      opacity: 0;
      transition: opacity 0.15s;
      pointer-events: none;
    }

    .clicky-input-panel .clicky-submit-btn.visible {
      opacity: 1;
      pointer-events: auto;
    }

    .clicky-hidden {
      display: none !important;
    }
  `;
}
