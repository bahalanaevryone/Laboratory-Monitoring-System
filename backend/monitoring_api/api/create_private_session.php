<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json');

header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

session_start();
require_once '../config.php';

// Ensure API endpoints return only JSON, even if PHP warnings occur
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit();
}

function get_or_create_pc_id($conn, $lab_id, $pc_number)
{
    $stmt = $conn->prepare("SELECT pc_id FROM computers WHERE lab_id = ? AND pc_number = ? LIMIT 1");
    $stmt->bind_param("ii", $lab_id, $pc_number);
    $stmt->execute();
    $result = $stmt->get_result();
    $existing = $result->fetch_assoc();

    if ($existing) {
        return intval($existing['pc_id']);
    }

    $insert_stmt = $conn->prepare("INSERT INTO computers (lab_id, pc_number) VALUES (?, ?)");
    $insert_stmt->bind_param("ii", $lab_id, $pc_number);
    $insert_stmt->execute();

    return intval($conn->insert_id);
}

$lab_id = isset($_POST['lab_id']) ? intval($_POST['lab_id']) : 0;
$title = isset($_POST['title']) ? trim($_POST['title']) : '';
$session_date = isset($_POST['session_date']) ? $_POST['session_date'] : '';
$start_time = isset($_POST['start_time']) ? $_POST['start_time'] : '';
$end_time = isset($_POST['end_time']) ? $_POST['end_time'] : '';
$creator_input = isset($_POST['creator_id']) ? intval($_POST['creator_id']) : 0;
$creator_pc = isset($_POST['creator_pc']) ? intval($_POST['creator_pc']) : 0;
$student_firstnames = isset($_POST['student_firstnames']) ? $_POST['student_firstnames'] : [];
$student_lastnames = isset($_POST['student_lastnames']) ? $_POST['student_lastnames'] : [];
$student_pcs = isset($_POST['student_pcs']) ? $_POST['student_pcs'] : [];

if (!$lab_id || !$title || !$session_date || !$start_time || !$end_time || !$creator_pc) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit();
}

$user_id = 0;
$user_role = $_SESSION['role'] ?? null;
if (isset($_SESSION['users_id'])) {
    $user_id = intval($_SESSION['users_id']);
} elseif ($creator_input) {
    $user_id = $creator_input;
}

if (!$user_id) {
    echo json_encode(['success' => false, 'message' => 'Unable to identify the logged-in user']);
    exit();
}

$creator_students_id = null;
$creator_firstname = '';
$creator_lastname = '';

if ($user_role === 'student' || $user_role === null) {
    $creator_stmt = $conn->prepare("SELECT students_id, first_name, last_name FROM students WHERE users_id = ? OR students_id = ? LIMIT 1");
    $creator_stmt->bind_param("ii", $user_id, $user_id);
    $creator_stmt->execute();
    $creator_result = $creator_stmt->get_result();
    $creator = $creator_result->fetch_assoc();

    if (!$creator) {
        echo json_encode(['success' => false, 'message' => 'Student record not found for this account']);
        exit();
    }

    $creator_students_id = intval($creator['students_id']);
    $creator_firstname = $creator['first_name'];
    $creator_lastname = $creator['last_name'];
} elseif ($user_role === 'instructor') {
    $creator_stmt = $conn->prepare("SELECT instructor_id, first_name, last_name FROM instructors WHERE users_id = ? LIMIT 1");
    $creator_stmt->bind_param("i", $user_id);
    $creator_stmt->execute();
    $creator_result = $creator_stmt->get_result();
    $creator = $creator_result->fetch_assoc();

    if (!$creator) {
        echo json_encode(['success' => false, 'message' => 'Instructor record not found for this account']);
        exit();
    }

    $creator_firstname = $creator['first_name'];
    $creator_lastname = $creator['last_name'];
} elseif ($user_role === 'custodian') {
    $creator_stmt = $conn->prepare("SELECT custodian_id, first_name, last_name FROM custodians WHERE users_id = ? LIMIT 1");
    $creator_stmt->bind_param("i", $user_id);
    $creator_stmt->execute();
    $creator_result = $creator_stmt->get_result();
    $creator = $creator_result->fetch_assoc();

    if (!$creator) {
        echo json_encode(['success' => false, 'message' => 'Custodian record not found for this account']);
        exit();
    }

    $creator_firstname = $creator['first_name'];
    $creator_lastname = $creator['last_name'];
} else {
    echo json_encode(['success' => false, 'message' => 'Unsupported user role']);
    exit();
}

$max_pc_count = $creator_pc;

foreach ($student_pcs as $pc_value) {
    $pc_number = intval($pc_value);
    if ($pc_number > $max_pc_count) {
        $max_pc_count = $pc_number;
    }
}

if ($max_pc_count < 40) {
    $max_pc_count = 40;
}

$conn->begin_transaction();

