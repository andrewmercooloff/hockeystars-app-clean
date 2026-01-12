<?php
/**
 * Simple Composer check - just displays yes/no
 */
header('Content-Type: application/json');

$composerAvailable = false;
$composerPath = '';
$composerVersion = '';

// Check if composer command works
$output = @shell_exec('composer --version 2>&1');
if ($output && strpos($output, 'Composer') !== false) {
    $composerAvailable = true;
    $composerVersion = trim($output);
    $composerPath = trim(@shell_exec('which composer 2>&1'));
}

echo json_encode([
    'composer_available' => $composerAvailable,
    'composer_path' => $composerPath,
    'composer_version' => $composerVersion,
    'php_version' => phpversion(),
    'exec_enabled' => function_exists('exec'),
    'shell_exec_enabled' => function_exists('shell_exec')
], JSON_PRETTY_PRINT);




