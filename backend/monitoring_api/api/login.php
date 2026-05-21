<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:5173'); // Allow Vite dev server
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Database connection
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'monitoring_system';

$conn = new mysqli($host, $user, $password, $database);
if ($conn->connect_error) {
    die(json_encode(['success' => false, 'error' => 'Database connection failed']));
}

// Get POST data
$data = json_decode(file_get_contents('php://input'), true);
$email = $data['email'] ?? '';
$password_input = $data['password'] ?? '';

if (empty($email) || empty($password_input)) {
    echo json_encode(['success' => false, 'error' => 'Email and password required']);
    exit;
}

// Query user from database
$sql = "SELECT u.*, 
        CASE 
            WHEN u.role = 'student' THEN s.first_name
            WHEN u.role = 'instructor' THEN i.first_name
            WHEN u.role = 'custodian' THEN c.first_name
        END as first_name,
        CASE 
            WHEN u.role = 'student' THEN s.last_name
            WHEN u.role = 'instructor' THEN i.last_name
            WHEN u.role = 'custodian' THEN c.last_name
        END as last_name
        FROM users u
        LEFT JOIN students s ON u.users_id = s.users_id
        LEFT JOIN instructors i ON u.users_id = i.users_id
        LEFT JOIN custodians c ON u.users_id = c.users_id
        WHERE u.email = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(['success' => false, 'error' => 'User not found']);
    exit;
}

$user = $result->fetch_assoc();

// Verify password (plain text in your sample data, but use password_verify in production)
if ($password_input === $user['password'] || password_verify($password_input, $user['password'])) {
    unset($user['password']);
    echo json_encode(['success' => true, 'user' => $user]);
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid password']);
}

$stmt->close();
$conn->close();
