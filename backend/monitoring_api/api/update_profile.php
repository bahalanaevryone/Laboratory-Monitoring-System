<?php
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
session_start();
require_once '../config.php';

header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_SESSION['users_id'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid request']);
    exit;
}

$users_id = intval($_SESSION['users_id']);
$role = $_SESSION['role'] ?? '';
$table = $role === 'student' ? 'students' : ($role === 'instructor' ? 'instructors' : ($role === 'custodian' ? 'custodians' : ''));

if (!$table) {
    echo json_encode(['success' => false, 'message' => 'Invalid role']);
    exit;
}

$first_name = trim($_POST['first_name'] ?? '');
$last_name = trim($_POST['last_name'] ?? '');
$course = trim($_POST['course'] ?? '');
$year_level = $_POST['year_level'] === '' ? null : intval($_POST['year_level'] ?? 0);
$section = strtoupper(trim($_POST['section'] ?? ''));
$password = $_POST['password'] ?? '';

if (!$first_name || !$last_name) {
    echo json_encode(['success' => false, 'message' => 'First name and last name are required']);
    exit;
}

$profile_picture = $_POST['profile_picture'] ?? null;
if (isset($_FILES['profile_picture']) && $_FILES['profile_picture']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = dirname(__DIR__, 3) . '/public/uploads/profiles';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
    $ext = strtolower(pathinfo($_FILES['profile_picture']['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
        echo json_encode(['success' => false, 'message' => 'Invalid profile image type']);
        exit;
    }
    $filename = 'profile_' . $users_id . '_' . time() . '.' . $ext;
    $target = $uploadDir . '/' . $filename;
    if (!move_uploaded_file($_FILES['profile_picture']['tmp_name'], $target)) {
        echo json_encode(['success' => false, 'message' => 'Failed to upload profile picture']);
        exit;
    }
    $profile_picture = '/uploads/profiles/' . $filename;
}

if ($role === 'student') {
    $stmt = $conn->prepare("UPDATE students SET first_name = ?, last_name = ?, course = ?, year_level = ?, section = ?, profile_picture = COALESCE(?, profile_picture) WHERE users_id = ?");
    $stmt->bind_param("sssissi", $first_name, $last_name, $course, $year_level, $section, $profile_picture, $users_id);
} else {
    $stmt = $conn->prepare("UPDATE $table SET first_name = ?, last_name = ?, profile_picture = COALESCE(?, profile_picture) WHERE users_id = ?");
    $stmt->bind_param("sssi", $first_name, $last_name, $profile_picture, $users_id);
}
$stmt->execute();

if ($password !== '') {
    $hashed = password_hash($password, PASSWORD_DEFAULT);
    $passStmt = $conn->prepare("UPDATE users SET password = ? WHERE users_id = ?");
    $passStmt->bind_param("si", $hashed, $users_id);
    $passStmt->execute();
}

if ($role === 'student') {
    $freshStmt = $conn->prepare("SELECT first_name, last_name, course, year_level, section, profile_picture FROM students WHERE users_id = ?");
} else {
    $freshStmt = $conn->prepare("SELECT first_name, last_name, NULL AS course, NULL AS year_level, NULL AS section, profile_picture FROM $table WHERE users_id = ?");
}
$freshStmt->bind_param("i", $users_id);
$freshStmt->execute();
$fresh = $freshStmt->get_result()->fetch_assoc();

echo json_encode([
    'success' => true,
    'message' => 'Profile updated successfully',
    'user' => [
        'users_id' => $users_id,
        'role' => $role,
        'first_name' => $fresh['first_name'] ?? $first_name,
        'last_name' => $fresh['last_name'] ?? $last_name,
        'course' => $fresh['course'] ?? $course,
        'year_level' => $fresh['year_level'] ?? $year_level,
        'section' => $fresh['section'] ?? $section,
        'profile_picture' => $fresh['profile_picture'] ?? $profile_picture,
    ],
]);
