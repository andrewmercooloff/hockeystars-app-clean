<?php
/**
 * Script to find where vendor/autoload.php is located
 */

header('Content-Type: text/html; charset=utf-8');

echo "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Find Autoload</title>";
echo "<style>body{font-family:Arial,sans-serif;padding:20px;} .found{color:green;font-weight:bold;} .notfound{color:red;}</style></head><body>";
echo "<h1>Searching for vendor/autoload.php</h1>";

$pathsToCheck = [
    '/home/seokurs1/hockey-stars.com/vendor/autoload.php',
    __DIR__ . '/../vendor/autoload.php',
    dirname(__DIR__) . '/vendor/autoload.php',
    '/home/seokurs1/public_html/hockey-stars.com/vendor/autoload.php',
    '/home/seokurs1/public_html/vendor/autoload.php',
];

echo "<h2>Checking paths:</h2><ul>";

$found = false;
foreach ($pathsToCheck as $path) {
    $exists = file_exists($path);
    $status = $exists ? '<span class="found">✅ FOUND</span>' : '<span class="notfound">❌ Not found</span>';
    echo "<li>$status: <code>$path</code></li>";
    if ($exists) {
        $found = true;
        echo "<li style='margin-left:20px;'><strong>File size:</strong> " . filesize($path) . " bytes</li>";
        echo "<li style='margin-left:20px;'><strong>Last modified:</strong> " . date('Y-m-d H:i:s', filemtime($path)) . "</li>";
    }
}

echo "</ul>";

if (!$found) {
    echo "<h2>Not found. Let's check the directory structure:</h2>";
    
    $dirsToCheck = [
        '/home/seokurs1/hockey-stars.com/',
        __DIR__ . '/../',
        dirname(__DIR__) . '/',
    ];
    
    foreach ($dirsToCheck as $baseDir) {
        if (is_dir($baseDir)) {
            echo "<h3>Contents of: $baseDir</h3>";
            $items = @scandir($baseDir);
            if ($items) {
                echo "<ul>";
                foreach ($items as $item) {
                    if ($item !== '.' && $item !== '..') {
                        $fullPath = $baseDir . $item;
                        $type = is_dir($fullPath) ? '[DIR]' : '[FILE]';
                        echo "<li>$type $item</li>";
                        
                        // If vendor directory exists, check it
                        if ($item === 'vendor' && is_dir($fullPath)) {
                            $vendorFiles = @scandir($fullPath);
                            if ($vendorFiles) {
                                echo "<li style='margin-left:20px;'>vendor/ contents: " . implode(', ', array_filter($vendorFiles, function($f) { return $f !== '.' && $f !== '..'; })) . "</li>";
                            }
                        }
                    }
                }
                echo "</ul>";
            }
        } else {
            echo "<p class='notfound'>Directory does not exist: $baseDir</p>";
        }
    }
    
    echo "<h2>Current script info:</h2>";
    echo "<ul>";
    echo "<li><strong>__DIR__:</strong> " . __DIR__ . "</li>";
    echo "<li><strong>dirname(__DIR__):</strong> " . dirname(__DIR__) . "</li>";
    echo "<li><strong>getcwd():</strong> " . getcwd() . "</li>";
    echo "<li><strong>__FILE__:</strong> " . __FILE__ . "</li>";
    echo "</ul>";
} else {
    echo "<h2 class='found'>✅ Autoload file found! The script should work now.</h2>";
}

echo "</body></html>";




