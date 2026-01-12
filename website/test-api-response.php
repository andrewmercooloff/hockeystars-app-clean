<?php
/**
 * Test what the API actually returns when there are testers already added
 */

require_once '/home/seokurs1/hockey-stars.com/vendor/autoload.php';

header('Content-Type: text/plain; charset=utf-8');

echo "Testing API Response with Existing Testers\n";
echo "==========================================\n\n";

try {
    $client = new Google_Client();
    $client->setAuthConfig('/home/seokurs1/hockey-stars.com/google-service-account.json');
    $client->addScope('https://www.googleapis.com/auth/androidpublisher');
    $service = new Google_Service_AndroidPublisher($client);
    
    $packageName = 'by.hockeystars.app';
    $track = 'closed';
    
    // Create an edit
    $appEdit = new Google_Service_AndroidPublisher_AppEdit();
    $editResponse = $service->edits->insert($packageName, $appEdit);
    $editId = $editResponse->getId();
    echo "Edit ID: $editId\n\n";
    
    // Get testers
    try {
        $testersResponse = $service->edits_testers->get($packageName, $editId, $track);
        
        echo "Full response object:\n";
        echo json_encode($testersResponse, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";
        
        echo "Raw var_export:\n";
        var_export($testersResponse);
        echo "\n\n";
        
        // Try to access all possible properties
        $reflection = new ReflectionClass($testersResponse);
        echo "All properties via reflection:\n";
        foreach ($reflection->getProperties() as $prop) {
            $prop->setAccessible(true);
            $name = $prop->getName();
            $value = $prop->getValue($testersResponse);
            echo "  $name: ";
            if (is_array($value)) {
                echo "array(" . count($value) . " items)\n";
                if (count($value) > 0 && count($value) < 10) {
                    echo "    " . json_encode($value, JSON_PRETTY_PRINT) . "\n";
                }
            } elseif (is_object($value)) {
                echo "object(" . get_class($value) . ")\n";
            } else {
                echo var_export($value, true) . "\n";
            }
        }
        
    } catch (Google_Service_Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
        echo "Code: " . $e->getCode() . "\n";
        echo "Response body: " . $e->getMessage() . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}



