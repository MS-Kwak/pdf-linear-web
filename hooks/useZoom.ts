"use client";

import { useState, useCallback } from "react";

const MIN_SCALE = 0.3;
const MAX_SCALE = 3.0;
const STEP = 0.2;

export function useZoom(initial = 1.0) {
  const [scale, setScale] = useState(initial);

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(+(prev + STEP).toFixed(2), MAX_SCALE));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(+(prev - STEP).toFixed(2), MIN_SCALE));
  }, []);

  const resetZoom = useCallback(() => setScale(initial), [initial]);

  const clampedSet = useCallback((v: number) => {
    setScale(Math.min(Math.max(+v.toFixed(3), MIN_SCALE), MAX_SCALE));
  }, []);

  return { scale, setScale: clampedSet, zoomIn, zoomOut, resetZoom };
}
