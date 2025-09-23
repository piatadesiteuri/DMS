-- SQL commands to run in Railway MySQL Dashboard
-- Copy and paste these into Railway Database interface

-- First create the PSPD database if it doesn't exist
CREATE DATABASE IF NOT EXISTS PSPD;
USE PSPD;

-- Create user table
CREATE TABLE IF NOT EXISTS user (
    id_user INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    prenom VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    accepted BOOLEAN DEFAULT FALSE,
    upload BOOLEAN DEFAULT FALSE,
    download BOOLEAN DEFAULT FALSE,
    print BOOLEAN DEFAULT FALSE,
    diffuse BOOLEAN DEFAULT FALSE,
    roles VARCHAR(255),
    institution_id INT,
    phone_number VARCHAR(50),
    created_by INT
);

-- Insert your user account
INSERT INTO user (id_user, nom, prenom, email, password, verified, accepted, upload, download, print, diffuse, roles, phone_number, created_by) VALUES 
(25, 'Rusescu', 'Raul', 'raulrusescu@gmail.com', '$2b$10$O1b.JK3ir2ooEu5sfOtoWuNF9tsTdwbfS0/r2wv7hcKyT0CU1bYpa', 1, 1, 1, 1, 1, 1, 'user', 20, '0734342342');

-- Insert admin account
INSERT INTO user (id_user, nom, prenom, email, password, verified, accepted, upload, download, print, diffuse, roles, created_by) VALUES 
(1, 'Admin', 'System', 'admin@example.com', '$2b$10$qqka0E2SE1vltY1WfhwBleZ0R9IGD7iHVSI2b84ZIMcPiSXki51z', 1, 1, 1, 1, 1, 1, 'admin', NULL);

-- Insert superadmin account  
INSERT INTO user (id_user, nom, prenom, email, password, verified, accepted, upload, download, print, diffuse, roles, created_by) VALUES 
(20, 'Super', 'Admin', 'superadmin@example.com', '$2b$10$t2mah5/R2eA/UTJCBD2w/.26tkqwkNKo9N.e1Xwp6tO4HSGrn9.Ty', 1, 1, 1, 1, 1, 1, 'superadmin', NULL);

-- Verify users were inserted
SELECT id_user, nom, prenom, email, roles FROM user;
