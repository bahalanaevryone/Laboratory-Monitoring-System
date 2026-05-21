<?php
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

session_start();
require_once '../config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['users_id'])) {
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

$stmt = $conn->prepare("SELECT students_id FROM students WHERE users_id = ?");
$stmt->bind_param("i", $_SESSION['users_id']);
$stmt->execute();
$result = $stmt->get_result();
$student = $result->fetch_assoc();

$students_id = intval($student['students_id'] ?? 0);

$query = "SELECT
            ps.session_id,
            ps.monitoring_id,
            ps.creator_id,
            ps.title,
            m.lab_id,
            m.start_time,
            m.end_time,
            m.created_at as session_date,
            l.lab_name,
            (SELECT COUNT(*) FROM attendance WHERE monitoring_id = m.monitoring_id) as total_students
          FROM private_sessions ps
          LEFT JOIN monitoring m ON ps.monitoring_id = m.monitoring_id
          LEFT JOIN laboratories l ON m.lab_id = l.lab_id
          WHERE ps.creator_id = ?
          ORDER BY m.created_at DESC, m.start_time DESC, ps.session_id DESC";

$stmt = $conn->prepare($query);
$stmt->bind_param("i", $_SESSION['users_id']);
$stmt->execute();
$result = $stmt->get_result();

$sessions = [];
while ($row = $result->fetch_assoc()) {
    $att_query = "SELECT
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
                    c.pc_number,
                    a.participant_id
                  FROM attendance a
                  LEFT JOIN students s ON a.students_id = s.students_id
                  LEFT JOIN participants p ON a.participant_id = p.id
                  LEFT JOIN private_sessions ps ON a.monitoring_id = ps.monitoring_id
                  LEFT JOIN computers c ON a.pc_id = c.pc_id
                  WHERE a.monitoring_id = ?
                  ORDER BY a.attendance_time, a.attendance_id";

    $att_stmt = $conn->prepare($att_query);
    $att_stmt->bind_param("i", $row['monitoring_id']);
    $att_stmt->execute();
    $att_result = $att_stmt->get_result();

    $participants = [];
    while ($att = $att_result->fetch_assoc()) {
        $student_name = trim($att['student_name']);
        if ($student_name === '' || $student_name === 'Unnamed Participant') {
            if ($att['participant_firstname'] || $att['participant_lastname']) {
                $student_name = trim($att['participant_firstname'] . ' ' . $att['participant_lastname']);
            } elseif ($att['student_first_name'] || $att['student_last_name']) {
                $student_name = trim($att['student_first_name'] . ' ' . $att['student_last_name']);
            }
        }

        $participants[] = [
            'student_name' => $student_name ?: 'Unnamed Participant',
            'firstname' => $att['participant_firstname'] ?: $att['student_first_name'] ?: '',
            'lastname' => $att['participant_lastname'] ?: $att['student_last_name'] ?: '',
            'pc_number' => $att['pc_number'],
        ];
    }

    $row['participants'] = $participants;
    $row['participants_preview'] = implode(
        ', ',
        array_map(
            fn($participant) => $participant['student_name'] . ' (PC ' . $participant['pc_number'] . ')',
            $participants
        )
    );
    $row['start_time_formatted'] = date('h:i A', strtotime($row['start_time']));
    $row['end_time_formatted'] = date('h:i A', strtotime($row['end_time']));

    $sessions[] = $row;
}

echo json_encode($sessions);
