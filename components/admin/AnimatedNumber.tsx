"use client";

import { useEffect, useRef, useState } from "react";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function AnimatedNumber({
  value,
  durationMs = 900,
  formatter,
}: {
  value: number;
  durationMs?: number;
  formatter?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(0);
  const previousValueRef = useRef(0);

  useEffect(() => {
    const from = previousValueRef.current;
    const to = value;
    const start = performance.now();
    let frameId: number;

    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(t);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        previousValueRef.current = to;
      }
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value, durationMs]);

  return <>{formatter ? formatter(display) : display.toLocaleString("ar-EG")}</>;
}
