import type { ClickyConfig, NavigationState, ConversationEntry } from './types';
import { isActiveNavigation, isWorkingState } from './NavigationState';
import { OverlayManager } from './overlay/OverlayManager';
import { CursorOverlay } from './overlay/CursorOverlay';
import { BubbleOverlay } from './overlay/BubbleOverlay';
import { SpinnerOverlay } from './overlay/SpinnerOverlay';
import { InputPanel } from './overlay/InputPanel';
import { ShortcutListener } from './events/ShortcutListener';
import { ClickListener } from './events/ClickListener';
import { captureViewportScreenshot } from './ScreenshotCapture';
import { streamChatRequest } from './ApiClient';
import { parsePointingCoordinates, extractStepTotal } from './PointTagParser';
import { mapScreenshotToViewport } from './CoordinateMapper';
import { animateBezierFlight } from './animation/BezierFlight';
import { streamCharacters } from './animation/CharacterStreamer';

/**
 * Main SDK orchestrator. Port of CompanionManager.swift.
 * Manages the full navigation loop: Cmd+K → query → screenshot → Claude →
 * point → wait for click → re-screenshot → next step.
 */
export class ClickySDK {
  private config: Required<Pick<ClickyConfig, 'apiKey' | 'workerUrl' | 'model'>> & ClickyConfig;
  private state: NavigationState = { type: 'idle' };
  private conversationHistory: ConversationEntry[] = [];
  private currentStepNumber = 0;
  private currentAbortController: AbortController | null = null;
  private cancelAnimation: (() => void) | null = null;
  private cancelCharacterStream: (() => void) | null = null;

  // Sub-modules
  private overlayManager = new OverlayManager();
  private cursor!: CursorOverlay;
  private bubble!: BubbleOverlay;
  private spinner!: SpinnerOverlay;
  private inputPanel!: InputPanel;
  private shortcutListener = new ShortcutListener();
  private clickListener = new ClickListener();

  constructor(config: ClickyConfig) {
    this.config = {
      workerUrl: '',
      model: 'claude-sonnet-4-6',
      ...config,
    };

    if (!this.config.apiKey) {
      throw new Error('Clicky SDK: apiKey is required');
    }
    if (!this.config.workerUrl) {
      throw new Error('Clicky SDK: workerUrl is required');
    }

    this.mount();
    this.startListening();
  }

  // MARK: - Public API

  /** Start a navigation session programmatically */
  startNavigation(query: string): void {
    this.submitNavigationQuery(query);
  }

  /** Cancel any active navigation */
  cancelNavigation(): void {
    this.cleanupActiveNavigation();
    this.setState({ type: 'idle' });
    this.cursor.startFollowing();
    this.cursor.setVisible(true);
  }

  /** Check if a navigation is currently active */
  isActive(): boolean {
    return isActiveNavigation(this.state);
  }

  /** Get current navigation state */
  getState(): NavigationState {
    return this.state;
  }

  /** Remove the SDK entirely from the page */
  destroy(): void {
    this.cleanupActiveNavigation();
    this.shortcutListener.stop();
    this.clickListener.destroy();
    this.cursor.destroy();
    this.bubble.destroy();
    this.spinner.destroy();
    this.inputPanel.destroy();
    this.overlayManager.unmount();
  }

  // MARK: - Initialization

  private mount(): void {
    this.overlayManager.mount(this.config.cursorColor);
    const container = this.overlayManager.getContainer();

    this.cursor = new CursorOverlay(container, this.config.cursorColor);
    this.bubble = new BubbleOverlay(container);
    this.spinner = new SpinnerOverlay(container);
    this.inputPanel = new InputPanel(container);

    this.cursor.startFollowing();
  }

  private startListening(): void {
    this.shortcutListener.start(
      () => this.handleCmdK(),
      () => this.handleEscape(),
    );
  }

  // MARK: - State Management

  private setState(newState: NavigationState): void {
    this.state = newState;
    this.config.onStateChange?.(newState);

    // Update overlay visibility based on state
    if (isWorkingState(newState)) {
      this.cursor.setVisible(false);
      const pos = this.cursor.getPosition();
      this.spinner.show(pos.x, pos.y);
    } else {
      this.spinner.hide();
    }
  }

