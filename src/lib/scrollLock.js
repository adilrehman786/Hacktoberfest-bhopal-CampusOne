// Reference-counted page scroll lock for overlays (modals, drawers, palettes).
// Pins <body> with position:fixed so it also works on iOS Safari, compensates
// for the scrollbar width (no layout shift) and restores the exact scroll
// position when the last overlay closes.
import { useEffect } from 'react';

let locks = 0;
let savedY = 0;

export function lockScroll() {
  if (locks++ > 0) return;
  savedY = window.scrollY;
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  const s = document.body.style;
  s.position = 'fixed';
  s.top = `-${savedY}px`;
  s.left = '0';
  s.right = '0';
  s.width = '100%';
  if (scrollbar > 0) s.paddingRight = `${scrollbar}px`;
  document.documentElement.classList.add('scroll-locked');
}

export function unlockScroll() {
  if (locks === 0) return;
  if (--locks > 0) return;
  const s = document.body.style;
  s.position = s.top = s.left = s.right = s.width = s.paddingRight = '';
  document.documentElement.classList.remove('scroll-locked');
  window.scrollTo({ top: savedY, behavior: 'instant' });
}

/** Scroll the page, or (if an overlay is open) set where it lands when the overlay closes. */
export function scrollPageTo(y) {
  if (locks > 0) savedY = y;
  else window.scrollTo({ top: y, behavior: 'instant' });
}

export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    lockScroll();
    return unlockScroll;
  }, [active]);
}
