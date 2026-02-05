-- SDB Database Schema for MySQL
-- Compatible with MySQL 5.x and above
-- Run this script to create the required tables

CREATE DATABASE IF NOT EXISTS sdb_database;
USE sdb_database;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_admin TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT NULL,
    updated_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Insert default users
INSERT INTO users (id, username, password, is_admin, created_at, updated_at) VALUES 
('admin-001', 'admin', 'admin123', 1, NOW(), NOW()),
('user-001', 'user', 'user123', 0, NOW(), NOW()),
('operator-001', 'operator', 'op123', 0, NOW(), NOW())
ON DUPLICATE KEY UPDATE username = username;

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by VARCHAR(100),
    created_at DATETIME DEFAULT NULL,
    updated_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- LNBs table (Updated: removed lnb_type, repeat_mode; added lo1_high, lo1_low)
CREATE TABLE IF NOT EXISTS lnbs (
    id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    low_frequency VARCHAR(100) DEFAULT '',
    high_frequency VARCHAR(100) DEFAULT '',
    lo1_high VARCHAR(100) DEFAULT '',
    lo1_low VARCHAR(100) DEFAULT '',
    band_type VARCHAR(100) DEFAULT '',
    power_control VARCHAR(100) DEFAULT '',
    v_control VARCHAR(100) DEFAULT '',
    khz_option VARCHAR(100) DEFAULT '',
    created_at DATETIME DEFAULT NULL,
    updated_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Switches table (Updated: removed name column, new types with JSON options)
CREATE TABLE IF NOT EXISTS switches (
    id VARCHAR(50) NOT NULL,
    switch_type VARCHAR(100) DEFAULT '',
    switch_options TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT NULL,
    updated_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Motors table (Updated: removed name, simplified to two types)
CREATE TABLE IF NOT EXISTS motors (
    id VARCHAR(50) NOT NULL,
    motor_type VARCHAR(100) DEFAULT '',
    position VARCHAR(100) DEFAULT '',
    longitude VARCHAR(100) DEFAULT '',
    latitude VARCHAR(100) DEFAULT '',
    east_west VARCHAR(50) DEFAULT '',
    north_south VARCHAR(50) DEFAULT '',
    created_at DATETIME DEFAULT NULL,
    updated_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Unicables table (Updated: DSCR/DCSS types with dynamic slots)
CREATE TABLE IF NOT EXISTS unicables (
    id VARCHAR(50) NOT NULL,
    unicable_type VARCHAR(100) DEFAULT '',
    status VARCHAR(50) DEFAULT 'OFF',
    port VARCHAR(50) DEFAULT '',
    if_slots TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT NULL,
    updated_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Satellites table
CREATE TABLE IF NOT EXISTS satellites (
    id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(50),
    orbital_position VARCHAR(50),
    polarization VARCHAR(50),
    age VARCHAR(100),
    direction VARCHAR(50),
    mapped_lnb VARCHAR(50),
    mapped_switch VARCHAR(50),
    mapped_motor VARCHAR(50),
    mapped_unicable VARCHAR(50),
    created_at DATETIME DEFAULT NULL,
    updated_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Carriers table (linked to satellites)
CREATE TABLE IF NOT EXISTS carriers (
    id VARCHAR(50) NOT NULL,
    satellite_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    frequency VARCHAR(100),
    polarization VARCHAR(50),
    symbol_rate VARCHAR(50),
    fec VARCHAR(50),
    fec_mode VARCHAR(50),
    factory_default TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT NULL,
    updated_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_satellite_id (satellite_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Services table (linked to carriers, added audio_pid)
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(50) NOT NULL,
    carrier_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    frequency VARCHAR(100),
    service_type VARCHAR(50),
    service_id_number VARCHAR(50),
    video_pid VARCHAR(50),
    audio_pid VARCHAR(50),
    pcr_pid VARCHAR(50),
    program_number VARCHAR(50),
    fav_group VARCHAR(50),
    factory_default TINYINT(1) DEFAULT 0,
    preference VARCHAR(50),
    scramble TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT NULL,
    updated_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_carrier_id (carrier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Project Equipment Mappings table
CREATE TABLE IF NOT EXISTS project_mappings (
    id VARCHAR(50) NOT NULL,
    project_id VARCHAR(50) NOT NULL,
    equipment_type VARCHAR(50) NOT NULL,
    equipment_id VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_mapping (project_id, equipment_type, equipment_id),
    KEY idx_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Project Builds table (one project can have multiple builds)
CREATE TABLE IF NOT EXISTS project_builds (
    id VARCHAR(50) NOT NULL,
    project_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    xml_data LONGTEXT,
    created_by VARCHAR(100),
    created_at DATETIME DEFAULT NULL,
    updated_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Build Equipment Mappings table (maps equipment to specific builds)
CREATE TABLE IF NOT EXISTS build_mappings (
    id VARCHAR(50) NOT NULL,
    build_id VARCHAR(50) NOT NULL,
    equipment_type VARCHAR(50) NOT NULL,
    equipment_id VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_build_mapping (build_id, equipment_type, equipment_id),
    KEY idx_build_id (build_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Activities/History table
CREATE TABLE IF NOT EXISTS activities (
    id VARCHAR(50) NOT NULL,
    username VARCHAR(100) NOT NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    project_id VARCHAR(50),
    timestamp DATETIME DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_timestamp (timestamp),
    KEY idx_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Insert default project
INSERT INTO projects (id, name, description, created_by, created_at, updated_at) 
VALUES ('default-project', 'Default Project', 'Default satellite equipment project', 'admin', NOW(), NOW())
ON DUPLICATE KEY UPDATE name = name;
