<?php
/**
 * Script to check available methods in EditsTesters
 */

require_once '/home/seokurs1/hockey-stars.com/vendor/autoload.php';

header('Content-Type: text/plain; charset=utf-8');

echo "Checking EditsTesters methods\n";
echo "=============================\n\n";

try {
    $client = new Google_Client();
    $client->setAuthConfig('/home/seokurs1/hockey-stars.com/google-service-account.json');
    $client->addScope('https://www.googleapis.com/auth/androidpublisher');
    
    $service = new Google_Service_AndroidPublisher($client);
    
    if (isset($service->edits_testers)) {
        echo "✅ edits_testers property exists\n";
        echo "Class: " . get_class($service->edits_testers) . "\n\n";
        
        echo "Available methods:\n";
        $methods = get_class_methods($service->edits_testers);
        foreach ($methods as $method) {
            echo "  - $method\n";
        }
        
        echo "\n\nChecking edits methods:\n";
        if (isset($service->edits)) {
            $editMethods = get_class_methods($service->edits);
            echo "Edits methods:\n";
            foreach ($editMethods as $method) {
                echo "  - $method\n";
            }
        }
    } else {
        echo "❌ edits_testers property does not exist\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}




