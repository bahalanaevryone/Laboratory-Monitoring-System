<?php
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
session_start();
require_once '../config.php';

header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid method']);
    exit;
}

$email = trim($_POST['email'] ?? '');
$fname = trim($_POST['fname'] ?? '');
$lname = trim($_POST['lname'] ?? '');
$uid = trim($_POST['uid'] ?? '');

if (!$email || !$uid) {
    echo json_encode(['success' => false, 'message' => 'Google account information is incomplete']);
    exit;
}

if (!$fname) $fname = 'Google';
if (!$lname) $lname = 'User';

try {
    $stmt = $conn->prepare("SELECT users_id, email, role FROM users WHERE email = ? LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        $users_id = intval($user['users_id']);
        $role = $user['role'];
    } else {
        $role = 'student';
        $randomPassword = password_hash('google_' . $uid . '_' . bin2hex(random_bytes(8)), PASSWORD_DEFAULT);
        $insert = $conn->prepare("INSERT INTO users (email, password, role) VALUES (?, ?, ?)");
        $insert->bind_param("sss", $email, $randomPassword, $role);
        $insert->execute();
        $users_id = $conn->insert_id;
    }

    $table = $role === 'student' ? 'students' : ($role === 'instructor' ? 'instructors' : 'custodians');
    if ($role === 'student') {
        $nameStmt = $conn->prepare("SELECT first_name, last_name, course, year_level, section, profile_picture FROM students WHERE users_id = ? LIMIT 1");
    } else {
        $nameStmt = $conn->prepare("SELECT first_name, last_name, NULL AS course, NULL AS year_level, NULL AS section, profile_picture FROM $table WHERE users_id = ? LIMIT 1");
    }
    $nameStmt->bind_param("i", $users_id);
    $nameStmt->execute();
    $nameResult = $nameStmt->get_result();

    if ($nameResult->num_rows > 0) {
        $name = $nameResult->fetch_assoc();
    } else {
        $createRole = $conn->prepare("INSERT INTO $table (users_id, first_name, last_name) VALUES (?, ?, ?)");
        $createRole->bind_param("iss", $users_id, $fname, $lname);
        $createRole->execute();
        $name = ['first_name' => $fname, 'last_name' => $lname, 'course' => null, 'year_level' => null, 'section' => null, 'profile_picture' => null];
    }

    $_SESSION['users_id'] = $users_id;
    $_SESSION['email'] = $email;
    $_SESSION['role'] = $role;

    echo json_encode([
        'success' => true,
        'role' => $role,
        'first_name' => $name['first_name'],
        'last_name' => $name['last_name'],
        'users_id' => $users_id,
        'email' => $email,
        'course' => $name['course'] ?? null,
        'year_level' => $name['year_level'] ?? null,
        'section' => $name['section'] ?? null,
        'profile_picture' => $name['profile_picture'] ?? null,
        'auth_provider' => 'google'
    ]);
} catch (Throwable $error) {
    error_log('Google auth error: ' . $error->getMessage());
    echo json_encode(['success' => false, 'message' => 'Google login failed']);
}
