# Clicky SDK — Agent Instructions

## Overview

Embeddable JavaScript SDK that adds step-by-step UI navigation guidance to any web app. Users press **Cmd/Ctrl+K**, type a question, and a blue cursor guides them through the interface — pointing at each element to click, waiting for the click, then showing the next step. Powered by Claude's vision API via a Cloudflare Worker proxy.

## Architecture

- **SDK** (`sdk/`): TypeScript, bundled with esbuild into IIFE + ESM (~54KB gzipped)
- **Worker** (`worker/`): Cloudflare Worker proxying to Claude API with CORS + API key auth
- **Overlay**: Shadow DOM isolates all SDK UI from the host page
- **Screenshots**: html2canvas captures the viewport (excludes SDK overlay via `data-clicky-exclude`)
- **Animation**: requestAnimationFrame-driven quadratic bezier arc flight
- **Streaming**: SSE via fetch ReadableStream (not EventSource — POST not supported)

### Navigation Loop

```
Cmd/Ctrl+K → text input → Claude plans steps →
  ┌─────────────────────────────────────┐
  │  Point cursor to step N             │
  │  Show instruction bubble            │
  │  Listen for click event             │
  │  Click detected → wait 1.5s         │
  │  Re-screenshot → send to Claude     │
  │  Claude responds → advance to N+1   │
  └──────────────┬──────────────────────┘
                 │ loop until [POINT:none]
                 ▼
           "All done!"
```

### Navigation States

```
idle → awaitingInput → planning → pointingAtStep → awaitingUserClick → verifyingStepCompletion → (loop) | completed → idle
```

## Key Files

| File | Purpose |
|------|---------|
| `sdk/src/index.ts` | Public API entry point + auto-init from script tag |
| `sdk/src/ClickySDK.ts` | Main orchestrator — navigation loop, state management |
| `sdk/src/ApiClient.ts` | SSE streaming client for Claude via Worker proxy |
| `sdk/src/PointTagParser.ts` | `[POINT:x,y:label]` regex parser |
| `sdk/src/ScreenshotCapture.ts` | html2canvas viewport capture with overlay exclusion |
| `sdk/src/CoordinateMapper.ts` | Screenshot-space → viewport-space coordinate mapping |
| `sdk/src/overlay/OverlayManager.ts` | Shadow DOM container creation and management |
| `sdk/src/overlay/CursorOverlay.ts` | Blue triangle cursor + mouse following |
| `sdk/src/overlay/BubbleOverlay.ts` | Instruction text bubble with character streaming |
| `sdk/src/overlay/InputPanel.ts` | Cmd+K floating text input |
| `sdk/src/overlay/SpinnerOverlay.ts` | Loading spinner for planning/verification states |
| `sdk/src/animation/BezierFlight.ts` | Quadratic bezier arc flight animation |
| `sdk/src/animation/CharacterStreamer.ts` | Per-character text reveal (30-60ms random delay) |
| `sdk/src/events/ShortcutListener.ts` | Cmd/Ctrl+K and Escape keyboard handler |
| `sdk/src/events/ClickListener.ts` | Click detection during awaitingUserClick state |
| `sdk/src/styles.ts` | CSS-in-JS design tokens injected into Shadow DOM |
| `sdk/src/types.ts` | Shared TypeScript types |
| `sdk/test.html` | Demo page with fake Aiven console for testing |
| `worker/src/index.ts` | Cloudflare Worker — `/chat` route with CORS + API key auth |

## Build & Run

```bash
# Build SDK
cd sdk && npm install && npm run build

# Deploy Worker
cd worker && npm install
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put SDK_API_KEY
npx wrangler deploy

# Local dev
cd worker && npx wrangler dev          # Worker at localhost:8787
cd sdk && npm run build && npx serve . # Test page at localhost:3000
```

## Code Style & Conventions

- TypeScript with strict mode
- No framework dependencies — vanilla DOM manipulation for overlay
- Shadow DOM for style isolation
- All animations via requestAnimationFrame (no CSS animation libraries)
- Event listeners use capture phase to intercept before host app handlers
- Click listeners do NOT call preventDefault — clicks must reach the host page
- All CSS-in-JS — no external stylesheets
- Design tokens in `styles.ts` — all UI references these constants

## Key Constants (from native app port)

- Cursor offset from mouse: +35px right, +25px down
- Bezier flight duration: `clamp(distance/800, 0.6, 1.4)` seconds
- Bezier arc height: `min(distance * 0.2, 80)` pixels
- Scale pulse during flight: `1 + sin(progress * PI) * 0.3`
- Character streaming delay: 30-60ms random per character
- Click-to-next-step delay: 1500ms (for page transitions)
- Completion message display: 5 seconds before auto-reset
- Screenshot max dimension: 1280px
- JPEG quality: 0.8

## Do NOT

- Do not add framework dependencies (React, Vue, etc.) to the SDK
- Do not use CSS files — all styles are injected via Shadow DOM
- Do not call preventDefault on click events during navigation — the host page must receive the click
- Do not bundle html2canvas from CDN — it's bundled into the SDK
