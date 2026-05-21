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
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit();
}

$user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
if (!$user_id) {
    echo json_encode(['success' => false, 'message' => 'Invalid user ID']);
    exit();
}

$stmt = $conn->prepare("SELECT users_id, role FROM users WHERE users_id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();

if (!$user) {
    echo json_encode(['success' => false, 'message' => 'User not found']);
    exit();
}

$conn->begin_transaction();

try {
    if ($user['role'] === 'student') {
        $studentStmt = $conn->prepare("SELECT students_id FROM students WHERE users_id = ?");
        $studentStmt->bind_param("i", $user_id);
        $studentStmt->execute();
        $student = $studentStmt->get_result()->fetch_assoc();

        if ($student) {
            $attendanceStmt = $conn->prepare("DELETE FROM attendance WHERE students_id = ?");
            $attendanceStmt->bind_param("i", $student['students_id']);
            $attendanceStmt->execute();
        }

        $deleteRoleStmt = $conn->prepare("DELETE FROM students WHERE users_id = ?");
        $deleteRoleStmt->bind_param("i", $user_id);
        $deleteRoleStmt->execute();
    } elseif ($user['role'] === 'instructor') {
        $deleteRoleStmt = $conn->prepare("DELETE FROM instructors WHERE users_id = ?");
        $deleteRoleStmt->bind_param("i", $user_id);
        $deleteRoleStmt->execute();
    } elseif ($user['role'] === 'custodian') {
        $deleteRoleStmt = $conn->prepare("DELETE FROM custodians WHERE users_id = ?");
        $deleteRoleStmt->bind_param("i", $user_id);
        $deleteRoleStmt->execute();
    }

    $deleteUserStmt = $conn->prepare("DELETE FROM users WHERE users_id = ?");
    $deleteUserStmt->bind_param("i", $user_id);
    $deleteUserStmt->execute();

    $conn->commit();
    echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
