<?php
/**
 * Публичные данные игрока для SEO (без PII).
 */

require_once __DIR__ . '/../config.php';

/** Поля, безопасные для индексации и превью без регистрации */
const HS_PLAYER_PUBLIC_SELECT =
    'id,name,position,team,country,city,age,avatar,number,goals,assists,games,experience,grip,status,is_hidden,created_at,birth_date,season_stats,achievements,height,weight,hockey_start_date,minutes,shots,saves';

/** Расширенный публичный набор для быстрой гидрации SPA (без PII: email/phone) */
const HS_PLAYER_BOOTSTRAP_SELECT =
    'id,name,position,team,country,city,age,avatar,number,goals,assists,games,experience,grip,status,is_hidden,created_at,birth_date,height,weight,hockey_start_date,minutes,shots,saves,instagram,tiktok,vk,website,photos,favorite_goals,pull_ups,push_ups,plank_time,sprint_100m,long_jump,jump_rope';

function hs_is_search_bot(string $userAgent): bool
{
    return (bool) preg_match(
        '/googlebot|bingbot|yandex|duckduckbot|baiduspider|facebookexternalhit|twitterbot|linkedinbot|slackbot|telegrambot|whatsapp|applebot|petalbot|semrush/i',
        $userAgent
    );
}

function hs_sanitize_player_id(string $raw): string
{
    $raw = trim(rawurldecode($raw));
    // Pretty URL: makar-balandin-<uuid> or bare uuid
    if (preg_match('/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i', $raw, $m)) {
        return strtolower($m[1]);
    }
    return preg_replace('/[^a-zA-Z0-9\-_]/', '', $raw);
}

/** Never leak login PII into SEO HTML / public bootstrap JSON. */
function hs_strip_player_pii(array $row): array
{
    unset(
        $row['phone'],
        $row['email'],
        $row['parent_email'],
        $row['password'],
        $row['password_hash']
    );
    return $row;
}

function hs_slugify_latin(string $input): string
{
    $map = [
        'а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'g', 'д' => 'd', 'е' => 'e', 'ё' => 'e',
        'ж' => 'zh', 'з' => 'z', 'и' => 'i', 'й' => 'y', 'к' => 'k', 'л' => 'l', 'м' => 'm',
        'н' => 'n', 'о' => 'o', 'п' => 'p', 'р' => 'r', 'с' => 's', 'т' => 't', 'у' => 'u',
        'ф' => 'f', 'х' => 'h', 'ц' => 'ts', 'ч' => 'ch', 'ш' => 'sh', 'щ' => 'sch',
        'ъ' => '', 'ы' => 'y', 'ь' => '', 'э' => 'e', 'ю' => 'yu', 'я' => 'ya',
    ];
    $lower = mb_strtolower(trim($input), 'UTF-8');
    $out = '';
    $len = mb_strlen($lower, 'UTF-8');
    for ($i = 0; $i < $len; $i++) {
        $ch = mb_substr($lower, $i, 1, 'UTF-8');
        if (isset($map[$ch])) {
            $out .= $map[$ch];
        } elseif (preg_match('/[a-z0-9]/', $ch)) {
            $out .= $ch;
        } elseif (preg_match('/[\s_.\-\/\\\\]+/u', $ch)) {
            $out .= '-';
        }
    }
    $out = preg_replace('/-+/', '-', $out);
    $out = trim($out, '-');
    return $out !== '' ? substr($out, 0, 60) : 'player';
}

function hs_supported_langs(): array
{
    return ['ru', 'en', 'lt', 'lv', 'pl', 'sv', 'cs', 'sk', 'fi', 'it', 'de', 'fr'];
}

/**
 * Языки, для которых у SEO-страницы есть НАСТОЯЩИЙ перевод текста.
 * Остальные 10 языков рендерят русский текст — раздавать их Google как отдельные
 * URL с hreflang = 12 дублей на игрока и размытый краулинговый бюджет.
 */
function hs_seo_langs(): array
{
    return ['ru', 'en'];
}

