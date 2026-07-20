"use client";

import { useRef, useCallback, useEffect, useState } from "react";

export function useChatScroll(deps: unknown[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const userScrolledAwayRef = useRef(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const threshold = 120;
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

  useEffect(() => {
    if (!userScrolledAwayRef.current) {
      const container = containerRef.current;
      if (container) {
        requestAnimationFrame(() => {
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
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, []);

  return { containerRef, showScrollButton, scrollToBottom };
}
