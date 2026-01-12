<?php
/**
 * Script to check current testers list in Google Play Console
 * For debugging purposes
 */

// Load Composer autoloader
// Try multiple possible paths for vendor/autoload.php
$possibleAutoloadPaths = [
    '/home/seokurs1/hockey-stars.com/vendor/autoload.php', // Absolute path from root
    __DIR__ . '/../vendor/autoload.php', // Relative from website/ folder
    dirname(__DIR__) . '/vendor/autoload.php', // Alternative relative path
];

$autoloadPath = null;
foreach ($possibleAutoloadPaths as $path) {
    if (file_exists($path)) {
        $autoloadPath = $path;
        break;
    }
}

if (!$autoloadPath) {
    die("Google API library not found. Checked paths: " . implode(', ', $possibleAutoloadPaths) . "\n");
}

require_once $autoloadPath;

header('Content-Type: text/html; charset=utf-8');

// Path to service account JSON file
$serviceAccountPath = '/home/seokurs1/hockey-stars.com/google-service-account.json';

if (!file_exists($serviceAccountPath)) {
    $alternativePaths = [
        __DIR__ . '/../google-service-account.json',
        dirname(__DIR__) . '/google-service-account.json',
    ];
    
    foreach ($alternativePaths as $path) {
        if (file_exists($path)) {
            $serviceAccountPath = $path;
            break;
        }
    }
}

if (!file_exists($serviceAccountPath)) {
    die("Service account file not found\n");
}

// Configuration
$packageName = 'by.hockeystars.app';
$track = 'closed'; // closed testing (закрытое тестирование)

echo "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Testers List</title>";
echo "<style>body{font-family:Arial,sans-serif;padding:20px;} .tester{background:#f5f5f5;padding:10px;margin:5px 0;border-radius:5px;}</style></head><body>";
echo "<h1>Current Testers List (Internal Track)</h1>";
echo "<p><strong>Package:</strong> $packageName</p>";
echo "<p><strong>Track:</strong> $track</p><hr>";

try {
    // Create Google Client
    $client = new Google_Client();
    $client->setAuthConfig($serviceAccountPath);
    $client->addScope('https://www.googleapis.com/auth/androidpublisher');
    
    // Create Android Publisher service
    $service = new Google_Service_AndroidPublisher($client);
    
    // Get current testers list
    $testersResponse = $service->testers->listTesters($packageName, $track);
    
    if ($testersResponse && isset($testersResponse->testers)) {
        $testers = $testersResponse->testers;
        echo "<h2>Found " . count($testers) . " tester(s):</h2>";
        
        foreach ($testers as $tester) {
            $email = '';
            if (is_string($tester)) {
                $email = $tester;
            } elseif (isset($tester->emailAddress)) {
                $email = $tester->emailAddress;
            } elseif (isset($tester->email)) {
                $email = $tester->email;
            }
            
            echo "<div class='tester'>📧 $email</div>";
        }
    } else {
        echo "<p>No testers found in the list.</p>";
    }
    
    // Also check log file
    $logFile = __DIR__ . '/tester-emails.log';
    if (file_exists($logFile)) {
        echo "<hr><h2>Recent submissions (from log file):</h2>";
        $logContent = file_get_contents($logFile);
        $lines = array_reverse(array_slice(explode("\n", $logContent), -10)); // Last 10 lines
        echo "<pre style='background:#f5f5f5;padding:10px;border-radius:5px;'>";
        foreach ($lines as $line) {
            if (trim($line)) {
                echo htmlspecialchars($line) . "\n";
            }
        }
        echo "</pre>";
    }
    
} catch (Google_Service_Exception $e) {
    echo "<p style='color:red;'><strong>Error:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<p><strong>Code:</strong> " . $e->getCode() . "</p>";
    if ($e->getErrors()) {
        echo "<pre>" . print_r($e->getErrors(), true) . "</pre>";
    }
} catch (Exception $e) {
    echo "<p style='color:red;'><strong>Error:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
}

echo "</body></html>";