/** Язык для канонического URL: всё, что не переведено, схлопывается в ru. */
function hs_seo_canonical_lang(string $lang): string
{
    return in_array($lang, hs_seo_langs(), true) ? $lang : 'ru';
}

function hs_normalize_lang(?string $lang): string
{
    $lang = strtolower(trim((string) $lang));
    return in_array($lang, hs_supported_langs(), true) ? $lang : 'ru';
}

function hs_player_pretty_path(string $playerId, ?string $name = null, string $lang = 'ru'): string
{
    $slug = hs_slugify_latin($name ?? '');
    if ($slug === '' || $slug === 'player') {
        $slug = $playerId;
    }
    $lang = hs_normalize_lang($lang);
    return '/' . $lang . '/player/' . rawurlencode($slug);
}

/**
 * Resolve Latin slug (ivan-merkulov) to player UUID.
 */
function hs_resolve_player_id_from_slug(string $raw): string
{
    $slug = strtolower(trim(rawurldecode($raw)));
    if ($slug === '' || $slug === 'player') {
        return '';
    }
    if (preg_match('/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i', $slug, $m)) {
        return strtolower($m[1]);
    }

    $hint = explode('-', $slug)[0] ?? $slug;
    if ($hint === '') {
        return '';
    }

    $url = rtrim(HS_SUPABASE_URL, '/')
        . '/rest/v1/players?select=id,name&name=ilike.'
        . rawurlencode('%' . $hint . '%')
        . '&limit=40';

    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => implode("\r\n", [
                'apikey: ' . HS_SUPABASE_ANON_KEY,
                'Authorization: Bearer ' . HS_SUPABASE_ANON_KEY,
                'Accept: application/json',
            ]),
            'timeout' => 8,
            'ignore_errors' => true,
        ],
    ]);

    $body = @file_get_contents($url, false, $ctx);
    $rows = is_string($body) ? json_decode($body, true) : [];
    if (!is_array($rows)) {
        return '';
    }

    foreach ($rows as $row) {
        if (!empty($row['id']) && hs_slugify_latin((string) ($row['name'] ?? '')) === $slug) {
            return (string) $row['id'];
        }
    }

    return '';
}

/**
 * @return array<string, mixed>|null
 */
function hs_fetch_public_player(string $playerId): ?array
{
    if ($playerId === '') {
        return null;
    }

    $url = rtrim(HS_SUPABASE_URL, '/')
        . '/rest/v1/players?id=eq.' . rawurlencode($playerId)
        . '&select=' . rawurlencode(HS_PLAYER_PUBLIC_SELECT)
        . '&limit=1';

    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => implode("\r\n", [
                'apikey: ' . HS_SUPABASE_ANON_KEY,
                'Authorization: Bearer ' . HS_SUPABASE_ANON_KEY,
                'Accept: application/json',
            ]),
            'timeout' => 8,
            'ignore_errors' => true,
        ],
    ]);

    $body = @file_get_contents($url, false, $ctx);
    if ($body === false) {
        return null;
    }

    $rows = json_decode($body, true);
    if (!is_array($rows) || count($rows) === 0) {
        return null;
    }

    $row = $rows[0];
    if (!empty($row['is_hidden'])) {
        return null;
    }

    // Current teams from player_teams (is_primary) — ignore stale players.team
    $row['current_teams'] = hs_fetch_current_team_names((string) $row['id']);

    return hs_strip_player_pii($row);
}

/**
 * Все команды игрока для SPA bootstrap (current + past).
 *
 * @return list<array<string, mixed>>
 */
