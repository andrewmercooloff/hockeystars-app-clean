import { Platform } from 'react-native';

/** Marketing site owns `/` on web; the rink home lives at `/feed`. */
export function webHomePath(): string {
  return Platform.OS === 'web' ? '/feed' : '/';
}

type RouterLike = {
  push: (href: any) => void;
  replace?: (href: any) => void;
};

export function goHome(router: RouterLike, params?: Record<string, string>) {
  const path = webHomePath();
  if (params && Object.keys(params).length) {
    router.replace?.({ pathname: path, params } as any) ?? router.push({ pathname: path, params } as any);
    return;
  }
  router.replace?.(path as any) ?? router.push(path as any);
}
