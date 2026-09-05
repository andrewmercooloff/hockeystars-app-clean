<?php
/**
 * Конфиг сайта hockey-stars.com
 * Секреты — в config.local.php (не коммитить) или env на хостинге.
 */

$configLocal = __DIR__ . '/config.local.php';
if (is_readable($configLocal) && !defined('HS_CONFIG_LOCAL_LOADED')) {
    define('HS_CONFIG_LOCAL_LOADED', true);
    require $configLocal;
}

if (!defined('HS_SUPABASE_URL')) {
    define('HS_SUPABASE_URL', getenv('SUPABASE_URL') ?: 'https://api.hockey-stars.com');
}

if (!defined('HS_SUPABASE_ANON_KEY')) {
    define(
        'HS_SUPABASE_ANON_KEY',
        getenv('SUPABASE_ANON_KEY') ?: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM'
    );
}

if (!defined('HS_SITE_URL')) {
    define('HS_SITE_URL', 'https://hockey-stars.com');
}

if (!defined('HS_WEB_APP_URL')) {
    define('HS_WEB_APP_URL', getenv('WEB_APP_URL') ?: 'https://hockey-stars.com');
}

if (!defined('HS_APP_STORE_ID')) {
    define('HS_APP_STORE_ID', '6753738837');
}

if (!defined('HS_GOOGLE_PLAY_PACKAGE')) {
    define('HS_GOOGLE_PLAY_PACKAGE', 'by.hockeystars.app');
}
