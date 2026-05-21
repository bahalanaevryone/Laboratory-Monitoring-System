<?php
date_default_timezone_set('Asia/Manila'); // para sa Philippines time

$host = "localhost";
$user = "root";
$password = "";
$database = "monitoring_system";

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT); //para sa Enable error reporting for debugging

$conn = new mysqli($host, $user, $password, $database);

if ($conn->connect_error) {
    die("Connection Failed: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4"); //Set charset to UTF-8

// i set MySQL timezone to match PHP
$conn->query("SET time_zone = '+08:00'"); // For Philippines (UTC+8)

// Disable error display in API responses to keep JSON output clean
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
