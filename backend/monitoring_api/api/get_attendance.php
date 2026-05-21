<?php
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
require_once '../config.php';

$monitoring_id = isset($_GET['monitoring_id']) ? $_GET['monitoring_id'] : 0;

// Get monitoring details
$stmt = $conn->prepare("SELECT m.*, l.lab_name, CONCAT(i.first_name, ' ', i.last_name) as instructor_name
                        FROM monitoring m
                        LEFT JOIN laboratories l ON m.lab_id = l.lab_id
                        LEFT JOIN instructors i ON m.instructor_id = i.instructor_id
                        WHERE m.monitoring_id = ?");
$stmt->bind_param("i", $monitoring_id);
$stmt->execute();
$monitoring = $stmt->get_result()->fetch_assoc();

// Get attendance records
$stmt = $conn->prepare("SELECT a.*, 
                        s.first_name as student_first_name,
                        s.last_name as student_last_name,
                        p.firstname as participant_firstname,
                        p.lastname as participant_lastname,
                        p.id as participant_table_id,
                        COALESCE(NULLIF(TRIM(CONCAT(COALESCE(s.first_name, ''), ' ', COALESCE(s.last_name, ''))), ''),
                          NULLIF(TRIM(CONCAT(COALESCE(p.firstname, ''), ' ', COALESCE(p.lastname, ''))), ''),
                          NULLIF(TRIM((SELECT CONCAT(i2.first_name, ' ', i2.last_name) FROM instructors i2 WHERE i2.users_id = ps.creator_id LIMIT 1)), ''),
                          NULLIF(TRIM((SELECT CONCAT(s2.first_name, ' ', s2.last_name) FROM students s2 WHERE s2.users_id = ps.creator_id LIMIT 1)), ''),
                          NULLIF(TRIM((SELECT CONCAT(c2.first_name, ' ', c2.last_name) FROM custodians c2 WHERE c2.users_id = ps.creator_id LIMIT 1)), ''),
                          'Unnamed Participant'
                        ) as student_name,
                        c.pc_number
                        FROM attendance a
                        LEFT JOIN students s ON a.students_id = s.students_id
                        LEFT JOIN participants p ON a.participant_id = p.id
                        LEFT JOIN private_sessions ps ON a.monitoring_id = ps.monitoring_id
                        LEFT JOIN computers c ON a.pc_id = c.pc_id
                        WHERE a.monitoring_id = ?
                        ORDER BY a.attendance_time");
$stmt->bind_param("i", $monitoring_id);
$stmt->execute();
$attendance = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

$response = [
  'monitoring_id' => $monitoring_id,
  'lab_id' => $monitoring['lab_id'],
  'lab_name' => $monitoring['lab_name'],
  'instructor_name' => $monitoring['instructor_name'],
  'start_time' => $monitoring['start_time'],
  'end_time' => $monitoring['end_time'],
  'created_at' => $monitoring['created_at'],
  'max_pc_count' => $monitoring['max_pc_count'] ?? 40,
  'attendance' => $attendance
];

header('Content-Type: application/json');
echo json_encode($response);
