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

$fname = $_POST['fname'] ?? '';
$lname = $_POST['lname'] ?? '';
$email = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';
$role = $_POST['role'] ?? '';
$course = trim($_POST['course'] ?? '');
$year = trim($_POST['year'] ?? '');
$section = strtoupper(trim($_POST['section'] ?? ''));
$instructor_confirmation = $_POST['instructor_confirmation'] ?? '';

if (!$fname || !$lname || !$email || !$password || !$role) {
    echo json_encode(['success' => false, 'message' => 'All fields required']);
    exit;
}

if (!in_array($role, ['student', 'instructor'], true)) {
    echo json_encode(['success' => false, 'message' => 'Invalid user type']);
    exit;
}

if ($role === 'student') {
    if (!$course || !in_array($year, ['1', '2', '3', '4'], true) || !in_array($section, ['A', 'B', 'C', 'D', 'E'], true)) {
        echo json_encode(['success' => false, 'message' => 'Course, year, and section are required']);
        exit;
    }
}

if ($role === 'instructor' && $instructor_confirmation !== 'OMSC_Laboratory_Instructor_2026') {
    echo json_encode(['success' => false, 'message' => 'Wrong OMSC Confirmation']);
    exit;
}

// Check if email exists
$check = $conn->prepare("SELECT email FROM users WHERE email = ?");
$check->bind_param("s", $email);
$check->execute();
if ($check->get_result()->num_rows > 0) {
    echo json_encode(['success' => false, 'message' => 'Email already registered']);
    exit;
}

$hashed = password_hash($password, PASSWORD_DEFAULT);
$stmt = $conn->prepare("INSERT INTO users (email, password, role) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $email, $hashed, $role);
if (!$stmt->execute()) {
    echo json_encode(['success' => false, 'message' => 'Registration failed']);
    exit;
}
$users_id = $conn->insert_id;

$table = $role === 'student' ? 'students' : 'instructors';
if ($role === 'student') {
    $insert2 = $conn->prepare("INSERT INTO students (users_id, first_name, last_name, course, year_level, section) VALUES (?, ?, ?, ?, ?, ?)");
    $yearInt = intval($year);
    $insert2->bind_param("isssis", $users_id, $fname, $lname, $course, $yearInt, $section);
} else {
    $insert2 = $conn->prepare("INSERT INTO instructors (users_id, first_name, last_name) VALUES (?, ?, ?)");
    $insert2->bind_param("iss", $users_id, $fname, $lname);
}
if ($insert2->execute()) {
    echo json_encode(['success' => true, 'message' => 'Registration successful']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to create role record']);
}
