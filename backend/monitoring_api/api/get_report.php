<?php
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
session_start();
require_once '../config.php';

header('Content-Type: application/json');

$date = $_GET['date'] ?? date('Y-m-d');
$includePrivate = ($_GET['include_private'] ?? '1') === '1';

$stmt = $conn->prepare("SELECT m.monitoring_id, m.lab_id, l.lab_name, m.start_time, m.end_time, m.created_at,
                        m.course, m.year_level, m.section, m.max_pc_count,
                        CONCAT(i.first_name, ' ', i.last_name) AS instructor_name,
                        ps.title AS private_title,
                        ps.creator_id AS private_creator_id,
                        CASE WHEN ps.session_id IS NULL THEN 'regular' ELSE 'private' END AS session_type
                        FROM monitoring m
                        LEFT JOIN laboratories l ON m.lab_id = l.lab_id
                        LEFT JOIN instructors i ON m.instructor_id = i.instructor_id
                        LEFT JOIN private_sessions ps ON m.monitoring_id = ps.monitoring_id
                        WHERE m.created_at = ?
                        AND (? = 1 OR ps.session_id IS NULL)
                        ORDER BY m.start_time ASC");
$includePrivateInt = $includePrivate ? 1 : 0;
$stmt->bind_param("si", $date, $includePrivateInt);
$stmt->execute();
$sessionsResult = $stmt->get_result();

$sessions = [];
$usage = [];
$usageByLab = [];
while ($session = $sessionsResult->fetch_assoc()) {
    $attendanceStmt = $conn->prepare("SELECT c.pc_number,
                                      COALESCE(CONCAT(s.last_name, ', ', s.first_name), CONCAT(p.lastname, ', ', p.firstname), 'No student') AS student_name
                                      FROM attendance a
                                      LEFT JOIN computers c ON a.pc_id = c.pc_id
                                      LEFT JOIN students s ON a.students_id = s.students_id
                                      LEFT JOIN participants p ON a.participant_id = p.id
                                      WHERE a.monitoring_id = ?
                                      ORDER BY c.pc_number ASC, student_name ASC");
    $attendanceStmt->bind_param("i", $session['monitoring_id']);
    $attendanceStmt->execute();
    $attendanceResult = $attendanceStmt->get_result();

    $students = [];
    while ($row = $attendanceResult->fetch_assoc()) {
        $pcNumber = intval($row['pc_number'] ?? 0);
        if ($pcNumber) $usage[$pcNumber] = ($usage[$pcNumber] ?? 0) + 1;
        if ($pcNumber) {
            $labId = intval($session['lab_id']);
            if (!isset($usageByLab[$labId])) $usageByLab[$labId] = [];
            $usageByLab[$labId][$pcNumber] = ($usageByLab[$labId][$pcNumber] ?? 0) + 1;
        }
        $students[] = $row;
    }

    $session['students'] = $students;
    $session['pc_count'] = intval($session['max_pc_count'] ?? 40);
    $sessions[] = $session;
}

ksort($usage);
$usageRows = [];
foreach ($usage as $pcNumber => $count) {
    $usageRows[] = ['pc_number' => $pcNumber, 'usage_count' => $count];
}

$usageByLabRows = [];
foreach ($usageByLab as $labId => $pcRows) {
    ksort($pcRows);
    foreach ($pcRows as $pcNumber => $count) {
        $usageByLabRows[] = [
            'lab_id' => $labId,
            'lab_name' => 'Lab ' . $labId,
            'pc_number' => $pcNumber,
            'usage_count' => $count
        ];
    }
}

echo json_encode(['date' => $date, 'sessions' => $sessions, 'usage' => $usageRows, 'usage_by_lab' => $usageByLabRows]);