function hs_fetch_player_teams_bootstrap(string $playerId): array
{
    if ($playerId === '') {
        return [];
    }

    $url = rtrim(HS_SUPABASE_URL, '/')
        . '/rest/v1/player_teams?player_id=eq.' . rawurlencode($playerId)
        . '&select=' . rawurlencode('team_id,is_primary,joined_date,start_year,end_year,team_order,teams!inner(id,name,name_ru,type,country,city)')
        . '&order=team_order.asc';

    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => implode("\r\n", [
                'apikey: ' . HS_SUPABASE_ANON_KEY,
                'Authorization: Bearer ' . HS_SUPABASE_ANON_KEY,
                'Accept: application/json',
            ]),
            'timeout' => 8,
            'ignore_errors' => true,
        ],
    ]);

    $body = @file_get_contents($url, false, $ctx);
    $rows = is_string($body) ? json_decode($body, true) : [];
    if (!is_array($rows)) {
        return [];
    }

    $out = [];
    foreach ($rows as $row) {
        $team = $row['teams'] ?? null;
        if (!is_array($team)) {
            continue;
        }
        $name = trim((string) ($team['name'] ?? ''));
        if ($name === '') {
            continue;
        }
        $out[] = [
            'teamId' => (string) ($row['team_id'] ?? $team['id'] ?? ''),
            'teamName' => $name,
            'teamNameRu' => isset($team['name_ru']) ? trim((string) $team['name_ru']) : null,
            'teamType' => isset($team['type']) ? trim((string) $team['type']) : null,
            'teamCountry' => isset($team['country']) ? trim((string) $team['country']) : null,
            'teamCity' => isset($team['city']) ? trim((string) $team['city']) : null,
            'isPrimary' => !empty($row['is_primary']),
            'joinedDate' => $row['joined_date'] ?? null,
            'startYear' => isset($row['start_year']) ? (int) $row['start_year'] : null,
            'endYear' => isset($row['end_year']) ? (int) $row['end_year'] : null,
            'teamOrder' => isset($row['team_order']) ? (int) $row['team_order'] : 0,
        ];
    }
    return $out;
}

/**
 * Публичный игрок + команды для быстрой гидрации SPA.
 *
 * @return array{player: array<string, mixed>, teams: list<array<string, mixed>>}|null
 */
function hs_fetch_player_bootstrap(string $playerId): ?array
{
    if ($playerId === '') {
        return null;
    }

    $url = rtrim(HS_SUPABASE_URL, '/')
        . '/rest/v1/players?id=eq.' . rawurlencode($playerId)
        . '&select=' . rawurlencode(HS_PLAYER_BOOTSTRAP_SELECT)
        . '&limit=1';

    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => implode("\r\n", [
                'apikey: ' . HS_SUPABASE_ANON_KEY,
                'Authorization: Bearer ' . HS_SUPABASE_ANON_KEY,
                'Accept: application/json',
            ]),
            'timeout' => 8,
            'ignore_errors' => true,
        ],
    ]);

    $body = @file_get_contents($url, false, $ctx);
    if ($body === false) {
        return null;
    }

    $rows = json_decode($body, true);
    if (!is_array($rows) || count($rows) === 0) {
        return null;
    }

    $row = $rows[0];
    if (!empty($row['is_hidden'])) {
        return null;
    }

    $teams = hs_fetch_player_teams_bootstrap((string) $row['id']);
    $row['current_teams'] = [];
    foreach ($teams as $t) {
        if (!empty($t['isPrimary'])) {
            $row['current_teams'][] = [
                'name' => $t['teamName'],
                'name_ru' => $t['teamNameRu'],
                'type' => $t['teamType'],
            ];
        }
    }

    return [
        'player' => hs_strip_player_pii($row),
        'teams' => $teams,
    ];
}

/**
 * @return list<array{name:string,name_ru:?string,type:?string}>
 */
