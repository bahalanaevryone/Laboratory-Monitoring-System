<?php
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
session_start();
require_once '../config.php';

$lab = isset($_GET['lab']) ? $_GET['lab'] : 'all';

// Custodian sees ALL sessions (no student filtering)
if ($lab === 'all') {
    $query = "SELECT m.*, 
              CONCAT(i.first_name, ' ', i.last_name) as instructor_name,
              m.instructor_id,
              l.lab_name,
              ps.title as private_title,
              ps.creator_id as private_creator_id,
              COALESCE(
                (SELECT CONCAT(s2.first_name, ' ', s2.last_name) FROM students s2 WHERE s2.users_id = ps.creator_id LIMIT 1),
                (SELECT CONCAT(i2.first_name, ' ', i2.last_name) FROM instructors i2 WHERE i2.users_id = ps.creator_id LIMIT 1),
                (SELECT CONCAT(c2.first_name, ' ', c2.last_name) FROM custodians c2 WHERE c2.users_id = ps.creator_id LIMIT 1)
              ) as creator_name,
              (SELECT u.email FROM users u WHERE u.users_id = ps.creator_id LIMIT 1) as creator_email,
              (SELECT u.role FROM users u WHERE u.users_id = ps.creator_id LIMIT 1) as creator_role,
              (SELECT u.users_id FROM users u WHERE u.users_id = ps.creator_id LIMIT 1) as creator_users_id,
              (SELECT u.email FROM users u 
               JOIN instructors inst ON inst.users_id = u.users_id 
               WHERE inst.instructor_id = m.instructor_id LIMIT 1) as instructor_email,
              COUNT(a.attendance_id) as present_count
              FROM monitoring m
              LEFT JOIN instructors i ON m.instructor_id = i.instructor_id
              LEFT JOIN laboratories l ON m.lab_id = l.lab_id
              LEFT JOIN private_sessions ps ON m.monitoring_id = ps.monitoring_id
              LEFT JOIN attendance a ON m.monitoring_id = a.monitoring_id
              GROUP BY m.monitoring_id
              ORDER BY m.created_at DESC";
    $result = $conn->query($query);
} else {
    $stmt = $conn->prepare("SELECT m.*, 
              CONCAT(i.first_name, ' ', i.last_name) as instructor_name,
              m.instructor_id,
              l.lab_name,
              ps.title as private_title,
              ps.creator_id as private_creator_id,
              COALESCE(
                (SELECT CONCAT(s2.first_name, ' ', s2.last_name) FROM students s2 WHERE s2.users_id = ps.creator_id LIMIT 1),
                (SELECT CONCAT(i2.first_name, ' ', i2.last_name) FROM instructors i2 WHERE i2.users_id = ps.creator_id LIMIT 1),
                (SELECT CONCAT(c2.first_name, ' ', c2.last_name) FROM custodians c2 WHERE c2.users_id = ps.creator_id LIMIT 1)
              ) as creator_name,
              (SELECT u.email FROM users u WHERE u.users_id = ps.creator_id LIMIT 1) as creator_email,
              (SELECT u.role FROM users u WHERE u.users_id = ps.creator_id LIMIT 1) as creator_role,
              (SELECT u.users_id FROM users u WHERE u.users_id = ps.creator_id LIMIT 1) as creator_users_id,
              (SELECT u.email FROM users u 
               JOIN instructors inst ON inst.users_id = u.users_id 
               WHERE inst.instructor_id = m.instructor_id LIMIT 1) as instructor_email,
              COUNT(a.attendance_id) as present_count
              FROM monitoring m
              LEFT JOIN instructors i ON m.instructor_id = i.instructor_id
              LEFT JOIN laboratories l ON m.lab_id = l.lab_id
              LEFT JOIN private_sessions ps ON m.monitoring_id = ps.monitoring_id
              LEFT JOIN attendance a ON m.monitoring_id = a.monitoring_id
              WHERE m.lab_id = ?
              GROUP BY m.monitoring_id
              ORDER BY m.created_at DESC");
    $stmt->bind_param("i", $lab);
    $stmt->execute();
    $result = $stmt->get_result();
}

$monitoring = [];
while ($row = $result->fetch_assoc()) {
    // Format times for display
    $row['start_time_formatted'] = date('h:i A', strtotime($row['start_time']));
    $row['end_time_formatted'] = date('h:i A', strtotime($row['end_time']));

    // Determine session type and display name
    if ($row['instructor_name']) {
        $row['session_type'] = 'Instructor';
        $row['display_name'] = $row['instructor_name'];
    } else if ($row['private_title']) {
        $row['session_type'] = 'Private';
        $row['display_name'] = $row['creator_name'] ?: $row['private_title'];
    } else {
        $row['session_type'] = 'Private';
        $row['display_name'] = 'Student Session';
    }

    $monitoring[] = $row;
}

header('Content-Type: application/json');
echo json_encode($monitoring);
