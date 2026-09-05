<?php
/**
 * Seed public shop / skate-sharpening profiles (one-shot).
 * Run on VPS: php /var/www/hockeystars-site/seed-hockey-shops.php
 */
require_once __DIR__ . '/config.php';

header('Content-Type: text/plain; charset=utf-8');

$serviceKey = getenv('SUPABASE_SERVICE_ROLE_KEY') ?: (defined('HS_SUPABASE_SERVICE_ROLE_KEY') ? HS_SUPABASE_SERVICE_ROLE_KEY : '');
$apiKey = $serviceKey !== '' ? $serviceKey : HS_SUPABASE_ANON_KEY;
$usingService = $serviceKey !== '';

function hs_rest(string $method, string $path, $body = null, string $apiKey = ''): array
{
    $url = rtrim(HS_SUPABASE_URL, '/') . $path;
    $headers = [
        'apikey: ' . $apiKey,
        'Authorization: Bearer ' . $apiKey,
        'Accept: application/json',
        'Content-Type: application/json',
        'Prefer: return=representation',
    ];
    $ctx = stream_context_create([
        'http' => [
            'method' => $method,
            'header' => implode("\r\n", $headers),
            'content' => $body === null ? null : json_encode($body, JSON_UNESCAPED_UNICODE),
            'timeout' => 30,
            'ignore_errors' => true,
        ],
    ]);
    $raw = @file_get_contents($url, false, $ctx);
    $code = 0;
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
        $code = (int) $m[1];
    }
    $decoded = is_string($raw) ? json_decode($raw, true) : null;
    return [$code, $decoded, is_string($raw) ? $raw : ''];
}

function hs_exists_by_phone(string $phone, string $apiKey): bool
{
    $q = rawurlencode($phone);
    [$code, $rows] = hs_rest('GET', "/rest/v1/players?phone=eq.{$q}&select=id,name&limit=1", null, $apiKey);
    return $code < 400 && is_array($rows) && count($rows) > 0;
}

/** @return string|null public URL */
function hs_upload_avatar_from_url(string $playerId, string $imageUrl, string $apiKey): ?string
{
    if ($imageUrl === '') {
        return null;
    }
    $bin = @file_get_contents($imageUrl, false, stream_context_create([
        'http' => ['timeout' => 20, 'header' => "User-Agent: HockeyStarsSeed/1.0\r\n", 'ignore_errors' => true],
        'ssl' => ['verify_peer' => true, 'verify_peer_name' => true],
    ]));
    if (!is_string($bin) || strlen($bin) < 500) {
        return null;
    }
    $ext = 'jpg';
    if (stripos($imageUrl, '.png') !== false) {
        $ext = 'png';
    } elseif (stripos($imageUrl, '.webp') !== false) {
        $ext = 'webp';
    }
    $path = "shops/{$playerId}/logo.{$ext}";
    $uploadUrl = rtrim(HS_SUPABASE_URL, '/') . '/storage/v1/object/avatars/' . $path;
    $ctx = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", [
                'apikey: ' . $apiKey,
                'Authorization: Bearer ' . $apiKey,
                'Content-Type: image/' . ($ext === 'jpg' ? 'jpeg' : $ext),
                'x-upsert: true',
            ]),
            'content' => $bin,
            'timeout' => 40,
            'ignore_errors' => true,
        ],
    ]);
    $raw = @file_get_contents($uploadUrl, false, $ctx);
    $code = 0;
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
        $code = (int) $m[1];
    }
    if ($code >= 400) {
        echo "  avatar upload failed HTTP {$code}: " . substr((string) $raw, 0, 120) . "\n";
        return null;
    }
    return rtrim(HS_SUPABASE_URL, '/') . '/storage/v1/object/public/avatars/' . $path;
}