try {
    $stmt = $conn->prepare("INSERT INTO monitoring (lab_id, instructor_id, start_time, end_time, created_at, max_pc_count) VALUES (?, NULL, ?, ?, ?, ?)");
    $stmt->bind_param("isssi", $lab_id, $start_time, $end_time, $session_date, $max_pc_count);
    $stmt->execute();
    $monitoring_id = $conn->insert_id;

    $stmt = $conn->prepare("INSERT INTO private_sessions (monitoring_id, creator_id, title) VALUES (?, ?, ?)");
    $stmt->bind_param("iis", $monitoring_id, $user_id, $title);
    $stmt->execute();
    $session_id = $conn->insert_id;

    for ($pc_number = 1; $pc_number <= $max_pc_count; $pc_number++) {
        $pc_id = get_or_create_pc_id($conn, $lab_id, $pc_number);
        $insert_pc_stmt = $conn->prepare("INSERT INTO monitoring_pcs (monitoring_id, pc_id) VALUES (?, ?)");
        $insert_pc_stmt->bind_param("ii", $monitoring_id, $pc_id);
        $insert_pc_stmt->execute();
    }

    $creator_pc_id = get_or_create_pc_id($conn, $lab_id, $creator_pc);

    if ($user_role === 'student' || $user_role === null) {
        // If creator is a student, use their students_id directly
        $attendance_stmt = $conn->prepare("INSERT INTO attendance (monitoring_id, students_id, participant_id, pc_id, attendance_time, attendance_date, status) VALUES (?, ?, NULL, ?, ?, ?, 'Present')");
        $attendance_stmt->bind_param("iiiss", $monitoring_id, $creator_students_id, $creator_pc_id, $start_time, $session_date);
        $attendance_stmt->execute();
    } else {
        // If creator is instructor/custodian, check if they are also a registered student user
        $creator_students_id_for_attendance = NULL;
        $find_creator_student_stmt = $conn->prepare("SELECT students_id FROM students WHERE users_id = ? LIMIT 1");
        $find_creator_student_stmt->bind_param("i", $user_id);
        $find_creator_student_stmt->execute();
        $find_creator_student_result = $find_creator_student_stmt->get_result();
        if ($found_creator_student = $find_creator_student_result->fetch_assoc()) {
            $creator_students_id_for_attendance = intval($found_creator_student['students_id']);
        }

        $creator_participant_stmt = $conn->prepare("INSERT INTO participants (session_id, firstname, lastname, pc_number) VALUES (?, ?, ?, ?)");
        $creator_participant_stmt->bind_param("issi", $session_id, $creator_firstname, $creator_lastname, $creator_pc);
        $creator_participant_stmt->execute();
        $creator_participant_id = $conn->insert_id;

        $attendance_stmt = $conn->prepare("INSERT INTO attendance (monitoring_id, students_id, participant_id, pc_id, attendance_time, attendance_date, status) VALUES (?, ?, ?, ?, ?, ?, 'Present')");
        $attendance_stmt->bind_param("iiiiss", $monitoring_id, $creator_students_id_for_attendance, $creator_participant_id, $creator_pc_id, $start_time, $session_date);
        $attendance_stmt->execute();
    }

    for ($i = 0; $i < count($student_firstnames); $i++) {
        $firstname = trim($student_firstnames[$i] ?? '');
        $lastname = trim($student_lastnames[$i] ?? '');
        $student_pc = intval($student_pcs[$i] ?? 0);

        if ($firstname === '' || $lastname === '' || !$student_pc) {
            continue;
        }

        // Try to find students_id for the participant
        $participant_students_id = NULL;
        $find_student_stmt = $conn->prepare("SELECT students_id FROM students WHERE first_name = ? AND last_name = ? LIMIT 1");
        $find_student_stmt->bind_param("ss", $firstname, $lastname);
        $find_student_stmt->execute();
        $find_student_result = $find_student_stmt->get_result();
        if ($found_student = $find_student_result->fetch_assoc()) {
            $participant_students_id = intval($found_student['students_id']);
        }

        if ($student_pc === $creator_pc) {
            throw new Exception('Participant PC assignments cannot match your own PC number');
        }

        $participant_stmt = $conn->prepare("INSERT INTO participants (session_id, firstname, lastname, pc_number) VALUES (?, ?, ?, ?)");
        $participant_stmt->bind_param("issi", $session_id, $firstname, $lastname, $student_pc);
        $participant_stmt->execute();
        $participant_id = $conn->insert_id;

        $pc_id = get_or_create_pc_id($conn, $lab_id, $student_pc);

        // Use participant_students_id if found, otherwise NULL
        $attendance_stmt = $conn->prepare("INSERT INTO attendance (monitoring_id, students_id, participant_id, pc_id, attendance_time, attendance_date, status) VALUES (?, ?, ?, ?, ?, ?, 'Present')");
        $attendance_stmt->bind_param("iiiiss", $monitoring_id, $participant_students_id, $participant_id, $pc_id, $start_time, $session_date);
        $attendance_stmt->execute();
    }

    $conn->commit();
    echo json_encode(['success' => true, 'monitoring_id' => $monitoring_id, 'max_pc_count' => $max_pc_count]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
