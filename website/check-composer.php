<?php
/**
 * Script to check if Composer is available on the server
 */

header('Content-Type: text/plain; charset=utf-8');

echo "=== Composer Availability Check ===\n\n";

// Check 1: Check if composer command exists
echo "1. Checking if 'composer' command is available:\n";
$composerCheck = shell_exec('which composer 2>&1');
if ($composerCheck && trim($composerCheck) !== '') {
    echo "   ✅ Composer found at: " . trim($composerCheck) . "\n";
    
    // Try to get version
    $version = shell_exec('composer --version 2>&1');
    if ($version) {
        echo "   Version: " . trim($version) . "\n";
    }
} else {
    echo "   ❌ Composer command not found in PATH\n";
}

echo "\n";

// Check 2: Check if composer.phar exists in common locations
echo "2. Checking for composer.phar in common locations:\n";
$commonPaths = [
    __DIR__ . '/composer.phar',
    __DIR__ . '/../composer.phar',
    '/usr/local/bin/composer',
    '/usr/bin/composer',
    getcwd() . '/composer.phar',
];

$found = false;
foreach ($commonPaths as $path) {
    if (file_exists($path)) {
        echo "   ✅ Found: $path\n";
        $found = true;
    }
}

if (!$found) {
    echo "   ❌ composer.phar not found in common locations\n";
}

echo "\n";

// Check 3: Check if PHP exec functions are enabled
echo "3. Checking PHP execution functions:\n";
if (function_exists('exec')) {
    echo "   ✅ exec() is enabled\n";
} else {
    echo "   ❌ exec() is disabled\n";
}

if (function_exists('shell_exec')) {
    echo "   ✅ shell_exec() is enabled\n";
} else {
    echo "   ❌ shell_exec() is disabled\n";
}

if (function_exists('system')) {
    echo "   ✅ system() is enabled\n";
} else {
    echo "   ❌ system() is disabled\n";
}

echo "\n";

// Check 4: Try to run composer if available
echo "4. Attempting to run composer (if available):\n";
$output = shell_exec('composer --version 2>&1');
if ($output && strpos($output, 'Composer') !== false) {
    echo "   ✅ Composer is working:\n";
    echo "   " . trim($output) . "\n";
} else {
    echo "   ❌ Cannot execute composer command\n";
    if ($output) {
        echo "   Error output: " . trim($output) . "\n";
    }
}

echo "\n";
echo "=== Check Complete ===\n";
echo "\n";
echo "If Composer is available, you can install Google API Client Library:\n";
echo "  composer require google/apiclient\n";
echo "\n";
echo "If Composer is NOT available, we'll need to use an alternative approach.\n";