function hs_fetch_current_team_names(string $playerId): array
{
    if ($playerId === '') {
        return [];
    }

    $url = rtrim(HS_SUPABASE_URL, '/')
        . '/rest/v1/player_teams?player_id=eq.' . rawurlencode($playerId)
        . '&is_primary=eq.true'
        . '&select=' . rawurlencode('team_order,teams!inner(name,name_ru,type)')
        . '&order=team_order.asc';

    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => implode("\r\n", [
                'apikey: ' . HS_SUPABASE_ANON_KEY,
                'Authorization: Bearer ' . HS_SUPABASE_ANON_KEY,
                'Accept: application/json',
            ]),
            'timeout' => 8,
            'ignore_errors' => true,
        ],
    ]);

    $body = @file_get_contents($url, false, $ctx);
    $rows = is_string($body) ? json_decode($body, true) : [];
    if (!is_array($rows)) {
        return [];
    }

    $out = [];
    foreach ($rows as $row) {
        $team = $row['teams'] ?? null;
        if (!is_array($team)) {
            continue;
        }
        $name = trim((string) ($team['name'] ?? ''));
        if ($name === '') {
            continue;
        }
        $out[] = [
            'name' => $name,
            'name_ru' => isset($team['name_ru']) ? trim((string) $team['name_ru']) : null,
            'type' => isset($team['type']) ? trim((string) $team['type']) : null,
        ];
    }
    return $out;
}

/**
 * All current team names for SEO (comma-separated), localized like the profile header.
 *
 * @param list<array{name:string,name_ru:?string,type:?string}> $teams
 */
function hs_format_seo_team_names(array $teams, string $lang = 'ru'): string
{
    if (!$teams) {
        return '';
    }
    $names = [];
    foreach ($teams as $team) {
        if ($lang === 'ru') {
            $ru = trim((string) ($team['name_ru'] ?? ''));
            if ($ru !== '') {
                $names[] = $ru;
                continue;
            }
        }
        $name = trim((string) ($team['name'] ?? ''));
        if ($name !== '') {
            $names[] = $name;
        }
    }
    return implode(', ', $names);
}

/** Страны хранятся по-русски; на английской странице показываем английское название. */
function hs_localize_country(?string $country, string $lang = 'ru'): string
{
    $raw = trim((string) $country);
    if ($raw === '' || $lang === 'ru') {
        return $raw;
    }
    $map = [
        'Беларусь' => 'Belarus', 'Россия' => 'Russia', 'Казахстан' => 'Kazakhstan', 'США' => 'USA',
        'Латвия' => 'Latvia', 'Польша' => 'Poland', 'Эстония' => 'Estonia', 'Финляндия' => 'Finland',
        'Литва' => 'Lithuania', 'Узбекистан' => 'Uzbekistan', 'Швейцария' => 'Switzerland',
        'Германия' => 'Germany', 'Канада' => 'Canada', 'Чехия' => 'Czechia', 'Швеция' => 'Sweden',
        'Франция' => 'France', 'Украина' => 'Ukraine', 'Словакия' => 'Slovakia', 'Италия' => 'Italy',
        'Австрия' => 'Austria', 'Норвегия' => 'Norway', 'Дания' => 'Denmark', 'Великобритания' => 'United Kingdom',
        'Армения' => 'Armenia', 'Азербайджан' => 'Azerbaijan', 'Грузия' => 'Georgia', 'Молдова' => 'Moldova',
        'Кыргызстан' => 'Kyrgyzstan', 'Киргизия' => 'Kyrgyzstan', 'Таджикистан' => 'Tajikistan', 'Турция' => 'Turkey',
        'Испания' => 'Spain', 'Нидерланды' => 'Netherlands', 'Бельгия' => 'Belgium', 'Венгрия' => 'Hungary',
        'Словения' => 'Slovenia', 'Хорватия' => 'Croatia', 'Сербия' => 'Serbia', 'Румыния' => 'Romania',
        'Болгария' => 'Bulgaria', 'Израиль' => 'Israel', 'ОАЭ' => 'UAE', 'Китай' => 'China', 'Япония' => 'Japan',
        'Корея' => 'South Korea', 'Австралия' => 'Australia',
    ];
    return $map[$raw] ?? $raw;
}