  // MARK: - Shortcut Handlers

  private handleCmdK(): void {
    switch (this.state.type) {
      case 'idle': {
        this.setState({ type: 'awaitingInput' });
        const mouseX = this.cursor.getPosition().x;
        const mouseY = this.cursor.getPosition().y;
        this.inputPanel.show(
          mouseX, mouseY,
          (query) => this.submitNavigationQuery(query),
          () => this.setState({ type: 'idle' }),
        );
        break;
      }
      case 'awaitingInput':
        this.cancelNavigation();
        break;
      default:
        this.cancelNavigation();
        break;
    }
  }

  private handleEscape(): void {
    if (this.state.type !== 'idle') {
      this.cancelNavigation();
    }
  }

  // MARK: - Navigation Loop

  private submitNavigationQuery(query: string): void {
    this.inputPanel.hide();
    this.conversationHistory = [];
    this.currentStepNumber = 0;
    this.setState({ type: 'planning' });

    this.cursor.stopFollowing();
    this.executeNavigationStep(true, query);
  }

  private async executeNavigationStep(isInitialQuery: boolean, userQuery?: string): Promise<void> {
    // Create an abort controller for this request
    this.currentAbortController = new AbortController();

    try {
      // Capture screenshot of the page (excluding SDK overlay)
      const screenshot = await captureViewportScreenshot(
        this.config.screenshotMaxDimension,
      );

      if (this.currentAbortController.signal.aborted) return;

      const userPrompt = isInitialQuery
        ? userQuery || ''
        : 'the user has clicked. here is the current screen state. what should they click next? if the task is complete, respond with [POINT:none] and a completion message.';

      // Build system prompt
      let systemPrompt = NAVIGATION_SYSTEM_PROMPT;
      if (this.config.systemPromptContext) {
        systemPrompt += `\n\nadditional context about this application:\n${this.config.systemPromptContext}`;
      }

      // Send to Claude via Worker proxy
      const fullResponseText = await streamChatRequest({
        workerUrl: this.config.workerUrl!,
        apiKey: this.config.apiKey,
        model: this.config.model!,
        systemPrompt,
        screenshot,
        userPrompt,
        conversationHistory: this.conversationHistory,
      });

      if (this.currentAbortController.signal.aborted) return;

      // Parse the POINT tag from Claude's response
      const parseResult = parsePointingCoordinates(fullResponseText);

      // Save to conversation history
      this.conversationHistory.push({
        userMessage: userPrompt,
        assistantResponse: parseResult.spokenText,
      });

      // Keep history bounded to 20 entries
      if (this.conversationHistory.length > 20) {
        this.conversationHistory.splice(0, this.conversationHistory.length - 20);
      }

      if (parseResult.coordinate) {
        // We have a target coordinate — point at it
        this.currentStepNumber++;
        const estimatedTotalSteps = extractStepTotal(parseResult.spokenText);

        this.setState({
          type: 'pointingAtStep',
          step: this.currentStepNumber,
          totalSteps: estimatedTotalSteps,
        });

        // Map from screenshot space to viewport space
        const viewportTarget = mapScreenshotToViewport(
          parseResult.coordinate.x,
          parseResult.coordinate.y,
          screenshot.width,
          screenshot.height,
        );

        // Fly the cursor to the target
        this.cursor.setVisible(true);
        const startPos = this.cursor.getPosition();

        this.cancelAnimation = animateBezierFlight(
          startPos.x, startPos.y,
          viewportTarget.x, viewportTarget.y,
          {
            onFrame: (x, y, rotationDeg, scale) => {
              this.cursor.setTransform(x, y, rotationDeg, scale);
            },
            onComplete: () => {
              // Reset rotation to default pointer angle
              this.cursor.setRotation(-35);
              this.cursor.setPosition(viewportTarget.x, viewportTarget.y);

              // Show instruction bubble with character streaming
              this.bubble.show(viewportTarget.x, viewportTarget.y);
              this.cancelCharacterStream = streamCharacters(
                parseResult.spokenText,
                (char) => this.bubble.appendCharacter(char),
                () => {
                  // Character streaming complete — transition to awaitingUserClick
                  this.onPointingAnimationCompleted();
                },
              );
            },
          },
        );

        this.config.onStepComplete?.(this.currentStepNumber);
      } else {
        // No coordinate — navigation is complete
        this.setState({ type: 'completed' });

        // Show completion bubble at cursor position
        const pos = this.cursor.getPosition();
        this.cursor.setVisible(true);
        this.cursor.setRotation(-35);
        this.bubble.show(pos.x, pos.y);
        this.cancelCharacterStream = streamCharacters(
          parseResult.spokenText,
          (char) => this.bubble.appendCharacter(char),
          () => {
            // Auto-reset to idle after 5 seconds
            setTimeout(() => {
              if (this.state.type === 'completed') {
                this.bubble.hide();
                this.setState({ type: 'idle' });
                this.cursor.startFollowing();
              }
            }, 5000);
          },
        );
      }
    } catch (error) {
      if (this.currentAbortController?.signal.aborted) return;
      console.error('Clicky SDK: Navigation step error:', error);
      this.config.onError?.(error instanceof Error ? error : new Error(String(error)));
      this.cancelNavigation();
    }
  }

