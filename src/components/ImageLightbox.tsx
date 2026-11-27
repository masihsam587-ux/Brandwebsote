import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import {
  clampPanOffset,
  clampZoomScale,
  computeTouchDistance,
  detectSwipeDirection,
  getAdjacentImageUrls,
  toggleDoubleTapZoom,
  wrapGalleryIndex,
  type Point2D,
} from '../utils/lightbox';

interface ImageLightboxProps {
  open: boolean;
  images: string[];
  initialIndex?: number;
  title: string;
  triggerRef?: RefObject<HTMLElement | null>;
  isRtl?: boolean;
  onClose: () => void;
}

const CLOSE_ANIMATION_MS = 180;

export function ImageLightbox({
  open,
  images,
  initialIndex = 0,
  title,
  triggerRef,
  isRtl = false,
  onClose,
}: ImageLightboxProps) {
  const safeImages = images.filter(Boolean);
  const total = safeImages.length;

  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => wrapGalleryIndex(initialIndex, total));
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState<Point2D>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const pushedHistoryRef = useRef(false);
  const closedViaPopstateRef = useRef(false);

  // Gesture refs
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const pinchRef = useRef<{ initialDistance: number; initialScale: number } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });
  const dragMovedRef = useRef(false);

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onChange = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  // Sync open -> mount & initial state
  useEffect(() => {
    if (open) {
      previousFocusRef.current =
        (document.activeElement instanceof HTMLElement ? document.activeElement : null) ||
        triggerRef?.current ||
        null;
      setRendered(true);
      setClosing(false);
      setActiveIndex(wrapGalleryIndex(initialIndex, total));
      setScale(1);
      setPan({ x: 0, y: 0 });
      closedViaPopstateRef.current = false;
    } else if (rendered) {
      if (prefersReducedMotion) {
        setRendered(false);
        setClosing(false);
      } else {
        setClosing(true);
        const timer = window.setTimeout(() => {
          setRendered(false);
          setClosing(false);
        }, CLOSE_ANIMATION_MS);
        return () => window.clearTimeout(timer);
      }
    }
  }, [open, initialIndex, total, prefersReducedMotion, rendered, triggerRef]);

  const requestClose = useCallback(
    (fromPopstate = false) => {
      if (fromPopstate) {
        closedViaPopstateRef.current = true;
        pushedHistoryRef.current = false;
      }
      onClose();
    },
    [onClose]
  );

  // Lock background scroll while rendered
  useEffect(() => {
    if (!rendered || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.documentElement.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'contain';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overscrollBehavior = prevOverscroll;
    };
  }, [rendered]);

  // Mobile Back button integration via History API
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    if (!pushedHistoryRef.current) {
      const currentState =
        window.history.state && typeof window.history.state === 'object'
          ? window.history.state
          : {};
      window.history.pushState({ ...currentState, caLightbox: true }, '');
      pushedHistoryRef.current = true;
    }

    const handlePopState = () => {
      if (pushedHistoryRef.current) {
        pushedHistoryRef.current = false;
        requestClose(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (pushedHistoryRef.current && !closedViaPopstateRef.current) {
        pushedHistoryRef.current = false;
        window.history.back();
      }
    };
  }, [open, requestClose]);

  const wasOpenRef = useRef(false);

  // Focus initialization & restoration on close
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      const timer = window.setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 20);
      return () => window.clearTimeout(timer);
    }
    if (!rendered && wasOpenRef.current) {
      wasOpenRef.current = false;
      const target = triggerRef?.current || previousFocusRef.current;
      if (target && typeof target.focus === 'function') {
        window.requestAnimationFrame(() => target.focus());
      }
    }
  }, [open, rendered, triggerRef]);

  const goToIndex = useCallback(
    (nextIndex: number) => {
      if (total <= 1) return;
      setActiveIndex(wrapGalleryIndex(nextIndex, total));
      setScale(1);
      setPan({ x: 0, y: 0 });
    },
    [total]
  );

  const goNext = useCallback(() => goToIndex(activeIndex + 1), [activeIndex, goToIndex]);
  const goPrev = useCallback(() => goToIndex(activeIndex - 1), [activeIndex, goToIndex]);

  // Preload adjacent images
  useEffect(() => {
    if (!open || total <= 1 || typeof Image === 'undefined') return;
    const urls = getAdjacentImageUrls(safeImages, activeIndex);
    urls.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [open, activeIndex, safeImages, total]);

  // Keyboard navigation + Esc + Tab focus trap
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestClose(false);
        return;
      }

      if (e.key === 'ArrowRight' && total > 1) {
        e.preventDefault();
        if (isRtl) goPrev();
        else goNext();
        return;
      }

      if (e.key === 'ArrowLeft' && total > 1) {
        e.preventDefault();
        if (isRtl) goNext();
        else goPrev();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null);

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, total, isRtl, goNext, goPrev, requestClose]);

  const applyZoom = useCallback((nextScaleRaw: number) => {
    const nextScale = clampZoomScale(nextScaleRaw);
    setScale(nextScale);
    if (nextScale <= 1) {
      setPan({ x: 0, y: 0 });
    } else if (stageRef.current) {
      const rect = stageRef.current.getBoundingClientRect();
      setPan((prev) => clampPanOffset(prev, nextScale, { width: rect.width, height: rect.height }));
    }
  }, []);

  const handleToggleZoom = useCallback(() => {
    const targetScale = toggleDoubleTapZoom(scale);
    applyZoom(targetScale);
  }, [scale, applyZoom]);

  // Mouse drag & double-click handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || scale <= 1) return;
    e.preventDefault();
    dragMovedRef.current = false;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || scale <= 1) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragMovedRef.current = true;
    }
    const rect = stageRef.current?.getBoundingClientRect() || {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    setPan(
      clampPanOffset(
        { x: dragStartRef.current.panX + dx, y: dragStartRef.current.panY + dy },
        scale,
        { width: rect.width, height: rect.height }
      )
    );
  };

  const endMouseDrag = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // Touch handlers: pinch-to-zoom, pan when zoomed, double-tap, swipe L/R
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const d = computeTouchDistance(
        { x: e.touches[0].clientX, y: e.touches[0].clientY },
        { x: e.touches[1].clientX, y: e.touches[1].clientY }
      );
      pinchRef.current = { initialDistance: Math.max(1, d), initialScale: scale };
      dragStartRef.current = null;
      swipeStartRef.current = null;
      return;
    }

    if (e.touches.length === 1) {
      const t0 = e.touches[0];
      const now = Date.now();
      const prevTap = lastTapRef.current;
      const tapDist = computeTouchDistance({ x: t0.clientX, y: t0.clientY }, { x: prevTap.x, y: prevTap.y });
      if (now - prevTap.time < 280 && tapDist < 32) {
        lastTapRef.current = { time: 0, x: 0, y: 0 };
        handleToggleZoom();
        return;
      }
      lastTapRef.current = { time: now, x: t0.clientX, y: t0.clientY };

      if (scale > 1) {
        setIsDragging(true);
        dragStartRef.current = { x: t0.clientX, y: t0.clientY, panX: pan.x, panY: pan.y };
        swipeStartRef.current = null;
      } else {
        swipeStartRef.current = { x: t0.clientX, y: t0.clientY, time: now };
        dragStartRef.current = null;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const d = computeTouchDistance(
        { x: e.touches[0].clientX, y: e.touches[0].clientY },
        { x: e.touches[1].clientX, y: e.touches[1].clientY }
      );
      const nextScale = clampZoomScale(
        pinchRef.current.initialScale * (d / pinchRef.current.initialDistance)
      );
      applyZoom(nextScale);
      return;
    }

    if (e.touches.length === 1 && dragStartRef.current && scale > 1) {
      e.preventDefault();
      const t0 = e.touches[0];
      const dx = t0.clientX - dragStartRef.current.x;
      const dy = t0.clientY - dragStartRef.current.y;
      const rect = stageRef.current?.getBoundingClientRect() || {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      setPan(
        clampPanOffset(
          { x: dragStartRef.current.panX + dx, y: dragStartRef.current.panY + dy },
          scale,
          { width: rect.width, height: rect.height }
        )
      );
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      pinchRef.current = null;
    }
    setIsDragging(false);
    dragStartRef.current = null;

    if (swipeStartRef.current && e.changedTouches.length === 1 && scale <= 1.05 && total > 1) {
      const tEnd = e.changedTouches[0];
      const dx = tEnd.clientX - swipeStartRef.current.x;
      const dy = tEnd.clientY - swipeStartRef.current.y;
      const elapsed = Date.now() - swipeStartRef.current.time;
      const direction = detectSwipeDirection(dx, dy, elapsed, isRtl);
      if (direction === 'next') goNext();
      else if (direction === 'prev') goPrev();
    }
    swipeStartRef.current = null;
  };

  if (!rendered || total === 0) return null;

  const currentSrc = safeImages[wrapGalleryIndex(activeIndex, total)];
  const currentAlt = `${title} — image ${activeIndex + 1} of ${total}`;

  const content = (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} image gallery (${activeIndex + 1} of ${total})`}
      data-testid="image-lightbox"
      className={`fixed inset-0 z-[100] flex flex-col bg-[#09090b] text-white select-none ${
        prefersReducedMotion
          ? ''
          : closing
          ? 'opacity-0 transition-opacity duration-150'
          : 'opacity-100 transition-opacity duration-200'
      }`}
    >
      {/* Top Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <span
            data-testid="lightbox-counter"
            className="font-mono-nums shrink-0 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white"
          >
            {activeIndex + 1} / {total}
          </span>
          <p className="truncate text-xs text-white/75 sm:text-sm">{title}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleZoom}
            aria-label={scale > 1.05 ? 'Zoom out to fit screen' : 'Zoom in image'}
            data-testid="lightbox-zoom-toggle"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20"
          >
            {scale > 1.05 ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
          </button>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={() => requestClose(false)}
            aria-label="Close image viewer"
            data-testid="lightbox-close"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Stage */}
      <div
        ref={stageRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden px-2 py-2 sm:px-14"
        style={{ touchAction: 'none' }}
        onClick={(e) => {
          if (e.target === stageRef.current && !dragMovedRef.current) {
            requestClose(false);
          }
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endMouseDrag}
        onMouseLeave={endMouseDrag}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {total > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isRtl) goNext();
              else goPrev();
            }}
            aria-label="Previous image"
            data-testid="lightbox-prev"
            className="absolute left-2 top-1/2 z-20 inline-flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-xl bg-black/55 text-white hover:bg-black/80 sm:left-4"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        <img
          src={currentSrc}
          alt={currentAlt}
          data-testid="lightbox-image"
          draggable={false}
          onDoubleClick={(e) => {
            e.stopPropagation();
            handleToggleZoom();
          }}
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
            transition: isDragging || prefersReducedMotion ? 'none' : 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          }}
          className="max-h-[78dvh] max-w-full object-contain will-change-transform"
        />

        {total > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isRtl) goPrev();
              else goNext();
            }}
            aria-label="Next image"
            data-testid="lightbox-next"
            className="absolute right-2 top-1/2 z-20 inline-flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-xl bg-black/55 text-white hover:bg-black/80 sm:right-4"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Bottom Controls: Thumbnails + Dots */}
      <div className="pb-[calc(0.85rem+env(safe-area-inset-bottom))] flex flex-col items-center gap-2.5 px-4 pt-2">
        {total > 1 && (
          <>
            <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1">
              {safeImages.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => goToIndex(i)}
                  aria-label={`View image ${i + 1} of ${total}`}
                  aria-current={i === activeIndex ? 'true' : undefined}
                  className={`h-14 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-opacity ${
                    i === activeIndex
                      ? 'border-white opacity-100'
                      : 'border-transparent opacity-55 hover:opacity-90'
                  }`}
                >
                  <img
                    src={src}
                    alt={`${title} thumbnail ${i + 1}`}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5" aria-hidden="true">
              {safeImages.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === activeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/40'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        <p className="text-[11px] text-white/60">
          {scale > 1.05
            ? 'Drag to pan · Double-tap or zoom button to reset'
            : 'Double-tap or pinch to zoom · Esc or Back to close'}
        </p>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}
