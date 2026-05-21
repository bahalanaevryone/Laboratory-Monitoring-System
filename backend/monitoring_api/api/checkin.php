<?php
require_once '../config.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit();
}

$monitoring_id = isset($_POST['monitoring_id']) ? intval($_POST['monitoring_id']) : 0;
$pc_number = isset($_POST['pc_id']) ? intval($_POST['pc_id']) : 0;
$student_input = isset($_POST['student_id']) ? intval($_POST['student_id']) : 0;

if (!$monitoring_id || !$pc_number) {
    echo json_encode(['success' => false, 'message' => 'Invalid input data']);
    exit();
}

$user_id = 0;
if (isset($_SESSION['users_id'])) {
    $user_id = intval($_SESSION['users_id']);
} elseif ($student_input) {
    $user_id = $student_input;
}

if (!$user_id) {
    echo json_encode(['success' => false, 'message' => 'Unable to identify the logged-in student']);
    exit();
}

$student_stmt = $conn->prepare("SELECT students_id FROM students WHERE users_id = ? LIMIT 1");
$student_stmt->bind_param("i", $user_id);
$student_stmt->execute();
$student_result = $student_stmt->get_result();
$student = $student_result->fetch_assoc();

if (!$student) {
    echo json_encode(['success' => false, 'message' => 'Student record not found']);
    exit();
}

$students_id = intval($student['students_id']);

$stmt = $conn->prepare("SELECT attendance_id FROM attendance WHERE monitoring_id = ? AND students_id = ?");
$stmt->bind_param("ii", $monitoring_id, $students_id);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows > 0) {
    echo json_encode(['success' => false, 'message' => 'You have already checked in to this session']);
    exit();
}

$stmt = $conn->prepare("SELECT start_time, end_time, created_at, max_pc_count FROM monitoring WHERE monitoring_id = ?");
$stmt->bind_param("i", $monitoring_id);
$stmt->execute();
$result = $stmt->get_result();
$session = $result->fetch_assoc();

if (!$session) {
    echo json_encode(['success' => false, 'message' => 'Session not found']);
    exit();
}

$max_pc = intval($session['max_pc_count'] ?? 40);
if ($pc_number < 1 || $pc_number > $max_pc) {
    echo json_encode(['success' => false, 'message' => 'Invalid PC number']);
    exit();
}

$stmt = $conn->prepare("SELECT a.attendance_id
                        FROM attendance a
                        JOIN computers c ON a.pc_id = c.pc_id
                        WHERE a.monitoring_id = ? AND c.pc_number = ?");
$stmt->bind_param("ii", $monitoring_id, $pc_number);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows > 0) {
    echo json_encode(['success' => false, 'message' => 'This PC is already taken']);
    exit();
}

$stmt = $conn->prepare("SELECT mp.pc_id
                        FROM monitoring_pcs mp
                        JOIN computers c ON mp.pc_id = c.pc_id
                        WHERE mp.monitoring_id = ? AND c.pc_number = ?
                        LIMIT 1");
$stmt->bind_param("ii", $monitoring_id, $pc_number);
$stmt->execute();
$result = $stmt->get_result();
$pc_record = $result->fetch_assoc();

if (!$pc_record) {
    echo json_encode(['success' => false, 'message' => 'This PC is not enabled for this session']);
    exit();
}

$actual_pc_id = intval($pc_record['pc_id']);
$session_date = $session['created_at'];
$current_date = date('Y-m-d');

if ($session_date != $current_date) {
    echo json_encode(['success' => false, 'message' => 'This session is not scheduled for today']);
    exit();
}

$current_time_24 = date('H:i:s');
$start_time_24 = $session['start_time'];
$end_time_24 = $session['end_time'];

list($start_hour, $start_minute) = explode(':', $start_time_24);
list($end_hour, $end_minute) = explode(':', $end_time_24);
list($current_hour, $current_minute) = explode(':', $current_time_24);

$start_total_minutes = ($start_hour * 60) + $start_minute;
$end_total_minutes = ($end_hour * 60) + $end_minute;
$current_total_minutes = ($current_hour * 60) + $current_minute;

$is_session_active = false;
if ($end_total_minutes < $start_total_minutes) {
    $is_session_active = ($current_total_minutes >= $start_total_minutes || $current_total_minutes <= $end_total_minutes);
} else {
    $is_session_active = ($current_total_minutes >= $start_total_minutes && $current_total_minutes <= $end_total_minutes);
}

if (!$is_session_active) {
    if ($current_total_minutes < $start_total_minutes) {
        echo json_encode(['success' => false, 'message' => 'This session has not started yet']);
    } else {
        echo json_encode(['success' => false, 'message' => 'This session has already ended']);
    }
    exit();
}

$late_threshold = $start_total_minutes + 15;
$status = ($current_total_minutes > $late_threshold) ? 'Late' : 'Present';
$attendance_time = date('H:i:s');
$attendance_date = date('Y-m-d');

$stmt = $conn->prepare("INSERT INTO attendance (monitoring_id, students_id, pc_id, attendance_time, attendance_date, status) VALUES (?, ?, ?, ?, ?, ?)");
$stmt->bind_param("iiisss", $monitoring_id, $students_id, $actual_pc_id, $attendance_time, $attendance_date, $status);

if ($stmt->execute()) {
    echo json_encode([
        'success' => true,
        'message' => 'Successfully checked in!',
        'status' => $status,
        'pc_number' => $pc_number
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to check in: ' . $conn->error]);
}
?>
