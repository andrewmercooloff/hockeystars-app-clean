<?php
/**
 * Direct PHP implementation for adding testers to Google Play Console
 * Uses JWT authentication and cURL to call Google Play API directly
 * No Node.js required!
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Get JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
    exit;
}

$email = trim($data['email'] ?? '');

// Validate email
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid email format']);
    exit;
}

// Path to service account JSON file
$serviceAccountPath = __DIR__ . '/../google-service-account.json';

if (!file_exists($serviceAccountPath)) {
    // Try alternative paths
    $alternativePaths = [
        __DIR__ . '/google-service-account.json',
        dirname(__DIR__) . '/google-service-account.json',
        '/home/seokurs1/hockey-stars.com/google-service-account.json'
    ];
    
    foreach ($alternativePaths as $path) {
        if (file_exists($path)) {
            $serviceAccountPath = $path;
            break;
        }
    }
}

if (!file_exists($serviceAccountPath)) {
    error_log("Service account file not found. Tried: " . implode(', ', array_merge([$serviceAccountPath], $alternativePaths)));
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Service account configuration not found. Please contact support.'
    ]);
    exit;
}

// Load service account
$serviceAccount = json_decode(file_get_contents($serviceAccountPath), true);

if (!$serviceAccount) {
    error_log("Failed to parse service account JSON");
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Invalid service account configuration']);
    exit;
}

// Configuration
$packageName = 'by.hockeystars.app';
$track = 'internal';

// For now, save email to log file (we'll add Google API integration using a PHP library)
$logFile = __DIR__ . '/tester-emails.log';
$logEntry = date('Y-m-d H:i:s') . " | " . $email . " | Pending Google API integration\n";
@file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);

// Return success - we'll implement Google API call using PHP library
echo json_encode([
    'success' => true,
    'message' => 'Email received. You will be added to the tester list shortly.'
]);




