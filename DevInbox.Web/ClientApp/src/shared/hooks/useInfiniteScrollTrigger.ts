import { useEffect, useRef } from 'react';

interface UseInfiniteScrollTriggerOptions {
  /** Whether another page is available to fetch. */
  hasNextPage?: boolean;
  /** Whether a page fetch (initial or next) is currently in flight — used to avoid duplicate triggers. */
  isFetching?: boolean;
  /** Called when the sentinel becomes visible and a next page should be requested. */
  onLoadMore: () => void;
  /** Scrollable ancestor to use as the observer root. Defaults to the nearest scrolling container (viewport). */
  root?: Element | null;
  /** Grows the root's intersection area so the next page starts loading slightly before the sentinel is reached. */
  rootMargin?: string;
}

/**
 * Attaches an IntersectionObserver to a sentinel element and calls `onLoadMore` whenever it
 * scrolls into view. Works for both mouse-wheel and touch scrolling since it reacts to layout,
 * not scroll events, so it needs no changes for desktop vs. mobile.
 */
export const useInfiniteScrollTrigger = ({
  hasNextPage,
  isFetching,
  onLoadMore,
  root = null,
  rootMargin = '200px',
}: UseInfiniteScrollTriggerOptions) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetching) {
          onLoadMoreRef.current();
        }
      },
      { root, rootMargin },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetching, root, rootMargin]);

  return sentinelRef;
};
