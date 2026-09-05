<?php
/**
 * Fast JSON bootstrap for SPA player profile deep links.
 * GET /player-bootstrap.php?id=slug-or-uuid
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/player-public.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=30, stale-while-revalidate=60');
header('Access-Control-Allow-Origin: *');

$raw = '';
if (isset($_GET['id'])) {
    $raw = (string) $_GET['id'];
} elseif (isset($_GET['slug'])) {
    $raw = (string) $_GET['slug'];
}

$raw = trim(rawurldecode($raw));
if ($raw === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'missing_id']);
    exit;
}

$playerId = hs_sanitize_player_id($raw);
if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $playerId)) {
    $resolved = hs_resolve_player_id_from_slug($raw);
    if ($resolved !== '') {
        $playerId = $resolved;
    }
}

if ($playerId === '' || !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $playerId)) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => 'not_found']);
    exit;
}

$payload = hs_fetch_player_bootstrap($playerId);
if ($payload === null) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => 'not_found']);
    exit;
}

echo json_encode([
    'ok' => true,
    'slug' => $raw,
    'playerId' => $playerId,
    'player' => $payload['player'],
    'teams' => $payload['teams'],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
