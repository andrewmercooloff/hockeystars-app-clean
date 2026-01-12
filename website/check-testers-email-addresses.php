<?php
/**
 * Check if Testers class supports emailAddresses property
 */

require_once '/home/seokurs1/hockey-stars.com/vendor/autoload.php';

header('Content-Type: text/plain; charset=utf-8');

echo "Checking Testers class for emailAddresses support\n";
echo "=================================================\n\n";

try {
    $testers = new Google_Service_AndroidPublisher_Testers();
    
    echo "Class: " . get_class($testers) . "\n\n";
    
    echo "Available methods:\n";
    $methods = get_class_methods($testers);
    foreach ($methods as $method) {
        if (stripos($method, 'email') !== false || stripos($method, 'address') !== false) {
            echo "  - $method (EMAIL/ADDRESS RELATED)\n";
        } else {
            echo "  - $method\n";
        }
    }
    
    echo "\n\nTrying to set emailAddresses property:\n";
    
    // Try direct property assignment
    $testData = ['test@example.com'];
    $testers->emailAddresses = $testData;
    echo "1. Direct assignment (emailAddresses): " . (isset($testers->emailAddresses) ? "✅" : "❌") . "\n";
    
    // Try JSON encoding to see structure
    echo "\n2. JSON representation after setting emailAddresses:\n";
    echo json_encode($testers, JSON_PRETTY_PRINT) . "\n";
    
    // Check for setters/getters
    echo "\n3. Checking for setter methods:\n";
    if (method_exists($testers, 'setEmailAddresses')) {
        echo "   ✅ setEmailAddresses() exists\n";
        $testers2 = new Google_Service_AndroidPublisher_Testers();
        $testers2->setEmailAddresses($testData);
        echo "   JSON: " . json_encode($testers2, JSON_PRETTY_PRINT) . "\n";
    } else {
        echo "   ❌ setEmailAddresses() does not exist\n";
    }
    
    if (method_exists($testers, 'getEmailAddresses')) {
        echo "   ✅ getEmailAddresses() exists\n";
    } else {
        echo "   ❌ getEmailAddresses() does not exist\n";
    }
    
    // Try reflection to see all properties
    echo "\n4. All properties (via reflection):\n";
    $reflection = new ReflectionClass($testers);
    foreach ($reflection->getProperties() as $prop) {
        $prop->setAccessible(true);
        $name = $prop->getName();
        echo "   - $name\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}



