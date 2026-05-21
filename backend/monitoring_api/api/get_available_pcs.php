<?php
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
require_once '../config.php';

$monitoring_id = isset($_GET['monitoring_id']) ? intval($_GET['monitoring_id']) : 0;

if (!$monitoring_id) {
    echo json_encode(['error' => 'Invalid monitoring ID']);
    exit();
}

// Get session info including max_pc_count
$session_stmt = $conn->prepare("SELECT max_pc_count FROM monitoring WHERE monitoring_id = ?");
$session_stmt->bind_param("i", $monitoring_id);
$session_stmt->execute();
$session_result = $session_stmt->get_result();
$session_data = $session_result->fetch_assoc();
$max_pc_count = $session_data['max_pc_count'] ?? 40;

// Get taken PCs for this session (by PC number)
$taken_stmt = $conn->prepare("
    SELECT c.pc_number 
    FROM attendance a 
    JOIN computers c ON a.pc_id = c.pc_id 
    WHERE a.monitoring_id = ?
");
$taken_stmt->bind_param("i", $monitoring_id);
$taken_stmt->execute();
$taken_result = $taken_stmt->get_result();
$taken_pc_numbers = [];
while ($row = $taken_result->fetch_assoc()) {
    $taken_pc_numbers[] = $row['pc_number'];
}

// Get enabled PCs from monitoring_pcs (by PC number)
$enabled_stmt = $conn->prepare("
    SELECT c.pc_number 
    FROM monitoring_pcs mp
    JOIN computers c ON mp.pc_id = c.pc_id
    WHERE mp.monitoring_id = ?
");
$enabled_stmt->bind_param("i", $monitoring_id);
$enabled_stmt->execute();
$enabled_result = $enabled_stmt->get_result();
$enabled_pc_numbers = [];
while ($row = $enabled_result->fetch_assoc()) {
    $enabled_pc_numbers[] = $row['pc_number'];
}

// Generate all PCs from 1 to max_pc_count
$all_pcs = [];
$available_pcs = [];

for ($i = 1; $i <= $max_pc_count; $i++) {
    $all_pcs[] = ['pc_id' => $i, 'pc_number' => $i];

    // PC is available if it's enabled AND not taken
    $is_enabled = in_array($i, $enabled_pc_numbers);
    $is_taken = in_array($i, $taken_pc_numbers);

    if ($is_enabled && !$is_taken) {
        $available_pcs[] = ['pc_id' => $i, 'pc_number' => $i];
    }
}

header('Content-Type: application/json');
echo json_encode([
    'pcs' => $available_pcs,
    'all_pcs' => $all_pcs,
    'max_pc' => $max_pc_count,
    'enabled_pcs' => $enabled_pc_numbers,
    'taken_pcs' => $taken_pc_numbers
]);
