<?php
/**
 * Check Testers structure by inspecting what get() returns
 */

require_once '/home/seokurs1/hockey-stars.com/vendor/autoload.php';

header('Content-Type: text/plain; charset=utf-8');

echo "Checking Testers structure from API response\n";
echo "===========================================\n\n";

try {
    // Setup Google Client
    $client = new Google_Client();
    $client->setAuthConfig('/home/seokurs1/hockey-stars.com/google-service-account.json');
    $client->addScope('https://www.googleapis.com/auth/androidpublisher');
    $service = new Google_Service_AndroidPublisher($client);
    
    $packageName = 'by.hockeystars.app';
    $track = 'closed';
    
    // Create an edit first
    echo "Creating edit...\n";
    $appEdit = new Google_Service_AndroidPublisher_AppEdit();
    $editResponse = $service->edits->insert($packageName, $appEdit);
    $editId = $editResponse->getId();
    echo "Edit ID: $editId\n\n";
    
    // Get testers
    echo "Getting testers...\n";
    try {
        $testersResponse = $service->edits_testers->get($packageName, $editId, $track);
        
        echo "Response class: " . get_class($testersResponse) . "\n\n";
        
        echo "Available methods:\n";
        $methods = get_class_methods($testersResponse);
        foreach ($methods as $method) {
            echo "  - $method\n";
        }
        
        echo "\n\nDirect inspection (var_export):\n";
        echo var_export($testersResponse, true) . "\n";
        
        echo "\n\nJSON representation:\n";
        echo json_encode($testersResponse, JSON_PRETTY_PRINT) . "\n";
        
        echo "\n\nProperty access test:\n";
        if (isset($testersResponse->testers)) {
            echo "  - testers property exists\n";
            echo "  - Type: " . gettype($testersResponse->testers) . "\n";
            if (is_array($testersResponse->testers)) {
                echo "  - Array count: " . count($testersResponse->testers) . "\n";
                if (count($testersResponse->testers) > 0) {
                    echo "  - First element type: " . gettype($testersResponse->testers[0]) . "\n";
                    echo "  - First element: " . var_export($testersResponse->testers[0], true) . "\n";
                }
            }
        } else {
            echo "  - testers property does NOT exist\n";
        }
        
        // Now create a new Testers object and see what we can do
        echo "\n\nCreating new Testers object:\n";
        $newTesters = new Google_Service_AndroidPublisher_Testers();
        echo "Class: " . get_class($newTesters) . "\n\n";
        
        echo "Available methods:\n";
        $newMethods = get_class_methods($newTesters);
        foreach ($newMethods as $method) {
            echo "  - $method\n";
        }
        
        echo "\n\nTrying to set testers property directly:\n";
        $testData = ['test@example.com'];
        $newTesters->testers = $testData;
        echo "Set testers property: " . (isset($newTesters->testers) ? "✅" : "❌") . "\n";
        if (isset($newTesters->testers)) {
            echo "Value: " . json_encode($newTesters->testers) . "\n";
        }
        
        echo "\n\nJSON representation of new object:\n";
        echo json_encode($newTesters, JSON_PRETTY_PRINT) . "\n";
        
    } catch (Exception $e) {
        echo "Error getting testers: " . $e->getMessage() . "\n";
        echo "Code: " . $e->getCode() . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}



