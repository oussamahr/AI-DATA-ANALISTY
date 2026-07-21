/**
 * useChatScroll — ChatGPT-style auto-scroll behavior.
 *
 * Rules (per the spec):
 * 1. Auto-scroll smoothly only if the user is already near the bottom.
 * 2. If the user scrolls up, stop auto-scrolling until they return.
 * 3. Show a "scroll to bottom" button while detached.
 *
 * Implementation notes:
 * - We measure "near the bottom" with a 64px threshold. This matches
 *   common chat apps.
 * - We track `pinned` in a ref so scroll handlers don't re-render the
 *   tree. We use a separate `forcePinned` state to flip the button.
 * - Auto-scroll runs in a `useEffect` that watches `pinned` *and* the
 *   total content height. We use rAF to batch the actual scrollTop
 *   write to the next frame.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

interface UseChatScrollOptions {
  /** Threshold in pixels from the bottom that counts as "pinned". */
  threshold?: number;
}

export interface UseChatScrollResult {
  /** Ref to the scrollable container. */
  containerRef: RefObject<HTMLDivElement | null>;
  /** True while the user is near the bottom and we auto-scroll. */
  pinned: boolean;
  /** True when the user has scrolled up and we are NOT auto-scrolling. */
  detached: boolean;
  /** Force a scroll to the bottom (e.g. on user click of the button). */
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

export function useChatScroll(options: UseChatScrollOptions = {}): UseChatScrollResult {
  const threshold = options.threshold ?? 64;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef(true);
  // We use a separate "detached" flag that the *button* subscribes to.
  // The ref holds the source of truth; the state is just a re-render trigger.
  const [detached, setDetached] = useState(false);

  const recomputePinned = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const next = distance <= threshold;
    if (next !== pinnedRef.current) {
      pinnedRef.current = next;
      setDetached(!next);
    }
  }, [threshold]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Initial measure.
    recomputePinned();
    const onScroll = () => recomputePinned();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [recomputePinned]);

  /**
   * Scroll to the bottom of the container. We do this in rAF so it
   * happens after the DOM has the new content height.
   */
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = containerRef.current;
    if (!el) return;
    const apply = () => {
      el.scrollTo({ top: el.scrollHeight, behavior });
    };
    // Two rAFs: the first lets React commit the new content, the second
    // lets the browser recompute layout. This is the trick used by
    // ChatGPT and others to ensure the smooth scroll lands correctly
    // even when content is still being appended.
    requestAnimationFrame(() => requestAnimationFrame(apply));
  }, []);

  // If the content size grows while we are pinned, keep us pinned.
  // We use a ResizeObserver on the container's first child (the
  // "content" element) to detect new text height.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const target = el.firstElementChild;
    if (!target) return;
    const ro = new ResizeObserver(() => {
      if (pinnedRef.current) {
        scrollToBottom("auto");
      }
    });
    ro.observe(target);
    return () => ro.disconnect();
  }, [scrollToBottom]);

  return {
    containerRef,
    pinned: pinnedRef.current,
    detached,
    scrollToBottom,
  };
}
