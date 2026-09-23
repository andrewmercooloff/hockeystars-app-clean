<?php
/**
 * Скопируйте в config.local.php на VPS (album.hockey-stars.com). Не коммитить.
 *
 * Создайте ящик в Timeweb: Почта → hockey-stars.com → support
 * SMTP: smtp.timeweb.ru, порт 587, TLS, логин = полный email, пароль = пароль ящика.
 */
define('HS_SMTP_USER', 'support@hockey-stars.com');
define('HS_SMTP_PASS', 'ВАШ_ПАРОЛЬ_ЯЩИКА');
define('HS_LEADS_TO', 'support@hockey-stars.com');
