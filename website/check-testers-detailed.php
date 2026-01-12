<?php
/**
 * Detailed check of testers structure - see what get() actually returns
 */

require_once '/home/seokurs1/hockey-stars.com/vendor/autoload.php';

header('Content-Type: text/plain; charset=utf-8');

echo "Detailed Testers structure check\n";
echo "================================\n\n";

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
    echo "Getting testers with get() method...\n";
    try {
        $testersResponse = $service->edits_testers->get($packageName, $editId, $track);
        
        echo "Response object type: " . get_class($testersResponse) . "\n\n";
        
        // Try to access different properties
        echo "Trying different property accesses:\n";
        echo "  - \$testersResponse->testers: ";
        var_dump(isset($testersResponse->testers) ? $testersResponse->testers : 'NOT SET');
        
        echo "\n  - \$testersResponse->googleGroups: ";
        var_dump(isset($testersResponse->googleGroups) ? $testersResponse->googleGroups : 'NOT SET');
        
        echo "\n  - getGoogleGroups(): ";
        try {
            var_dump($testersResponse->getGoogleGroups());
        } catch (Exception $e) {
            echo "ERROR: " . $e->getMessage();
        }
        
        // Try to serialize to see all data
        echo "\n\nFull object dump (var_dump):\n";
        var_dump($testersResponse);
        
        // Try to see raw response
        echo "\n\nTrying to get raw response data:\n";
        if (method_exists($testersResponse, 'toSimpleObject')) {
            echo "toSimpleObject(): ";
            var_dump($testersResponse->toSimpleObject());
        }
        
        // Check if there's a way to get raw data
        echo "\n\nChecking for modelData or internal properties:\n";
        $reflection = new ReflectionClass($testersResponse);
        foreach ($reflection->getProperties() as $prop) {
            $prop->setAccessible(true);
            $name = $prop->getName();
            $value = $prop->getValue($testersResponse);
            echo "  - $name: " . (is_object($value) || is_array($value) ? gettype($value) : var_export($value, true)) . "\n";
        }
        
    } catch (Google_Service_Exception $e) {
        echo "Google Service Exception:\n";
        echo "Code: " . $e->getCode() . "\n";
        echo "Message: " . $e->getMessage() . "\n";
        if ($e->getCode() === 404) {
            echo "\n404 means track is empty or doesn't exist yet - this is OK\n";
        }
    } catch (Exception $e) {
        echo "Error getting testers: " . $e->getMessage() . "\n";
        echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}



