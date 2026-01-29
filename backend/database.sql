-- SDB Database Schema for MySQL
-- Run this script to create the required tables

CREATE DATABASE IF NOT EXISTS sdb_database;
USE sdb_database;

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
    frequency VARCHAR(100),
    polarization VARCHAR(50),
    skew VARCHAR(50),
    band VARCHAR(50),
    noise_figure VARCHAR(50),
    local_oscillator VARCHAR(100),
    gain VARCHAR(50),
    test_result VARCHAR(50) DEFAULT 'Not Tested',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Switches table
CREATE TABLE IF NOT EXISTS switches (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    ports INT DEFAULT 2,
    frequency VARCHAR(100),
    isolation VARCHAR(50),
    insertion_loss VARCHAR(50),
    protocol VARCHAR(50),
    power_consumption VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Motors table
CREATE TABLE IF NOT EXISTS motors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    position VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Positioned',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Unicables table
CREATE TABLE IF NOT EXISTS unicables (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    user_bands INT DEFAULT 1,
    frequency VARCHAR(100),
    protocol VARCHAR(50),
    power_consumption VARCHAR(50),
    compatibility VARCHAR(255),
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
INSERT INTO projects (id, name, description, created_by) 
VALUES ('default-project', 'Default Project', 'Default satellite equipment project', 'admin')
ON DUPLICATE KEY UPDATE name = name;