  /** Called when cursor arrives at target and instruction bubble finishes streaming */
  private onPointingAnimationCompleted(): void {
    if (this.state.type !== 'pointingAtStep') return;
    this.setState({ type: 'awaitingUserClick' });

    this.clickListener.enable((_x, _y) => {
      this.handleUserClickDuringNavigation();
    });
  }

  /** Handles a detected mouse click during awaitingUserClick state */
  private handleUserClickDuringNavigation(): void {
    if (this.state.type !== 'awaitingUserClick') return;

    this.clickListener.disable();
    this.bubble.hide();
    this.setState({ type: 'verifyingStepCompletion' });

    // Wait 1.5 seconds for page transition, then re-screenshot and get next step
    setTimeout(() => {
      if (this.state.type === 'verifyingStepCompletion') {
        this.executeNavigationStep(false);
      }
    }, 1500);
  }

  // MARK: - Cleanup

  private cleanupActiveNavigation(): void {
    this.currentAbortController?.abort();
    this.currentAbortController = null;
    this.cancelAnimation?.();
    this.cancelAnimation = null;
    this.cancelCharacterStream?.();
    this.cancelCharacterStream = null;
    this.clickListener.disable();
    this.bubble.hide();
    this.spinner.hide();
    this.inputPanel.hide();
    this.conversationHistory = [];
    this.currentStepNumber = 0;
  }
}

// MARK: - System Prompt

const NAVIGATION_SYSTEM_PROMPT = `you are a step-by-step UI navigation guide. the user wants to accomplish a task in the web application shown on their screen. you can see their screen via a screenshot of the browser viewport.

your job:
1. analyze the current screen state
2. determine the SINGLE next action the user should take
3. respond with a brief instruction and a [POINT] tag pointing at exactly where they should click

rules:
- respond with exactly ONE step at a time. never give multiple steps in one response.
- start your response with "step N:" where N is the step number (e.g., "step 1:", "step 2:")
- if you can estimate the total steps, include it (e.g., "step 2 of ~5:")
- keep instructions to one or two sentences. be specific about what to click.
- always include a [POINT:x,y:label] tag at the end pointing at the exact element to click
- the screenshot image is labeled with its pixel dimensions. use those dimensions as the coordinate space. origin (0,0) is top-left. x increases rightward, y increases downward.
- when the task is complete (the user has reached their goal), respond with a completion message and [POINT:none]
- if the current screen doesn't match what you expected (user clicked wrong thing, page loaded differently), adapt and guide them from the current state
- if you need the user to type something (not just click), say "type [text] in the [field name]" and point at the field
- all lowercase, casual but clear. no emojis.

examples:
- "step 1 of ~4: click on the services tab in the left sidebar [POINT:85,340:services tab]"
- "step 2 of ~4: click the blue create service button in the top right [POINT:1150,95:create service]"
- "step 3 of ~4: select postgresql from the service type list [POINT:640,280:postgresql]"
- "all done! your read replica is set up and should start syncing shortly. [POINT:none]"`;