$shops = [
    // ——— Belarus ———
    [
        'name' => 'HotIce',
        'status' => 'shop',
        'phone' => '+375293609691',
        'email' => 'info@hotice.by',
        'country' => 'Belarus',
        'city' => 'Минск',
        'address' => 'ул. Козлова 14 (вход с Берестянской 7). Магазин + заточка/профилирование коньков',
        'working_hours' => 'ежедневно, уточняйте на hotice.by',
        'website' => 'https://hotice.by/',
        'logo' => 'https://hotice.by/wp-content/uploads/2024/01/cropped-hotice-favicon-192x192.png',
        'photos' => [],
    ],
    [
        'name' => 'Sport-Ice',
        'status' => 'shop',
        'phone' => '+375291488008',
        'email' => 'tv3003@mail.ru',
        'country' => 'Belarus',
        'city' => 'Минск',
        'address' => 'пр-т Победителей 4А (Дворец спорта)',
        'working_hours' => 'Пн–Пт 10:00–19:00, Сб 10:00–18:00, Вс 11:00–16:00',
        'website' => 'http://sport-ice.by/',
        'logo' => '',
        'photos' => [],
    ],
    [
        'name' => 'Sport-Ice Юность',
        'status' => 'shop',
        'phone' => '+375173969593',
        'email' => 'tv3003@mail.ru',
        'country' => 'Belarus',
        'city' => 'Минск',
        'address' => 'ул. Первомайская 3 (адм. здание ХК «Юность»)',
        'working_hours' => 'Вт–Пт 10:00–19:00, Сб 10:00–18:00',
        'website' => 'http://sport-ice.by/contact/',
        'logo' => '',
        'photos' => [],
    ],
    [
        'name' => 'Sport Continent',
        'status' => 'shop',
        'phone' => '+375296116655',
        'email' => 'info@sportcontinent.by',
        'country' => 'Belarus',
        'city' => 'Минск',
        'address' => 'ул. Притыцкого 27, Ледовый дворец, 1 этаж',
        'working_hours' => 'Пн–Пт 11:00–21:00, Сб–Вс 11:00–18:00',
        'website' => 'https://sportcontinent.by/',
        'logo' => 'https://sportcontinent.by/local/templates/sportcontinent/img/logo.svg',
        'photos' => [],
    ],
    [
        'name' => 'IceCity',
        'status' => 'shop',
        'phone' => '+375296669422',
        'email' => 'icecity2822@gmail.com',
        'country' => 'Belarus',
        'city' => 'Минск',
        'address' => 'ул. Притыцкого 29, ТРЦ «Тивали», 3 этаж, пав. 327',
        'working_hours' => 'Пн–Пт 10:00–21:00, Сб–Вс 10:00–19:00',
        'website' => 'https://icecity.by/',
        'logo' => '',
        'photos' => [],
    ],
    [
        'name' => 'IceCity Заточка',
        'status' => 'skateSharpening',
        'phone' => '+375336669421',
        'email' => 'icecity2822@gmail.com',
        'country' => 'Belarus',
        'city' => 'Минск',
        'address' => 'ул. Притыцкого 29, ТРЦ «Тивали» — сервис/заточка',
        'working_hours' => 'Пн–Пт 10:00–21:00, Сб–Вс 10:00–19:00',
        'website' => 'https://icecity.by/contacts/',
        'logo' => '',
        'photos' => [],
    ],

    // ——— Moscow (5) ———
    [
        'name' => 'Forma Hockey Пресненский Вал',
        'status' => 'shop',
        'phone' => '+79215639010',
        'email' => '1905@forma.hockey',
        'country' => 'Russia',
        'city' => 'Москва',
        'address' => 'ул. Пресненский Вал 5',
        'working_hours' => 'ежедневно 10:00–21:00',
        'website' => 'https://forma.hockey/',
        'logo' => 'https://forma.hockey/local/templates/forma/img/logo.svg',
        'photos' => [],
    ],
    [
        'name' => 'Наша Игра Морозово',
        'status' => 'shop',
        'phone' => '+74994443159',
        'email' => 'info@nashaigra.ru',
        'country' => 'Russia',
        'city' => 'Москва',
        'address' => 'Новоостаповская ул. 5 стр. 2, Арена Морозово, 1 этаж',
        'working_hours' => 'ежедневно 10:00–21:00',
        'website' => 'https://www.nashaigra.ru/',
        'logo' => 'https://www.nashaigra.ru/bitrix/templates/oh_new/img/svg/new-nasha-rf.svg',
        'photos' => [],
    ],
    [
        'name' => 'Синяя линия (Hockey-mag)',
        'status' => 'shop',
        'phone' => '+79850688483',
        'email' => '',
        'country' => 'Russia',
        'city' => 'Мытищи',
        'address' => 'ул. Лётная 17, Арена Мытищи',
        'working_hours' => 'Пн–Пт 10:00–20:00, Сб–Вс 10:00–19:30',
        'website' => 'https://hockey-mag.ru/',
        'logo' => '',
        'photos' => [],
    ],
    [
        'name' => 'Хоккей-PRO ЦСКА',
        'status' => 'shop',
        'phone' => '+74956137325',
        'email' => '',
        'country' => 'Russia',
        'city' => 'Москва',
        'address' => 'Ленинградский пр-т 39 стр. 41, Ледовый дворец ЦСКА',
        'working_hours' => 'уточняйте по телефону',
        'website' => '',
        'logo' => '',
        'photos' => [],
    ],
    [
        'name' => 'ProHockey',
        'status' => 'shop',
        'phone' => '+79261928282',
        'email' => '',
        'country' => 'Russia',
        'city' => 'Москва',
        'address' => 'ул. Генерала Тюленева 31к1 / также ТЦ «Гараж 57», Поляны 57',
        'working_hours' => 'уточняйте по телефону',
        'website' => 'https://prohockey77.orgs.biz/',
        'logo' => '',
        'photos' => [],
    ],

    // ——— Saint Petersburg (5) ———
    [
        'name' => 'Хоккей без границ (5 Озёр)',
        'status' => 'shop',
        'phone' => '+78126020274',
        'email' => 'mail@hockeybezgranic.ru',
        'country' => 'Russia',
        'city' => 'Санкт-Петербург',
        'address' => 'ул. Долгоозёрная 14, ТРК «5 Озёр», 2 этаж, секция В30',
        'working_hours' => 'ежедневно 10:00–22:00',
        'website' => 'https://hockeybezgranic.ru/',
        'logo' => 'https://hockeybezgranic.ru/bitrix/templates/hockey2021/svg/logo2.svg',
        'photos' => ['https://hockeybezgranic.ru/upload/medialibrary/26d/5-OZER.jpg'],
    ],
    [
        'name' => 'Хоккей без границ (Космос)',
        'status' => 'shop',
        'phone' => '+78126110032',
        'email' => 'mail@hockeybezgranic.ru',
        'country' => 'Russia',
        'city' => 'Санкт-Петербург',
        'address' => 'ул. Типанова 27/39, ТРК «Космос», 2 этаж, секция 222',
        'working_hours' => 'ежедневно 10:00–22:00',
        'website' => 'https://hockeybezgranic.ru/kontakty/',
        'logo' => 'https://hockeybezgranic.ru/bitrix/templates/hockey2021/svg/logo2.svg',
        'photos' => ['https://hockeybezgranic.ru/upload/medialibrary/1ca/KOSMOS.jpg'],
    ],
    [
        'name' => 'Forma Hockey Юбилейный',
        'status' => 'shop',
        'phone' => '+78129419491',
        'email' => 'info@forma.hockey',
        'country' => 'Russia',
        'city' => 'Санкт-Петербург',
        'address' => 'пр. Добролюбова 18, СК «Юбилейный», малая арена',
        'working_hours' => 'ежедневно 11:00–21:00',
        'website' => 'https://forma.hockey/',
        'logo' => 'https://forma.hockey/local/templates/forma/img/logo.svg',
        'photos' => [],
    ],
    [
        'name' => 'Хоккейный пятачок (Зенит)',
        'status' => 'shop',
        'phone' => '+78125350811',
        'email' => '',
        'country' => 'Russia',
        'city' => 'Санкт-Петербург',
        'address' => 'ул. Бутлерова 9, ДСИ «Зенит», эт. 2',
        'working_hours' => 'уточняйте по телефону',
        'website' => '',
        'logo' => '',
        'photos' => [],
    ],
    [
        'name' => 'Hockey-shop (Магнитогорская)',
        'status' => 'shop',
        'phone' => '+78124297151',
        'email' => '',
        'country' => 'Russia',
        'city' => 'Санкт-Петербург',
        'address' => 'ул. Магнитогорская 11, БЦ «Магнит»',
        'working_hours' => 'уточняйте по телефону / spb.hockey-shop.ru',
        'website' => 'https://spb.hockey-shop.ru/',
        'logo' => '',
        'photos' => [],
    ],
];