function hs_localize_player_position(?string $position, string $lang = 'ru'): string
{
    $raw = trim((string) $position);
    if ($raw === '') {
        return '';
    }
    $key = mb_strtolower($raw, 'UTF-8');
    $mapRu = [
        'center' => 'Центральный нападающий',
        'winger' => 'Крайний нападающий',
        'defender' => 'Защитник',
        'goalie' => 'Вратарь',
        'goalkeeper' => 'Вратарь',
        'центральный нападающий' => 'Центральный нападающий',
        'крайний нападающий' => 'Крайний нападающий',
        'защитник' => 'Защитник',
        'вратарь' => 'Вратарь',
    ];
    $mapEn = [
        'center' => 'Center',
        'winger' => 'Winger',
        'defender' => 'Defender',
        'goalie' => 'Goalie',
        'goalkeeper' => 'Goalie',
        'центральный нападающий' => 'Center',
        'крайний нападающий' => 'Winger',
        'защитник' => 'Defender',
        'вратарь' => 'Goalie',
    ];
    $map = $lang === 'ru' ? $mapRu : $mapEn;
    return $map[$key] ?? $raw;
}

function hs_player_avatar_url(?string $avatar): string
{
    if (!$avatar || trim($avatar) === '') {
        return HS_SITE_URL . '/logo.png';
    }
    $avatar = trim($avatar);
    if (preg_match('#^https?://#i', $avatar)) {
        return $avatar;
    }
    return rtrim(HS_SUPABASE_URL, '/') . '/storage/v1/object/public/' . ltrim($avatar, '/');
}

/** jsonb-поля иногда приходят как строка (в т.ч. дважды закодированная). */
function hs_decode_json_field($raw)
{
    $value = $raw;
    for ($i = 0; $i < 2 && is_string($value); $i++) {
        $decoded = json_decode($value, true);
        if ($decoded === null && trim($value) !== 'null') {
            break;
        }
        $value = $decoded;
    }
    return $value;
}

/** Текущий сезон (колонки goals/assists/games) — ключ как в приложении. */
const HS_CURRENT_SEASON_KEY = '26/27';

/**
 * Сезоны игрока: архив из season_stats + текущий сезон из колонок.
 * Возвращает [ключ сезона => ['games','goals','assists','points']], новые сверху.
 */
function hs_player_seasons(array $player): array
{
    $seasons = [];
    $archive = hs_decode_json_field($player['season_stats'] ?? null);
    if (is_array($archive)) {
        foreach ($archive as $key => $block) {
            if (!is_array($block) || $key === HS_CURRENT_SEASON_KEY) {
                continue;
            }
            $g = (int) ($block['goals'] ?? 0);
            $a = (int) ($block['assists'] ?? 0);
            $gp = (int) ($block['games'] ?? 0);
            if ($g + $a + $gp === 0) {
                continue;
            }
            $seasons[(string) $key] = ['games' => $gp, 'goals' => $g, 'assists' => $a, 'points' => $g + $a];
        }
    }
    $g = (int) ($player['goals'] ?? 0);
    $a = (int) ($player['assists'] ?? 0);
    $gp = (int) ($player['games'] ?? 0);
    if ($g + $a + $gp > 0) {
        $seasons[HS_CURRENT_SEASON_KEY] = ['games' => $gp, 'goals' => $g, 'assists' => $a, 'points' => $g + $a];
    }
    uksort($seasons, static fn ($x, $y) => strcmp((string) $y, (string) $x));
    return $seasons;
}

/** Сумма по всем сезонам — то, что показывает рейтинг в приложении. */
function hs_player_season_stats(array $player): array
{
    $goals = 0;
    $assists = 0;
    $games = 0;
    foreach (hs_player_seasons($player) as $block) {
        $goals += $block['goals'];
        $assists += $block['assists'];
        $games += $block['games'];
    }
    $points = $goals + $assists;
    $ppg = $games > 0 ? round($points / $games, 2) : null;
    return ['points' => $points, 'goals' => $goals, 'assists' => $assists, 'games' => $games, 'ppg' => $ppg];
}

