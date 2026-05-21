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

$email = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';

$stmt = $conn->prepare("SELECT users_id, email, password, role FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
    exit;
}

$user = $result->fetch_assoc();
if (!password_verify($password, $user['password'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
    exit;
}

$_SESSION['users_id'] = $user['users_id'];
$_SESSION['email'] = $user['email'];
$_SESSION['role'] = $user['role'];

$role = $user['role'];
$table = $role === 'student' ? 'students' : ($role === 'instructor' ? 'instructors' : 'custodians');
if ($role === 'student') {
    $stmt2 = $conn->prepare("SELECT first_name, last_name, course, year_level, section, profile_picture FROM students WHERE users_id = ?");
} else {
    $stmt2 = $conn->prepare("SELECT first_name, last_name, NULL AS course, NULL AS year_level, NULL AS section, profile_picture FROM $table WHERE users_id = ?");
}
$stmt2->bind_param("i", $user['users_id']);
$stmt2->execute();
$name = $stmt2->get_result()->fetch_assoc();

echo json_encode([
    'success' => true,
    'role' => $role,
    'first_name' => $name['first_name'],
    'last_name' => $name['last_name'],
    'users_id' => $user['users_id'],
    'email' => $user['email'],
    'course' => $name['course'] ?? null,
    'year_level' => $name['year_level'] ?? null,
    'section' => $name['section'] ?? null,
    'profile_picture' => $name['profile_picture'] ?? null
]);
