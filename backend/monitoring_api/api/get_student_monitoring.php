<?php
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
session_start();
require_once '../config.php';

$lab = isset($_GET['lab']) ? $_GET['lab'] : 'all';
if (!isset($_SESSION['users_id'])) {
    header('Content-Type: application/json');
    echo json_encode([]);
    exit();
}

$student_id = $_SESSION['users_id'];

// Get student ID
$stmt = $conn->prepare("SELECT students_id, course, year_level, section FROM students WHERE users_id = ?");
$stmt->bind_param("i", $student_id);
$stmt->execute();
$result = $stmt->get_result();
$student = $result->fetch_assoc();
if (!$student) {
    header('Content-Type: application/json');
    echo json_encode([]);
    exit();
}

$students_id = $student['students_id'];
$student_course = strtoupper(trim($student['course'] ?? ''));
$student_year = intval($student['year_level'] ?? 0);
$student_section = strtoupper(trim($student['section'] ?? ''));

// Get current time in minutes
$current_hour = date('H');
$current_minute = date('i');
$current_total = ($current_hour * 60) + $current_minute;
$today_date = date('Y-m-d');

// FIXED: Show ALL sessions (not just today's) for dashboard view
// For dashboard (lab='all'), show all sessions
// For specific lab view, filter by lab but show all dates
if ($lab === 'all') {
    $query = "SELECT m.*, 
              CONCAT(i.first_name, ' ', i.last_name) as instructor_name,
              m.instructor_id,
              l.lab_name,
              a.attendance_id as attended,
              a.attendance_time,
              a.status as attendance_status,
              c.pc_number,
              ps.title as private_title,
              ps.creator_id as private_creator_id,
              COALESCE(
                (SELECT CONCAT(s2.first_name, ' ', s2.last_name) FROM students s2 WHERE s2.users_id = ps.creator_id LIMIT 1),
                (SELECT CONCAT(i2.first_name, ' ', i2.last_name) FROM instructors i2 WHERE i2.users_id = ps.creator_id LIMIT 1),
                (SELECT CONCAT(c2.first_name, ' ', c2.last_name) FROM custodians c2 WHERE c2.users_id = ps.creator_id LIMIT 1)
              ) as creator_name,
              (SELECT u.email FROM users u WHERE u.users_id = ps.creator_id LIMIT 1) as creator_email,
              (SELECT u.role FROM users u WHERE u.users_id = ps.creator_id LIMIT 1) as creator_role,
              (SELECT COUNT(*) FROM monitoring_pcs mp WHERE mp.monitoring_id = m.monitoring_id) as total_enabled_pcs,
              (SELECT COUNT(*) FROM attendance att WHERE att.monitoring_id = m.monitoring_id) as total_attended
              FROM monitoring m
              LEFT JOIN instructors i ON m.instructor_id = i.instructor_id
              LEFT JOIN laboratories l ON m.lab_id = l.lab_id
              LEFT JOIN attendance a ON m.monitoring_id = a.monitoring_id AND a.students_id = ?
              LEFT JOIN computers c ON a.pc_id = c.pc_id
              LEFT JOIN private_sessions ps ON m.monitoring_id = ps.monitoring_id
              WHERE (
                (ps.monitoring_id IS NULL AND (
                  m.course IS NULL OR TRIM(m.course) = '' OR
                  (UPPER(TRIM(m.course)) = ? AND m.year_level = ? AND UPPER(TRIM(m.section)) = ?)
                )) -- Regular sessions
                OR
                (ps.monitoring_id IS NOT NULL AND (ps.creator_id = ? OR a.attendance_id IS NOT NULL)) -- Private sessions: either creator or already attended
              )
              AND NOT EXISTS (SELECT 1 FROM monitoring_hidden_students mhs WHERE mhs.monitoring_id = m.monitoring_id AND mhs.users_id = ?)
              ORDER BY m.created_at DESC, m.start_time ASC";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("isisii", $students_id, $student_course, $student_year, $student_section, $student_id, $student_id);
} else {
    $query = "SELECT m.*, 
              CONCAT(i.first_name, ' ', i.last_name) as instructor_name,
              m.instructor_id,
              l.lab_name,
              a.attendance_id as attended,
              a.attendance_time,
              a.status as attendance_status,
              c.pc_number,
              ps.title as private_title,
              ps.creator_id as private_creator_id,
              COALESCE(
                (SELECT CONCAT(s2.first_name, ' ', s2.last_name) FROM students s2 WHERE s2.users_id = ps.creator_id LIMIT 1),
                (SELECT CONCAT(i2.first_name, ' ', i2.last_name) FROM instructors i2 WHERE i2.users_id = ps.creator_id LIMIT 1),
                (SELECT CONCAT(c2.first_name, ' ', c2.last_name) FROM custodians c2 WHERE c2.users_id = ps.creator_id LIMIT 1)
              ) as creator_name,
              (SELECT u.email FROM users u WHERE u.users_id = ps.creator_id LIMIT 1) as creator_email,
              (SELECT u.role FROM users u WHERE u.users_id = ps.creator_id LIMIT 1) as creator_role,
              (SELECT COUNT(*) FROM monitoring_pcs mp WHERE mp.monitoring_id = m.monitoring_id) as total_enabled_pcs,
              (SELECT COUNT(*) FROM attendance att WHERE att.monitoring_id = m.monitoring_id) as total_attended
              FROM monitoring m
              LEFT JOIN instructors i ON m.instructor_id = i.instructor_id
              LEFT JOIN laboratories l ON m.lab_id = l.lab_id
              LEFT JOIN attendance a ON m.monitoring_id = a.monitoring_id AND a.students_id = ?
              LEFT JOIN computers c ON a.pc_id = c.pc_id
              LEFT JOIN private_sessions ps ON m.monitoring_id = ps.monitoring_id
              WHERE m.lab_id = ? AND (
                (ps.monitoring_id IS NULL AND (
                  m.course IS NULL OR TRIM(m.course) = '' OR
                  (UPPER(TRIM(m.course)) = ? AND m.year_level = ? AND UPPER(TRIM(m.section)) = ?)
                )) -- Regular sessions
                OR
                (ps.monitoring_id IS NOT NULL AND (ps.creator_id = ? OR a.attendance_id IS NOT NULL)) -- Private sessions: either creator or already attended
              )
              AND NOT EXISTS (SELECT 1 FROM monitoring_hidden_students mhs WHERE mhs.monitoring_id = m.monitoring_id AND mhs.users_id = ?)
              ORDER BY m.created_at DESC, m.start_time ASC";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("iiisisi", $students_id, $lab, $student_course, $student_year, $student_section, $student_id, $student_id);
}

