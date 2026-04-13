/**
 * Quadratic bezier arc flight animation for the blue cursor.
 * Direct port of animateBezierFlightArc() from OverlayWindow.swift.
 * Uses requestAnimationFrame instead of Swift's Timer.scheduledTimer.
 */

export interface BezierFlightCallbacks {
  /** Called each frame with the current position, rotation, and scale */
  onFrame: (x: number, y: number, rotationDeg: number, scale: number) => void;
  /** Called when the flight animation completes */
  onComplete: () => void;
}

/**
 * Animates along a quadratic bezier arc from start to end.
 * Returns a cancel function to abort the animation.
 */
export function animateBezierFlight(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  callbacks: BezierFlightCallbacks,
): () => void {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const distance = Math.hypot(deltaX, deltaY);

  // Flight duration scales with distance: short hops are quick, long flights
  // are more dramatic. Clamped to 0.6s–1.4s. (matches Swift: distance / 800)
  const flightDurationMs = Math.min(Math.max(distance / 800, 0.6), 1.4) * 1000;

  // Control point for the quadratic bezier arc. Offset the midpoint upward
  // so the cursor flies in a parabolic arc. (matches Swift: min(distance * 0.2, 80))
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const arcHeight = Math.min(distance * 0.2, 80);
  const controlX = midX;
  const controlY = midY - arcHeight;

  let startTime: number | null = null;
  let rafId: number;
  let cancelled = false;

  function frame(timestamp: number): void {
    if (cancelled) return;

    if (startTime === null) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const linearProgress = Math.min(elapsed / flightDurationMs, 1);

    // Smoothstep easing: 3t² - 2t³ (Hermite interpolation)
    // Matches Swift: linearProgress * linearProgress * (3.0 - 2.0 * linearProgress)
    const t = linearProgress * linearProgress * (3 - 2 * linearProgress);
    const oneMinusT = 1 - t;

    // Quadratic bezier: B(t) = (1-t)²·P0 + 2(1-t)t·C + t²·P1
    const bezierX = oneMinusT * oneMinusT * startX
                  + 2 * oneMinusT * t * controlX
                  + t * t * endX;
    const bezierY = oneMinusT * oneMinusT * startY
                  + 2 * oneMinusT * t * controlY
                  + t * t * endY;

    // Tangent for rotation: B'(t) = 2(1-t)(C-P0) + 2t(P1-C)
    // +90° offset because the triangle tip points up at 0° rotation
    const tangentX = 2 * oneMinusT * (controlX - startX) + 2 * t * (endX - controlX);
    const tangentY = 2 * oneMinusT * (controlY - startY) + 2 * t * (endY - controlY);
    const rotationDeg = Math.atan2(tangentY, tangentX) * (180 / Math.PI) + 90;

    // Scale pulse: sin curve peaks at midpoint (1.0 → 1.3 → 1.0)
    const scalePulse = Math.sin(linearProgress * Math.PI);
    const scale = 1 + scalePulse * 0.3;

    callbacks.onFrame(bezierX, bezierY, rotationDeg, scale);

    if (linearProgress < 1) {
      rafId = requestAnimationFrame(frame);
    } else {
      callbacks.onComplete();
    }
  }

  rafId = requestAnimationFrame(frame);

  return () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
  };
}
