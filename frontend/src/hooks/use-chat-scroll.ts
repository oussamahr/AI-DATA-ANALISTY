"use client";

import { useRef, useCallback, useEffect, useState } from "react";

export function useChatScroll(deps: unknown[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const userScrolledAwayRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // If we did a programmatic scroll, ignore this scroll event's scroll-away check
      if (isProgrammaticScrollRef.current) {
        isProgrammaticScrollRef.current = false;
        return;
      }

      const threshold = 150; // Increased threshold for better responsiveness
      const distFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      const nearBottom = distFromBottom < threshold;

      if (nearBottom && userScrolledAwayRef.current) {
        userScrolledAwayRef.current = false;
        setShowScrollButton(false);
      } else if (!nearBottom && !userScrolledAwayRef.current) {
        userScrolledAwayRef.current = true;
        setShowScrollButton(true);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll on dependency changes (like new streaming tokens)
  useEffect(() => {
    if (!userScrolledAwayRef.current) {
      const container = containerRef.current;
      if (container) {
        requestAnimationFrame(() => {
          isProgrammaticScrollRef.current = true;
          // During streaming, instantly adjust scrollTop to keep up with incoming tokens at 60fps
          container.scrollTop = container.scrollHeight;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      userScrolledAwayRef.current = false;
      setShowScrollButton(false);
      isProgrammaticScrollRef.current = true;
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, []);

  return { containerRef, showScrollButton, scrollToBottom };
}
