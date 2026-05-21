<?php
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
session_start();
require_once '../config.php';

header('Content-Type: application/json');

$course = trim($_GET['course'] ?? '');
$year = intval($_GET['year_level'] ?? 0);
$section = strtoupper(trim($_GET['section'] ?? ''));

if (!$course || !$year || !$section) {
    echo json_encode([]);
    exit;
}

$stmt = $conn->prepare("SELECT users_id, students_id, first_name, last_name, course, year_level, section
                        FROM students
                        WHERE course = ? AND year_level = ? AND section = ?
                        ORDER BY last_name ASC, first_name ASC");
$stmt->bind_param("sis", $course, $year, $section);
$stmt->execute();
$result = $stmt->get_result();

$students = [];
while ($row = $result->fetch_assoc()) {
    $students[] = $row;
}

echo json_encode($students);