/** @return list<array{competition:string,year:?int,place:?int}> */
function hs_player_achievements(array $player): array
{
    $raw = hs_decode_json_field($player['achievements'] ?? null);
    if (!is_array($raw)) {
        return [];
    }
    $out = [];
    foreach ($raw as $item) {
        if (!is_array($item)) {
            continue;
        }
        $title = trim((string) ($item['competition'] ?? $item['title'] ?? ''));
        if ($title === '') {
            continue;
        }
        $out[] = [
            'competition' => $title,
            'year' => isset($item['year']) && (int) $item['year'] > 0 ? (int) $item['year'] : null,
            'place' => isset($item['place']) && (int) $item['place'] > 0 ? (int) $item['place'] : null,
        ];
    }
    return $out;
}

/**
 * Игроки того же года рождения (и страны, если есть) — внутренние ссылки между профилями.
 * Без них страницы игроков доступны только из sitemap, и Google считает их «сиротами».
 *
 * @return list<array{id:string,name:string,avatar:?string,position:?string}>
 */
function hs_fetch_related_players(array $player, int $limit = 8): array
{
    $year = hs_player_birth_year($player);
    $country = trim((string) ($player['country'] ?? ''));
    $params = [
        'select=id,name,avatar,position,country,birth_date',
        'is_hidden=eq.false',
        'status=eq.player',
        'id=neq.' . rawurlencode((string) ($player['id'] ?? '')),
        'order=updated_at.desc',
        'limit=' . $limit,
    ];
    if ($year) {
        $params[] = 'birth_date=gte.' . $year . '-01-01';
        $params[] = 'birth_date=lte.' . $year . '-12-31';
    }
    if ($country !== '') {
        $params[] = 'country=eq.' . rawurlencode($country);
    }
    $url = rtrim(HS_SUPABASE_URL, '/') . '/rest/v1/players?' . implode('&', $params);
    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => implode("\r\n", [
                'apikey: ' . HS_SUPABASE_ANON_KEY,
                'Authorization: Bearer ' . HS_SUPABASE_ANON_KEY,
                'Accept: application/json',
            ]),
            'timeout' => 6,
            'ignore_errors' => true,
        ],
    ]);
    $body = @file_get_contents($url, false, $ctx);
    $rows = is_string($body) ? json_decode($body, true) : [];
    if (!is_array($rows)) {
        return [];
    }
    $out = [];
    foreach ($rows as $row) {
        if (empty($row['id']) || trim((string) ($row['name'] ?? '')) === '') {
            continue;
        }
        $out[] = [
            'id' => (string) $row['id'],
            'name' => trim((string) $row['name']),
            'avatar' => $row['avatar'] ?? null,
            'position' => $row['position'] ?? null,
        ];
    }
    return $out;
}

function hs_player_birth_year(array $player): ?string
{
    $bd = trim((string) ($player['birth_date'] ?? ''));
    if ($bd !== '' && preg_match('/(\d{4})/', $bd, $m)) {
        return $m[1];
    }
    return null;
}

function hs_player_role_word(array $player, string $lang = 'ru'): string
{
    $status = strtolower((string) ($player['status'] ?? 'player'));
    $mapRu = [
        'player' => 'хоккеист',
        'coach' => 'тренер',
        'star' => 'звезда',
        'scout' => 'скаут',
        'shop' => 'магазин',
    ];
    $mapEn = [
        'player' => 'hockey player',
        'coach' => 'coach',
        'star' => 'star',
        'scout' => 'scout',
        'shop' => 'shop',
    ];
    $map = $lang === 'ru' ? $mapRu : $mapEn;
    return $map[$status] ?? ($lang === 'ru' ? 'профиль' : 'profile');
}

function hs_player_seo_team(array $player, string $lang = 'ru'): string
{
    $current = $player['current_teams'] ?? [];
    if (is_array($current) && $current) {
        return hs_format_seo_team_names($current, $lang);
    }
    // Do not use legacy players.team (stale duplicates like "Привет").
    return '';
}

