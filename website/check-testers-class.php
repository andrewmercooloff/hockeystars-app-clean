<?php
/**
 * Check Testers class structure
 */

require_once '/home/seokurs1/hockey-stars.com/vendor/autoload.php';

header('Content-Type: text/plain; charset=utf-8');

echo "Checking Testers class structure\n";
echo "=================================\n\n";

try {
    $testers = new Google_Service_AndroidPublisher_Testers();
    
    echo "Class: " . get_class($testers) . "\n\n";
    
    echo "Available methods:\n";
    $methods = get_class_methods($testers);
    foreach ($methods as $method) {
        echo "  - $method\n";
    }
    
    echo "\n\nAvailable properties (via reflection):\n";
    $reflection = new ReflectionClass($testers);
    $properties = $reflection->getProperties();
    foreach ($properties as $prop) {
        $prop->setAccessible(true);
        echo "  - " . $prop->getName() . " (" . $prop->getType() . ")\n";
    }
    
    echo "\n\nTrying to create with test data:\n";
    $testData = ['test@example.com'];
    
    // Try different approaches
    echo "1. Try setTesters():\n";
    if (method_exists($testers, 'setTesters')) {
        echo "   ✅ Method exists\n";
        $testers->setTesters($testData);
    } else {
        echo "   ❌ Method does not exist\n";
    }
    
    echo "2. Try setEmailAddresses():\n";
    if (method_exists($testers, 'setEmailAddresses')) {
        echo "   ✅ Method exists\n";
        $testers->setEmailAddresses($testData);
    } else {
        echo "   ❌ Method does not exist\n";
    }
    
    echo "3. Try direct property:\n";
    $testers2 = new Google_Service_AndroidPublisher_Testers();
    $testers2->testers = $testData;
    echo "   Set directly: " . (isset($testers2->testers) ? "✅" : "❌") . "\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}




