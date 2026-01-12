<?php
/**
 * Test direct API approach (like Node.js version)
 */

require_once '/home/seokurs1/hockey-stars.com/vendor/autoload.php';

header('Content-Type: text/plain; charset=utf-8');

echo "Testing Direct API Approach\n";
echo "===========================\n\n";

try {
    $client = new Google_Client();
    $client->setAuthConfig('/home/seokurs1/hockey-stars.com/google-service-account.json');
    $client->addScope('https://www.googleapis.com/auth/androidpublisher');
    
    $service = new Google_Service_AndroidPublisher($client);
    
    echo "Checking all available resources:\n";
    $reflection = new ReflectionClass($service);
    $properties = $reflection->getProperties();
    
    foreach ($properties as $prop) {
        $prop->setAccessible(true);
        $name = $prop->getName();
        if (stripos($name, 'test') !== false) {
            $value = $prop->getValue($service);
            echo "  - $name: " . gettype($value);
            if (is_object($value)) {
                echo " (" . get_class($value) . ")";
            }
            echo "\n";
        }
    }
    
    echo "\n\nTrying to find testers API without edits:\n";
    // Check if there's a direct testers resource
    if (isset($service->testers)) {
        echo "✅ Found direct testers resource\n";
    } else {
        echo "❌ No direct testers resource\n";
    }
    
    echo "\n\nChecking if we can access testers through tracks:\n";
    if (isset($service->edits_tracks)) {
        echo "✅ edits_tracks exists\n";
        $methods = get_class_methods($service->edits_tracks);
        echo "Methods: " . implode(', ', $methods) . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}




