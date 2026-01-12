<?php
/**
 * Script to check available methods in Google API
 */

require_once '/home/seokurs1/hockey-stars.com/vendor/autoload.php';

header('Content-Type: text/plain; charset=utf-8');

echo "Checking Google API Client structure\n";
echo "=====================================\n\n";

try {
    $client = new Google_Client();
    $client->setAuthConfig('/home/seokurs1/hockey-stars.com/google-service-account.json');
    $client->addScope('https://www.googleapis.com/auth/androidpublisher');
    
    $service = new Google_Service_AndroidPublisher($client);
    
    echo "Service class: " . get_class($service) . "\n\n";
    
    echo "Checking for testers property:\n";
    if (isset($service->testers)) {
        echo "  ✅ testers property exists\n";
        echo "  Type: " . gettype($service->testers) . "\n";
        if (is_object($service->testers)) {
            echo "  Class: " . get_class($service->testers) . "\n\n";
            
            echo "Methods in testers:\n";
            $methods = get_class_methods($service->testers);
            foreach ($methods as $method) {
                echo "  - $method\n";
            }
        }
    } else {
        echo "  ❌ testers property does not exist\n\n";
    }
    
    echo "\n\nAll properties in service:\n";
    $reflection = new ReflectionClass($service);
    $properties = $reflection->getProperties();
    foreach ($properties as $prop) {
        $prop->setAccessible(true);
        $value = $prop->getValue($service);
        echo "  - " . $prop->getName() . " (" . gettype($value) . ")";
        if (is_object($value)) {
            echo " - " . get_class($value);
        }
        echo "\n";
    }
    
    echo "\n\nAll methods in service (filtered for tester/test):\n";
    $allMethods = get_class_methods($service);
    $testerMethods = array_filter($allMethods, function($m) {
        return stripos($m, 'tester') !== false || stripos($m, 'test') !== false;
    });
    foreach ($testerMethods as $method) {
        echo "  - $method\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}




