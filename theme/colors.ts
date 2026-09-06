/** Единая палитра приложения — dark (default) + light (ice rink) */

export type AppColors = {
  background: string;
  surface: string;
  surfaceOverlay: string;
  brand: string;
  brandDark: string;
  brandMuted: string;
  /** Очень лёгкий красный wash для фонов — не заливка, а тепло. */
  brandWash: string;
  /** Тонкая фирменная линия (хедер, таббар, сайдбар). */
  borderAccent: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  scene: string;
  iceFallback: string;
  success: string;
  warning: string;
  card: string;
  sidebar: string;
  input: string;
  /** Единая подложка поверх льда на всех экранах (список, загрузка, офлайн). */
  screenOverlay: string;
  /** Фон полосы заголовка — одинаковый на всех вкладках. */
  headerBar: string;
};

export const darkColors: AppColors = {
  // Dark Mode 2.0: графит + точечный фирменный красный (не заливка)
  background: '#121014',
  surface: '#1e1c20',
  surfaceOverlay: 'rgba(30, 28, 32, 0.96)',
  brand: '#fa2f40',
  brandDark: '#c92635',
  brandMuted: 'rgba(250, 47, 64, 0.22)',
  brandWash: 'rgba(250, 47, 64, 0.10)',
  borderAccent: 'rgba(250, 47, 64, 0.32)',
  text: '#ffffff',
  textSecondary: '#d4d4d8',
  textMuted: '#a1a1aa',
  border: 'rgba(255, 255, 255, 0.08)',
  scene: '#0e0b0d',
  iceFallback: '#d8e4ea',
  success: '#4CAF50',
  warning: '#FF9800',
  card: '#1e1c20',
  sidebar: '#100c0e',
  input: 'rgba(255,255,255,0.07)',
  screenOverlay: 'transparent',
  headerBar: '#121014',
};

/** Cool ice / arena light — not cream or purple */
export const lightColors: AppColors = {
  background: '#e8eef2',
  surface: '#f7fafc',
  surfaceOverlay: 'rgba(247, 250, 252, 0.9)',
  brand: '#d9182c',
  brandDark: '#a91222',
  brandMuted: 'rgba(217, 24, 44, 0.12)',
  brandWash: 'rgba(217, 24, 44, 0.06)',
  borderAccent: 'rgba(217, 24, 44, 0.28)',
  text: '#0f1720',
  textSecondary: '#334155',
  textMuted: '#64748b',
  border: 'rgba(15, 23, 32, 0.1)',
  scene: '#dce6ec',
  iceFallback: '#c5d4dc',
  success: '#15803d',
  warning: '#c2410c',
  card: 'rgba(255, 255, 255, 0.92)',
  sidebar: 'rgba(255, 255, 255, 0.96)',
  input: 'rgba(15, 23, 32, 0.05)',
  screenOverlay: 'rgba(232, 238, 242, 0.45)',
  headerBar: 'rgba(255, 255, 255, 0.55)',
};

/** @deprecated Prefer useTheme().colors — kept for existing dark imports */
export const colors = darkColors;
