<?php
/**
 * Check what the API actually returns when getting testers
 */

require_once '/home/seokurs1/hockey-stars.com/vendor/autoload.php';

header('Content-Type: text/plain; charset=utf-8');

echo "Checking API Response Structure\n";
echo "===============================\n\n";

try {
    $client = new Google_Client();
    $client->setAuthConfig('/home/seokurs1/hockey-stars.com/google-service-account.json');
    $client->addScope('https://www.googleapis.com/auth/androidpublisher');
    $service = new Google_Service_AndroidPublisher($client);
    
    $packageName = 'by.hockeystars.app';
    $track = 'closed';
    
    // Create edit
    $appEdit = new Google_Service_AndroidPublisher_AppEdit();
    $editResponse = $service->edits->insert($packageName, $appEdit);
    $editId = $editResponse->getId();
    echo "Edit ID: $editId\n\n";
    
    // Get testers
    try {
        $testersResponse = $service->edits_testers->get($packageName, $editId, $track);
        
        echo "Full response JSON:\n";
        echo json_encode($testersResponse, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";
        
        echo "Response object type: " . get_class($testersResponse) . "\n\n";
        
        echo "All available methods:\n";
        $methods = get_class_methods($testersResponse);
        foreach ($methods as $method) {
            if (strpos($method, 'get') === 0 || strpos($method, 'set') === 0) {
                echo "  - $method\n";
            }
        }
        
        echo "\n\nDirect property access:\n";
        echo "  - googleGroups: " . (isset($testersResponse->googleGroups) ? json_encode($testersResponse->googleGroups) : 'NOT SET') . "\n";
        echo "  - googlePlusCommunities: " . (isset($testersResponse->googlePlusCommunities) ? json_encode($testersResponse->googlePlusCommunities) : 'NOT SET') . "\n";
        echo "  - testers: " . (isset($testersResponse->testers) ? json_encode($testersResponse->testers) : 'NOT SET') . "\n";
        echo "  - emailAddresses: " . (isset($testersResponse->emailAddresses) ? json_encode($testersResponse->emailAddresses) : 'NOT SET') . "\n";
        
        // Try reflection to see all properties
        echo "\n\nAll properties (via reflection):\n";
        $reflection = new ReflectionClass($testersResponse);
        foreach ($reflection->getProperties() as $prop) {
            $prop->setAccessible(true);
            $name = $prop->getName();
            $value = $prop->getValue($testersResponse);
            echo "  - $name: ";
            if (is_array($value)) {
                echo "array(" . count($value) . " items)";
                if (count($value) > 0 && count($value) < 10) {
                    echo " = " . json_encode($value);
                }
            } elseif (is_object($value)) {
                echo "object(" . get_class($value) . ")";
            } else {
                echo var_export($value, true);
            }
            echo "\n";
        }
        
    } catch (Google_Service_Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
        echo "Code: " . $e->getCode() . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}



