/** Hockey season keys (start year / end year short). */
export const CURRENT_SEASON_KEY = '26/27';
export const PREVIOUS_SEASON_KEY = '25/26';

/** Season 26/27 starts 1 Sep 2026 (UTC). Activity rating counts from this date. */
export const CURRENT_SEASON_START_ISO = '2026-09-01T00:00:00.000Z';

/**
 * Подпись сезона на карточке «Поделиться рейтингом». Рейтинг поиска считается по сумме
 * всех сезонов; сейчас это фактически итоги 25/26 — сменить на CURRENT_SEASON_KEY,
 * когда очки нового сезона станут основой рейтинга.
 */
export const RATING_SHARE_SEASON_KEY = PREVIOUS_SEASON_KEY;

export const formatSeasonLabel = (seasonKey: string): string => seasonKey;
