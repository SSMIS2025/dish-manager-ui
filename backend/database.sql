-- SDB Database Schema for MySQL
-- Run this script to create the required tables

CREATE DATABASE IF NOT EXISTS sdb_database;
USE sdb_database;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    is_admin TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default users
INSERT INTO users (id, username, password, is_admin) VALUES 
('admin-001', 'admin', 'admin123', 1),
('user-001', 'user', 'user123', 0),
('operator-001', 'operator', 'op123', 0)
ON DUPLICATE KEY UPDATE username = username;

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- LNBs table
CREATE TABLE IF NOT EXISTS lnbs (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    lnb_type VARCHAR(100),
    band_type VARCHAR(100),
    power_control VARCHAR(100),
    v_control VARCHAR(100),
    repeat_mode VARCHAR(100),
    khz_option VARCHAR(100),
    low_frequency VARCHAR(100),
    high_frequency VARCHAR(100),
    test_result VARCHAR(50) DEFAULT 'Not Tested',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Switches table
CREATE TABLE IF NOT EXISTS switches (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    switch_type VARCHAR(100),
    switch_configuration VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Motors table
CREATE TABLE IF NOT EXISTS motors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    position VARCHAR(50),
    longitude VARCHAR(50),
    latitude VARCHAR(50),
    east_west VARCHAR(20),
    north_south VARCHAR(20),
    status VARCHAR(50) DEFAULT 'Positioned',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Unicables table
CREATE TABLE IF NOT EXISTS unicables (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    status VARCHAR(50),
    port VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Satellites table
CREATE TABLE IF NOT EXISTS satellites (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(50),
    age VARCHAR(100),
    direction VARCHAR(50),
    mapped_lnb VARCHAR(50),
    mapped_switch VARCHAR(50),
    mapped_motor VARCHAR(50),
    mapped_unicable VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Carriers table (linked to satellites)
CREATE TABLE IF NOT EXISTS carriers (
    id VARCHAR(50) PRIMARY KEY,
    satellite_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    frequency VARCHAR(100),
    polarization VARCHAR(50),
    symbol_rate VARCHAR(50),
    fec VARCHAR(50),
    fec_mode VARCHAR(50),
    factory_default TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (satellite_id) REFERENCES satellites(id) ON DELETE CASCADE
);

-- Services table (linked to carriers)
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(50) PRIMARY KEY,
    carrier_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    frequency VARCHAR(100),
    video_pid VARCHAR(50),
    pcr_pid VARCHAR(50),
    program_number VARCHAR(50),
    fav_group VARCHAR(50),
    factory_default TINYINT(1) DEFAULT 0,
    preference VARCHAR(50),
    scramble TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (carrier_id) REFERENCES carriers(id) ON DELETE CASCADE
);

-- Project Equipment Mappings table
CREATE TABLE IF NOT EXISTS project_mappings (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    equipment_type VARCHAR(50) NOT NULL,
    equipment_id VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_mapping (project_id, equipment_type, equipment_id)
);

-- Activities/History table
CREATE TABLE IF NOT EXISTS activities (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    project_id VARCHAR(50),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp),
    INDEX idx_project (project_id)
);

-- Insert default project
INSERT INTO projects (id, name, description, created_by, created_at, updated_at) 
VALUES ('default-project', 'Default Project', 'Default satellite equipment project', 'admin', NOW(), NOW())
ON DUPLICATE KEY UPDATE name = name;
