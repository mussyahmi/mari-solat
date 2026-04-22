'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface ScrollableNavProps {
  children: React.ReactNode;
  className?: string;
}

export default function ScrollableNav({ children, className }: ScrollableNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [thumbTop, setThumbTop] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const [atBottom, setAtBottom] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragStartY = useRef(0);
  const dragStartScrollTop = useRef(0);

  const updateThumb = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const scrollable = scrollHeight > clientHeight + 2;
    setIsScrollable(scrollable);
    setAtBottom(!scrollable || scrollTop + clientHeight >= scrollHeight - 4);

    if (!scrollable) return;

    // trackRef may not be mounted yet on the first call (before isScrollable flips true).
    // Fall back to clientHeight as an approximation so the thumb renders immediately
    // on the re-render after isScrollable becomes true.
    const trackHeight = trackRef.current?.clientHeight ?? clientHeight;
    const minThumb = 32;
    const ratio = clientHeight / scrollHeight;
    const th = Math.max(ratio * trackHeight, minThumb);
    setThumbHeight(th);
    setThumbTop((scrollTop / (scrollHeight - clientHeight)) * (trackHeight - th));
  }, []);

  // Re-run once after isScrollable flips true so the track height is accurate.
  useEffect(() => {
    if (isScrollable) updateThumb();
  }, [isScrollable, updateThumb]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateThumb();
    el.addEventListener('scroll', updateThumb, { passive: true });
    const ro = new ResizeObserver(updateThumb);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateThumb); ro.disconnect(); };
  }, [updateThumb]);

  const onThumbPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    dragStartY.current = e.clientY;
    dragStartScrollTop.current = scrollRef.current?.scrollTop ?? 0;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onThumbPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const delta = e.clientY - dragStartY.current;
    const scrollRatio = (el.scrollHeight - el.clientHeight) / (track.clientHeight - thumbHeight);
    el.scrollTop = dragStartScrollTop.current + delta * scrollRatio;
  };

  const onTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const rect = track.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    el.scrollTop = ratio * (el.scrollHeight - el.clientHeight);
  };

  return (
    <div className={`flex flex-1 min-h-0 relative ${className ?? ''}`}>
      {/* scrollable content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {children}
      </div>

      {/* scrollbar column */}
      <div className="w-4 shrink-0 flex flex-col py-2">
        {isScrollable && (
          <div
            ref={trackRef}
            onClick={onTrackClick}
            className="relative flex-1 mx-auto w-1 rounded-full cursor-pointer"
            style={{ background: 'oklch(from var(--border) l c h / 0.5)' }}
          >
            <div
              onPointerDown={onThumbPointerDown}
              onPointerMove={onThumbPointerMove}
              onPointerUp={() => setIsDragging(false)}
              onPointerCancel={() => setIsDragging(false)}
              className="absolute inset-x-0 rounded-full transition-colors duration-150"
              style={{
                top: thumbTop,
                height: thumbHeight,
                background: isDragging
                  ? 'var(--primary)'
                  : 'oklch(from var(--primary) l c h / 0.5)',
                cursor: isDragging ? 'grabbing' : 'grab',
              }}
            />
          </div>
        )}
      </div>

      {/* bottom fade */}
      {isScrollable && !atBottom && (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 right-4 h-10"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--background))' }}
        />
      )}
    </div>
  );
}
