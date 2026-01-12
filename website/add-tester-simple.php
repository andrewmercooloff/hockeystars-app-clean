<?php
/**
 * Simplified version - try using REST API directly with cURL
 * This might work if PHP library has issues
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

// For now, just save to log file
// We'll implement direct REST API calls later if needed
$logFile = __DIR__ . '/tester-emails.log';
$logEntry = date('Y-m-d H:i:s') . " | " . $email . " | Pending (API access needs to be configured)\n";
@file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);

// Return success for now
// Emails will be saved to log and can be added manually
echo json_encode([
    'success' => true,
    'message' => 'Email received. Please add ' . $email . ' manually to Google Play Console → Testing → Closed testing → Testers list.'
]);




