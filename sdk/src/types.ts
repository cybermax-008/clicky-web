export interface ClickyConfig {
  /** Required: SDK API key */
  apiKey: string;
  /** Worker proxy URL (default: window location origin) */
  workerUrl?: string;
  /** Keyboard shortcut (default: 'mod+k') */
  shortcut?: string;
  /** Cursor color (default: '#3380FF') */
  cursorColor?: string;
  /** Overlay z-index (default: 2147483647) */
  zIndex?: number;
  /** Max screenshot dimension in pixels (default: 1280) */
  screenshotMaxDimension?: number;
  /** Claude model to use (default: 'claude-sonnet-4-6') */
  model?: string;
  /** Additional context to include in the system prompt */
  systemPromptContext?: string;
  /** Callbacks */
  onStateChange?: (state: NavigationState) => void;
  onStepComplete?: (step: number) => void;
  onError?: (error: Error) => void;
}

export type NavigationState =
  | { type: 'idle' }
  | { type: 'awaitingInput' }
  | { type: 'planning' }
  | { type: 'pointingAtStep'; step: number; totalSteps: number | null }
  | { type: 'awaitingUserClick' }
  | { type: 'verifyingStepCompletion' }
  | { type: 'completed' };

export interface PointingParseResult {
  /** The response text with the [POINT:...] tag removed */
  spokenText: string;
  /** The parsed pixel coordinate, or null if none */
  coordinate: { x: number; y: number } | null;
  /** Short label describing the element */
  elementLabel: string | null;
}

export interface ViewportCoordinate {
  x: number;
  y: number;
}

export interface ScreenshotResult {
  /** Base64-encoded image data (no data URL prefix) */
  base64Data: string;
  /** Pixel width of the screenshot */
  width: number;
  /** Pixel height of the screenshot */
  height: number;
  /** MIME type */
  mediaType: 'image/jpeg' | 'image/png';
}

export interface ConversationEntry {
  userMessage: string;
  assistantResponse: string;
}
