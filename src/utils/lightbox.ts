export interface Point2D {
  x: number;
  y: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

const MIN_LIGHTBOX_SCALE = 1;
const MAX_LIGHTBOX_SCALE = 4;
const DOUBLE_TAP_ZOOM_SCALE = 2.25;

export function wrapGalleryIndex(index: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  const safeTotal = Math.floor(total);
  const safeIndex = Math.trunc(index);
  return ((safeIndex % safeTotal) + safeTotal) % safeTotal;
}

export function clampZoomScale(
  scale: number,
  min = MIN_LIGHTBOX_SCALE,
  max = MAX_LIGHTBOX_SCALE
): number {
  if (!Number.isFinite(scale)) return min;
  return Math.min(max, Math.max(min, Number(scale.toFixed(3))));
}

export function clampPanOffset(
  pan: Point2D,
  scale: number,
  viewport: ViewportSize
): Point2D {
  if (!Number.isFinite(scale) || scale <= 1) {
    return { x: 0, y: 0 };
  }
  const safeW = Math.max(0, viewport.width);
  const safeH = Math.max(0, viewport.height);
  const maxX = Math.max(0, ((scale - 1) * safeW) / 2);
  const maxY = Math.max(0, ((scale - 1) * safeH) / 2);

  return {
    x: Math.min(maxX, Math.max(-maxX, Number.isFinite(pan.x) ? pan.x : 0)),
    y: Math.min(maxY, Math.max(-maxY, Number.isFinite(pan.y) ? pan.y : 0)),
  };
}

export function toggleDoubleTapZoom(
  currentScale: number,
  targetScale = DOUBLE_TAP_ZOOM_SCALE
): number {
  return currentScale > 1.05 ? MIN_LIGHTBOX_SCALE : clampZoomScale(targetScale);
}

export function computeTouchDistance(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function detectSwipeDirection(
  dx: number,
  dy: number,
  elapsedMs: number,
  isRtl = false,
  thresholdPx = 45,
  maxDurationMs = 750
): 'next' | 'prev' | null {
  if (elapsedMs > maxDurationMs) return null;
  if (Math.abs(dx) < thresholdPx) return null;
  if (Math.abs(dy) > Math.abs(dx) * 0.85) return null;
  const swipedLeft = dx < 0;
  if (isRtl) {
    return swipedLeft ? 'prev' : 'next';
  }
  return swipedLeft ? 'next' : 'prev';
}

export function getAdjacentImageUrls(images: string[], activeIndex: number): string[] {
  if (!Array.isArray(images) || images.length <= 1) return [];
  const nextIdx = wrapGalleryIndex(activeIndex + 1, images.length);
  const prevIdx = wrapGalleryIndex(activeIndex - 1, images.length);
  const urls = new Set<string>();
  const current = images[wrapGalleryIndex(activeIndex, images.length)];
  if (images[nextIdx] && images[nextIdx] !== current) urls.add(images[nextIdx]);
  if (images[prevIdx] && images[prevIdx] !== current) urls.add(images[prevIdx]);
  return Array.from(urls);
}
