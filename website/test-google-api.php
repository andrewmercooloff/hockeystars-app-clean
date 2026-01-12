<?php
/**
 * Test script to check Google API structure
 */

require_once '/home/seokurs1/hockey-stars.com/vendor/autoload.php';

header('Content-Type: text/plain; charset=utf-8');

echo "Testing Google API Client structure\n";
echo "====================================\n\n";

try {
    $client = new Google_Client();
    $client->setAuthConfig('/home/seokurs1/hockey-stars.com/google-service-account.json');
    $client->addScope('https://www.googleapis.com/auth/androidpublisher');
    
    $service = new Google_Service_AndroidPublisher($client);
    
    echo "Service class: " . get_class($service) . "\n\n";
    
    echo "Available methods in service:\n";
    $methods = get_class_methods($service);
    $testerMethods = array_filter($methods, function($m) {
        return stripos($m, 'tester') !== false;
    });
    echo implode("\n", $testerMethods) . "\n\n";
    
    echo "All methods (first 50):\n";
    foreach (array_slice($methods, 0, 50) as $method) {
        echo "  - $method\n";
    }
    
    echo "\n\nService properties:\n";
    $reflection = new ReflectionClass($service);
    $properties = $reflection->getProperties();
    foreach ($properties as $prop) {
        echo "  - " . $prop->getName() . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}




