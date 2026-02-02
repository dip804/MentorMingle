CREATE DATABASE IF NOT EXISTS hospital_db;
USE hospital_db;

CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(15) NOT NULL,
    password VARCHAR(255) NOT NULL,
    last_login_time DATETIME DEFAULT NULL,
    logout_time DATETIME DEFAULT NULL
);
