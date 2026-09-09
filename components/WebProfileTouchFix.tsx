import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

const PROFILE_PATH = /\/player\//;

/**
 * RN-web bottom tabs render every screen as a full-size absolutely positioned
 * sibling. On a cold deep link to /ru/player/… the home tab keeps a scene on top
 * of the profile, so the finger never reaches the profile ScrollView.
 *
 * Walk the profile's ancestor chain and mute every full-screen sibling scene.
 */
export default function WebProfileTouchFix() {
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (!PROFILE_PATH.test(pathname || '')) return;

    const muted = new Map<HTMLElement, string>();
    let frame = 0;
    let cancelled = false;

    const mute = (el: HTMLElement) => {
      if (el.style.pointerEvents === 'none') return;
      if (!muted.has(el)) muted.set(el, el.style.pointerEvents);
      el.style.pointerEvents = 'none';
    };

    const apply = () => {
      frame = 0;
      if (cancelled) return;
      const scrollRoot = document.getElementById('hs-profile-scroll');
      if (!scrollRoot) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      for (let node: HTMLElement | null = scrollRoot; node && node !== document.body; node = node.parentElement) {
        if (node.style.pointerEvents === 'none') node.style.pointerEvents = 'auto';

        const parent = node.parentElement;
        if (!parent) break;
        for (const sibling of Array.from(parent.children)) {
          if (sibling === node || !(sibling instanceof HTMLElement)) continue;
          if (getComputedStyle(sibling).position !== 'absolute') continue;
          const r = sibling.getBoundingClientRect();
          if (r.width < vw * 0.85 || r.height < vh * 0.5) continue;
          mute(sibling);
        }
      }
    };

    const schedule = () => {
      if (cancelled || frame) return;
      frame = requestAnimationFrame(apply);
    };

    apply();
    const timers = [80, 250, 700, 1500, 3000].map((ms) => window.setTimeout(apply, ms));

    // Scenes are added/removed while the profile boots, so re-check for a few
    // seconds — coalesced into one rAF pass, otherwise our own style writes
    // retrigger the observer. Then stop: leaving it attached would force a
    // layout on every image that finishes loading further down the profile.
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    timers.push(window.setTimeout(() => observer.disconnect(), 5000));

    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
      observer.disconnect();
      muted.forEach((original, el) => {
        el.style.pointerEvents = original;
      });
    };
  }, [pathname]);

  return null;
}
