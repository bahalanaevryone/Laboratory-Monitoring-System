<?php
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
session_start();
require_once '../config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $monitoring_id = isset($_POST['monitoring_id']) ? intval($_POST['monitoring_id']) : 0;

    if (!$monitoring_id) {
        echo json_encode(['success' => false, 'message' => 'Invalid monitoring ID']);
        exit();
    }

    // Start transaction
    $conn->begin_transaction();

    try {
        // First delete from private_sessions if exists
        $stmt = $conn->prepare("DELETE FROM private_sessions WHERE monitoring_id = ?");
        $stmt->bind_param("i", $monitoring_id);
        $stmt->execute();

        // Then delete attendance records
        $stmt = $conn->prepare("DELETE FROM attendance WHERE monitoring_id = ?");
        $stmt->bind_param("i", $monitoring_id);
        $stmt->execute();

        // Then delete monitoring_pcs records
        $stmt = $conn->prepare("DELETE FROM monitoring_pcs WHERE monitoring_id = ?");
        $stmt->bind_param("i", $monitoring_id);
        $stmt->execute();

        // Finally delete monitoring
        $stmt = $conn->prepare("DELETE FROM monitoring WHERE monitoring_id = ?");
        $stmt->bind_param("i", $monitoring_id);

        if ($stmt->execute()) {
            $conn->commit();
            echo json_encode(['success' => true, 'message' => 'Monitoring session deleted successfully']);
        } else {
            throw new Exception('Failed to delete monitoring session');
        }
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
}