$stmt->execute();
$result = $stmt->get_result();

$monitoring = [];
while ($row = $result->fetch_assoc()) {
    // Format times for display
    $row['start_time_formatted'] = date('h:i A', strtotime($row['start_time']));
    $row['end_time_formatted'] = date('h:i A', strtotime($row['end_time']));

    // Determine display name for session
    if ($row['instructor_name']) {
        $row['display_name'] = $row['instructor_name'];
        $row['session_type'] = 'instructor';
    } else if ($row['private_title']) {
        $row['display_name'] = $row['private_title'] . ' (by ' . ($row['creator_name'] ?? 'Student') . ')';
        $row['session_type'] = 'private';
    } else {
        $row['display_name'] = 'Private Session';
        $row['session_type'] = 'private';
    }

    // Parse session times for comparison
    $start_parts = explode(':', $row['start_time']);
    $end_parts = explode(':', $row['end_time']);
    $start_minutes = ($start_parts[0] * 60) + $start_parts[1];
    $end_minutes = ($end_parts[0] * 60) + $end_parts[1];

    // Handle cases where end_time is less than start_time (past midnight)
    $is_active = false;
    if ($end_minutes < $start_minutes) {
        $is_active = ($current_total >= $start_minutes || $current_total <= $end_minutes);
    } else {
        $is_active = ($current_total >= $start_minutes && $current_total <= $end_minutes);
    }

    // Also check if the session date is today
    $session_date = $row['created_at'];
    $is_today = ($session_date == $today_date);

    // Only show active sessions if they are today AND within time range
    // For non-today sessions, they are not available for check-in
    $is_available_for_checkin = ($is_today && $is_active);

    // Get available PCs count for this session
    $pc_check = $conn->prepare("SELECT COUNT(*) as available FROM monitoring_pcs mp 
                              WHERE mp.monitoring_id = ? 
                              AND mp.pc_id NOT IN (SELECT pc_id FROM attendance WHERE monitoring_id = ?)");
    $pc_check->bind_param("ii", $row['monitoring_id'], $row['monitoring_id']);
    $pc_check->execute();
    $pc_data = $pc_check->get_result()->fetch_assoc();
    $available_pcs = $pc_data['available'] ?? 0;

    // Determine button display
    if ($row['attended']) {
        $row['show_button'] = false;
        $row['can_checkin'] = false;
        $row['status_message'] = '✓ Already Checked In';
        $row['status_class'] = 'checked';
    } elseif ($is_available_for_checkin && $available_pcs > 0) {
        $row['show_button'] = true;
        $row['can_checkin'] = true;
        $row['status_message'] = '✅ Available for Check-in';
        $row['status_class'] = 'available';
    } elseif ($is_available_for_checkin && $available_pcs == 0) {
        $row['show_button'] = false;
        $row['can_checkin'] = false;
        $row['status_message'] = '⚠️ No Available PCs';
        $row['status_class'] = 'unavailable';
    } elseif (!$is_today) {
        $row['show_button'] = false;
        $row['can_checkin'] = false;
        $row['status_message'] = '📅 Session on ' . date('M j, Y', strtotime($session_date));
        $row['status_class'] = 'upcoming';
    } elseif ($current_total < $start_minutes && !$row['attended']) {
        $row['show_button'] = false;
        $row['can_checkin'] = false;
        $row['status_message'] = '⏰ Starts at ' . $row['start_time_formatted'];
        $row['status_class'] = 'upcoming';
    } else {
        $row['show_button'] = false;
        $row['can_checkin'] = false;
        $row['status_message'] = '⌛ Ended at ' . $row['end_time_formatted'];
        $row['status_class'] = 'ended';
    }

    $monitoring[] = $row;
}

header('Content-Type: application/json');
echo json_encode($monitoring);
