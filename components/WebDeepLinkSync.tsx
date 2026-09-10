import { usePathname, useRootNavigationState, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { webHomePath } from '../utils/webHome';

/** Web-only redirects that must run after the tab navigator has mounted. */
export default function WebDeepLinkSync() {
  const router = useRouter();
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState();
  useEffect(() => {
    if (Platform.OS !== 'web' || !rootNavigationState?.key) return;

    const bare = (pathname || '/').replace(/\/+$/, '') || '/';
    if (bare === '/' || bare === '/index.html') {
      router.replace(webHomePath() as any);
      return;
    }

    // Profile tab focus is handled by lazy tabs + WebProfileTouchFix; no replace needed here.
  }, [pathname, router, rootNavigationState?.key]);

  return null;
}
