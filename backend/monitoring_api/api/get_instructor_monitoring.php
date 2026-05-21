<?php
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
session_start();
require_once '../config.php';

// Get instructor ID
$stmt = $conn->prepare("SELECT instructor_id FROM instructors WHERE users_id = ?");
$stmt->bind_param("i", $_SESSION['users_id']);
$stmt->execute();
$result = $stmt->get_result();
$instructor = $result->fetch_assoc();
$instructor_id = $instructor['instructor_id'];

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
          COUNT(a.attendance_id) as present_count
          FROM monitoring m
          LEFT JOIN instructors i ON m.instructor_id = i.instructor_id
          LEFT JOIN laboratories l ON m.lab_id = l.lab_id
          LEFT JOIN attendance a ON m.monitoring_id = a.monitoring_id
          LEFT JOIN private_sessions ps ON m.monitoring_id = ps.monitoring_id
          WHERE m.instructor_id = ? OR ps.creator_id = ?
          GROUP BY m.monitoring_id
          ORDER BY m.created_at DESC";
$stmt = $conn->prepare($query);
$stmt->bind_param("ii", $instructor_id, $_SESSION['users_id']);
$stmt->execute();
$result = $stmt->get_result();

$monitoring = [];
while ($row = $result->fetch_assoc()) {
  $monitoring[] = $row;
}

header('Content-Type: application/json');
echo json_encode($monitoring);
