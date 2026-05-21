<?php
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

session_start();
require_once '../config.php';

header('Content-Type: application/json');

$query = "
    SELECT
        u.users_id,
        u.email,
        u.role,
        CASE
            WHEN u.role = 'student' THEN CONCAT(s.first_name, ' ', s.last_name)
            WHEN u.role = 'instructor' THEN CONCAT(i.first_name, ' ', i.last_name)
            WHEN u.role = 'custodian' THEN CONCAT(c.first_name, ' ', c.last_name)
            ELSE u.email
        END AS name
        ,
        CASE
            WHEN u.role = 'student' THEN s.course
            ELSE NULL
        END AS course,
        CASE
            WHEN u.role = 'student' THEN s.year_level
            ELSE NULL
        END AS year_level,
        CASE
            WHEN u.role = 'student' THEN s.section
            ELSE NULL
        END AS section,
        CASE
            WHEN u.role = 'student' THEN s.profile_picture
            WHEN u.role = 'instructor' THEN i.profile_picture
            WHEN u.role = 'custodian' THEN c.profile_picture
            ELSE NULL
        END AS profile_picture
    FROM users u
    LEFT JOIN students s ON u.users_id = s.users_id
    LEFT JOIN instructors i ON u.users_id = i.users_id
    LEFT JOIN custodians c ON u.users_id = c.users_id
    ORDER BY u.users_id ASC
";

$result = $conn->query($query);
$users = [];

while ($row = $result->fetch_assoc()) {
    $users[] = $row;
}

echo json_encode($users);
?>