echo "Using " . ($usingService ? 'SERVICE ROLE' : 'ANON') . " key\n";
echo 'Shops to seed: ' . count($shops) . "\n\n";

$now = gmdate('c');
$created = 0;
$skipped = 0;
$failed = 0;

foreach ($shops as $shop) {
    $phone = preg_replace('/\s+/', '', (string) $shop['phone']);
    $name = $shop['name'];
    echo "-> {$name} ({$phone})\n";

    if (hs_exists_by_phone($phone, $apiKey)) {
        echo "  skip: phone already exists\n";
        $skipped++;
        continue;
    }

    $row = [
        'name' => $name,
        'status' => $shop['status'],
        'phone' => $phone,
        'email' => $shop['email'] !== '' ? $shop['email'] : null,
        'country' => $shop['country'],
        'city' => $shop['city'],
        'address' => $shop['address'],
        'working_hours' => $shop['working_hours'],
        'website' => $shop['website'] !== '' ? $shop['website'] : null,
        'position' => $shop['status'] === 'skateSharpening' ? 'Заточка коньков' : 'Магазин',
        'team' => '',
        'age' => 0,
        'height' => '',
        'weight' => '',
        'is_hidden' => false,
        'created_at' => $now,
        'updated_at' => $now,
        'photos' => '[]',
    ];

    [$code, $data, $raw] = hs_rest('POST', '/rest/v1/players', $row, $apiKey);
    if ($code >= 400 || !is_array($data) || !isset($data[0]['id'])) {
        echo "  FAIL HTTP {$code}: " . substr($raw, 0, 240) . "\n";
        $failed++;
        continue;
    }

    $id = $data[0]['id'];
    echo "  created id={$id}\n";
    $created++;

    $avatar = hs_upload_avatar_from_url($id, (string) ($shop['logo'] ?? ''), $apiKey);
    $photoUrls = [];
    foreach (($shop['photos'] ?? []) as $pUrl) {
        // store remote URLs in photos JSON if upload not available
        if (is_string($pUrl) && $pUrl !== '') {
            $photoUrls[] = $pUrl;
        }
    }
    $patch = [];
    if ($avatar) {
        $patch['avatar'] = $avatar;
        echo "  avatar ok\n";
    }
    if ($photoUrls) {
        $patch['photos'] = json_encode($photoUrls, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        echo '  photos: ' . count($photoUrls) . "\n";
    }
    if ($patch) {
        hs_rest('PATCH', '/rest/v1/players?id=eq.' . rawurlencode($id), $patch, $apiKey);
    }
}

echo "\nDone. created={$created} skipped={$skipped} failed={$failed}\n";
if (!$usingService && $failed > 0) {
    echo "Hint: set HS_SUPABASE_SERVICE_ROLE_KEY in config.local.php and re-run.\n";
}
