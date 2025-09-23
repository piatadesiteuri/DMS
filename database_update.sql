-- Database Update Script for Action Logging
-- This script updates the document_statistics table to support delete actions

-- 1. Update document_statistics enum to include delete action
ALTER TABLE `document_statistics` 
MODIFY `action_type` enum('download','view','upload','delete') NOT NULL;

-- 2. Show current logging structure for reference
-- user_logs table structure (already exists and correct):
-- CREATE TABLE `user_logs` (
--   `id` int NOT NULL AUTO_INCREMENT,
--   `user_id` int NOT NULL,
--   `action` varchar(255) NOT NULL,
--   `details` text,
--   `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
--   PRIMARY KEY (`id`),
--   KEY `user_id` (`user_id`),
--   CONSTRAINT `user_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id_user`)
-- ) ENGINE=InnoDB;

-- document_statistics table structure (updated):
-- CREATE TABLE `document_statistics` (
--   `id` int NOT NULL AUTO_INCREMENT,
--   `id_document` int DEFAULT NULL,
--   `id_user` int NOT NULL,
--   `action_type` enum('download','view','upload','delete') NOT NULL,
--   `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
--   PRIMARY KEY (`id`),
--   KEY `id_document` (`id_document`),
--   KEY `id_user` (`id_user`),
--   CONSTRAINT `document_statistics_ibfk_1` FOREIGN KEY (`id_document`) REFERENCES `table_document` (`id_document`),
--   CONSTRAINT `document_statistics_ibfk_2` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`)
-- ) ENGINE=InnoDB;

-- Summary of correct logging implementation:
-- LOGIN/LOGOUT actions -> user_logs table
-- DOWNLOAD/VIEW/UPLOAD/DELETE document actions -> document_statistics table 