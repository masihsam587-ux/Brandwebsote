import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampPanOffset,
  clampZoomScale,
  computeTouchDistance,
  detectSwipeDirection,
  getAdjacentImageUrls,
  toggleDoubleTapZoom,
  wrapGalleryIndex,
} from './lightbox';

test('wrapGalleryIndex wraps cleanly for single and multiple images', () => {
  assert.equal(wrapGalleryIndex(0, 1), 0);
  assert.equal(wrapGalleryIndex(1, 1), 0);
  assert.equal(wrapGalleryIndex(-1, 1), 0);
  assert.equal(wrapGalleryIndex(3, 3), 0);
  assert.equal(wrapGalleryIndex(-1, 4), 3);
  assert.equal(wrapGalleryIndex(2, 4), 2);
});

test('clampZoomScale and toggleDoubleTapZoom respect min/max bounds', () => {
  assert.equal(clampZoomScale(0.4), 1);
  assert.equal(clampZoomScale(2.5), 2.5);
  assert.equal(clampZoomScale(9), 4);
  assert.equal(toggleDoubleTapZoom(1), 2.25);
  assert.equal(toggleDoubleTapZoom(2.25), 1);
});

test('clampPanOffset resets at 1x and bounds pan at zoomed scales', () => {
  assert.deepEqual(clampPanOffset({ x: 120, y: -80 }, 1, { width: 400, height: 600 }), {
    x: 0,
    y: 0,
  });
  // At 2x on 400x600 viewport, max pan is +-200 horizontally and +-300 vertically
  assert.deepEqual(clampPanOffset({ x: 500, y: -450 }, 2, { width: 400, height: 600 }), {
    x: 200,
    y: -300,
  });
  assert.deepEqual(clampPanOffset({ x: -80, y: 90 }, 2, { width: 400, height: 600 }), {
    x: -80,
    y: 90,
  });
});

test('computeTouchDistance and detectSwipeDirection classify horizontal gestures accurately', () => {
  assert.equal(computeTouchDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  assert.equal(detectSwipeDirection(-70, 5, 220, false), 'next');
  assert.equal(detectSwipeDirection(70, -10, 220, false), 'prev');
  assert.equal(detectSwipeDirection(-70, 5, 220, true), 'prev');
  assert.equal(detectSwipeDirection(-15, 0, 120, false), null);
  assert.equal(detectSwipeDirection(-60, 80, 150, false), null);
  assert.equal(detectSwipeDirection(-90, 0, 1200, false), null);
});

test('getAdjacentImageUrls returns next/prev distinct URLs and handles 1-image galleries', () => {
  assert.deepEqual(getAdjacentImageUrls(['/only.jpg'], 0), []);
  assert.deepEqual(getAdjacentImageUrls(['/1.jpg', '/2.jpg', '/3.jpg'], 0), ['/2.jpg', '/3.jpg']);
  assert.deepEqual(getAdjacentImageUrls(['/1.jpg', '/2.jpg'], 0), ['/2.jpg']);
});
