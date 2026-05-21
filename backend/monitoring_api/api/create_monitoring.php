<?php
session_start();
require_once '../config.php';
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $lab_id = isset($_POST['lab_id']) ? intval($_POST['lab_id']) : 0;
    $start_time = isset($_POST['start_time']) ? $_POST['start_time'] : '';
    $end_time = isset($_POST['end_time']) ? $_POST['end_time'] : '';
    $session_date = isset($_POST['session_date']) ? $_POST['session_date'] : date('Y-m-d');
    $pcs = isset($_POST['pcs']) ? json_decode($_POST['pcs'], true) : [];
    $total_pcs_count = isset($_POST['total_pcs_count']) ? intval($_POST['total_pcs_count']) : 40;
    $course = trim($_POST['course'] ?? '');
    $year_level = isset($_POST['year_level']) ? intval($_POST['year_level']) : null;
    $section = strtoupper(trim($_POST['section'] ?? ''));
    $hidden_students = isset($_POST['hidden_students']) ? json_decode($_POST['hidden_students'], true) : [];

    if (!$lab_id || !$start_time || !$end_time) {
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit();
    }

    // Debug: Log the session user
    error_log("Current user ID: " . $_SESSION['users_id']);
    error_log("Current user role: " . $_SESSION['role']);

    // Get instructor ID - FIXED: Use proper session variable
    // First check if users_id exists in session
    if (!isset($_SESSION['users_id'])) {
        echo json_encode(['success' => false, 'message' => 'User not logged in']);
        exit();
    }

    $stmt = $conn->prepare("SELECT instructor_id FROM instructors WHERE users_id = ?");
    $stmt->bind_param("i", $_SESSION['users_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    $instructor = $result->fetch_assoc();

    // Debug: Log the instructor query result
    error_log("Instructor query result: " . ($instructor ? "Found" : "Not found"));

    if (!$instructor) {
        // Check if the user exists and has instructor role
        $user_check = $conn->prepare("SELECT role FROM users WHERE users_id = ?");
        $user_check->bind_param("i", $_SESSION['users_id']);
        $user_check->execute();
        $user_result = $user_check->get_result();
        $user = $user_result->fetch_assoc();

        error_log("User role: " . ($user ? $user['role'] : "Not found"));

        if (!$user || $user['role'] !== 'instructor') {
            echo json_encode(['success' => false, 'message' => 'Access denied. Instructor privileges required.']);
            exit();
        }

        // Try to create instructor record if missing
        $create_instructor = $conn->prepare("INSERT INTO instructors (users_id, first_name, last_name) VALUES (?, 'Unknown', 'Instructor')");
        $create_instructor->bind_param("i", $_SESSION['users_id']);
        if ($create_instructor->execute()) {
            $instructor_id = $conn->insert_id;
            error_log("Created missing instructor record with ID: " . $instructor_id);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to create instructor record. Please contact administrator.']);
            exit();
        }
    } else {
        $instructor_id = $instructor['instructor_id'];
    }

    // Start transaction
    $conn->begin_transaction();

    try {
        // Create monitoring record with max_pc_count and session_date
        $stmt = $conn->prepare("INSERT INTO monitoring (lab_id, instructor_id, start_time, end_time, created_at, max_pc_count, course, year_level, section) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("iisssisis", $lab_id, $instructor_id, $start_time, $end_time, $session_date, $total_pcs_count, $course, $year_level, $section);

        if (!$stmt->execute()) {
            throw new Exception('Failed to create monitoring record: ' . $conn->error);
        }

        $monitoring_id = $conn->insert_id;

        if (!empty($hidden_students)) {
            $hidden_stmt = $conn->prepare("INSERT INTO monitoring_hidden_students (monitoring_id, users_id) VALUES (?, ?)");
            foreach ($hidden_students as $hidden_user_id) {
                $hidden_id = intval($hidden_user_id);
                if ($hidden_id > 0) {
                    $hidden_stmt->bind_param("ii", $monitoring_id, $hidden_id);
                    $hidden_stmt->execute();
                }
            }
        }

        // For ALL selected PCs, ensure they exist in computers table
        if (!empty($pcs)) {
            $insert_stmt = $conn->prepare("INSERT INTO monitoring_pcs (monitoring_id, pc_id) VALUES (?, ?)");

            foreach ($pcs as $pc_number) {
                // Check if PC exists in computers table
                $check_stmt = $conn->prepare("SELECT pc_id FROM computers WHERE lab_id = ? AND pc_number = ?");
                $check_stmt->bind_param("ii", $lab_id, $pc_number);
                $check_stmt->execute();
                $check_result = $check_stmt->get_result();

                if ($check_result->num_rows > 0) {
                    // PC exists, use existing pc_id
                    $pc = $check_result->fetch_assoc();
                    $pc_id = $pc['pc_id'];
                } else {
                    // PC doesn't exist, create it dynamically
                    $insert_computer = $conn->prepare("INSERT INTO computers (lab_id, pc_number) VALUES (?, ?)");
                    $insert_computer->bind_param("ii", $lab_id, $pc_number);
                    $insert_computer->execute();
                    $pc_id = $conn->insert_id;
                }

                $insert_stmt->bind_param("ii", $monitoring_id, $pc_id);
                $insert_stmt->execute();
            }
        }

        $conn->commit();
        echo json_encode(['success' => true, 'monitoring_id' => $monitoring_id, 'total_pcs' => $total_pcs_count]);
    } catch (Exception $e) {
        $conn->rollback();
        error_log("Error in create_monitoring.php: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
}
