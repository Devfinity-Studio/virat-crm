"use client";

import { useRef, useCallback } from "react";

export interface LongPressOptions {
  threshold?: number; // ms to trigger long press, default 450ms
  moveTolerance?: number; // px movement allowed before cancelling, default 10px
  onLongPress: (e: React.TouchEvent | React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
}

export function useLongPress({
  threshold = 450,
  moveTolerance = 10,
  onLongPress,
  onClick,
}: LongPressOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length > 1) return;

      const touch = e.touches[0];
      if (!touch) return;

      startPosRef.current = { x: touch.clientX, y: touch.clientY };
      isLongPressRef.current = false;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        // Trigger light haptic vibration if available
        if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
          try {
            navigator.vibrate(50);
          } catch {}
        }
        onLongPress(e);
      }, threshold);
    },
    [onLongPress, threshold],
  );

  const move = useCallback(
    (e: React.TouchEvent) => {
      if (!startPosRef.current || !timerRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = Math.abs(touch.clientX - startPosRef.current.x);
      const deltaY = Math.abs(touch.clientY - startPosRef.current.y);

      // Cancel if user dragged/scrolled past tolerance threshold
      if (deltaX > moveTolerance || deltaY > moveTolerance) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
    },
    [moveTolerance],
  );

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isLongPressRef.current) {
        // Suppress navigation or click right after a long press triggers
        e.preventDefault();
        e.stopPropagation();
        isLongPressRef.current = false;
        return;
      }
      onClick?.(e);
    },
    [onClick],
  );

  return {
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: cancel,
    onTouchCancel: cancel,
    onClick: handleClick,
  };
}
