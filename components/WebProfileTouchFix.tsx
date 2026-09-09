import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

const PROFILE_PATH = /\/player\//;

function findProfileScrollRoot(): HTMLElement | null {
  const byId = document.getElementById('hs-profile-scroll');
  if (byId) return byId;

  // Fallback while slug/profile is still resolving.
  for (const el of document.querySelectorAll('div')) {
    const s = getComputedStyle(el);
    if (s.overflowY === 'auto' && s.touchAction.includes('pan-y')) {
      const r = el.getBoundingClientRect();
      if (r.width > 200 && r.height > 300) return el;
    }
  }
  return null;
}

/**
 * RN-web bottom tabs mount every scene as position:absolute siblings.
 * On a cold deep-link to /ru/player/… the home tab scene can sit above the
 * profile and steal touches even though the profile is visible underneath.
 */
export default function WebProfileTouchFix() {
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (!PROFILE_PATH.test(pathname || '')) return;

    let cancelled = false;
    let observer: MutationObserver | null = null;

    const apply = () => {
      if (cancelled) return;
      const scrollRoot = findProfileScrollRoot();
      if (!scrollRoot) return;

      // Walk up from the profile ScrollView and ensure its branch receives touches.
      for (let node: HTMLElement | null = scrollRoot; node && node !== document.body; node = node.parentElement) {
        node.style.pointerEvents = 'auto';
        if (node.style.zIndex === '' || node.style.zIndex === '0') {
          node.style.zIndex = '10';
        }
      }

      // Full-screen absolute tab scenes that do NOT contain the profile scroll view block swipes.
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      document.querySelectorAll('div').forEach((el) => {
        if (el === scrollRoot || el.contains(scrollRoot) || scrollRoot.contains(el)) return;
        const s = getComputedStyle(el);
        if (s.position !== 'absolute') return;
        const r = el.getBoundingClientRect();
        if (r.width < vw * 0.85 || r.height < vh * 0.5) return;
        el.style.pointerEvents = 'none';
      });
    };

    apply();
    const t1 = requestAnimationFrame(apply);
    const timers = [120, 400, 900, 1800].map((ms) => window.setTimeout(apply, ms));

    observer = new MutationObserver(() => apply());
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      cancelled = true;
      cancelAnimationFrame(t1);
      timers.forEach(clearTimeout);
      observer?.disconnect();
    };
  }, [pathname]);

  return null;
}