function hs_player_seo_title(array $player, string $lang = 'ru'): string
{
    $name = trim((string) ($player['name'] ?? 'HockeyStars'));
    $name = $name !== '' ? mb_strtoupper($name, 'UTF-8') : 'HOCKEYSTARS';
    $number = trim((string) ($player['number'] ?? ''));
    $namePart = $number !== '' ? ($name . ' #' . $number) : $name;

    $bits = [hs_player_role_word($player, $lang)];
    $position = hs_localize_player_position($player['position'] ?? null, $lang);
    if ($position !== '') {
        $bits[] = $position;
    }

    $team = hs_player_seo_team($player, $lang);
    $year = hs_player_birth_year($player);
    if ($team !== '' && $year) {
        $bits[] = $team . ' ' . $year;
    } elseif ($team !== '') {
        $bits[] = $team;
    } elseif ($year) {
        $bits[] = $year;
    }

    $country = hs_localize_country($player['country'] ?? null, $lang);
    if ($country !== '') {
        $bits[] = $country;
    }

    $statsLabel = $lang === 'ru' ? 'Статистика' : 'Statistics';
    return $namePart . ' - ' . implode(', ', $bits) . '. ' . $statsLabel . ' - Hockeystars';
}

function hs_player_seo_description(array $player, string $lang = 'ru'): string
{
    $name = trim((string) ($player['name'] ?? 'HockeyStars'));
    $role = hs_player_role_word($player, $lang);
    $team = hs_player_seo_team($player, $lang);
    $country = hs_localize_country($player['country'] ?? null, $lang);
    $position = hs_localize_player_position($player['position'] ?? null, $lang);
    $stats = hs_player_season_stats($player);

    if ($lang === 'ru') {
        $text = $name . ' — ' . $role;
        if ($team !== '') {
            $text .= ' ' . $team;
        }
        if ($country !== '') {
            $text .= ' из ' . $country;
        }
        if ($position !== '') {
            $text .= ', ' . mb_strtolower($position, 'UTF-8');
        }
        $text .= '. Смотри статистику игрока, перспективы и скаутский отчёт в HockeyStars.';
        if ($stats['points'] > 0 && $stats['games'] > 0) {
            $text .= ' ' . $stats['goals'] . ' голов и ' . $stats['assists'] . ' передач в ' . $stats['games'] . ' играх.';
        }
        return $text;
    }

    $text = $name . ' — ' . $role;
    if ($team !== '') {
        $text .= ' of ' . $team;
    }
    if ($country !== '') {
        $text .= ' from ' . $country;
    }
    if ($position !== '') {
        $text .= ', ' . mb_strtolower($position, 'UTF-8');
    }
    $text .= '. View player stats, prospects and scout report on HockeyStars.';
    if ($stats['points'] > 0 && $stats['games'] > 0) {
        $text .= ' ' . $stats['goals'] . ' goals and ' . $stats['assists'] . ' assists in ' . $stats['games'] . ' games.';
    }
    return $text;
}

function hs_player_json_ld(array $player, string $canonicalUrl, string $lang = 'ru'): string
{
    $team = hs_player_seo_team($player, $lang);
    $position = hs_localize_player_position($player['position'] ?? null, $lang);
    $payload = [
        '@context' => 'https://schema.org',
        '@type' => 'Person',
        'name' => $player['name'] ?? 'HockeyStars player',
        'url' => $canonicalUrl,
        'image' => hs_player_avatar_url($player['avatar'] ?? null),
        'jobTitle' => $position !== '' ? $position : null,
        'memberOf' => $team !== ''
            ? ['@type' => 'SportsTeam', 'name' => $team]
            : null,
        'nationality' => !empty($player['country']) ? hs_localize_country($player['country'], $lang) : null,
        'birthDate' => hs_player_birth_year($player),
        'height' => !empty($player['height']) && (int) $player['height'] > 0 ? ((int) $player['height']) . ' cm' : null,
        'weight' => !empty($player['weight']) && (int) $player['weight'] > 0 ? ((int) $player['weight']) . ' kg' : null,
        'knowsAbout' => 'Ice hockey',
        'description' => hs_player_seo_description($player, $lang),
    ];

    $payload = array_filter($payload, static fn ($v) => $v !== null && $v !== '');

    return json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

