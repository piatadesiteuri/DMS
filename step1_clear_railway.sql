-- PASUL 1: Curățarea completă a bazei de date railway
USE railway;
SET FOREIGN_KEY_CHECKS=0;

-- Șterge toate tabelele existente
DROP TABLE IF EXISTS deleted_document_versions;
DROP TABLE IF EXISTS deleted_documents;
DROP TABLE IF EXISTS deleted_folders;
DROP TABLE IF EXISTS deleted_versions;
DROP TABLE IF EXISTS document_drafts;
DROP TABLE IF EXISTS document_files;
DROP TABLE IF EXISTS document_log;
DROP TABLE IF EXISTS document_signatures;
DROP TABLE IF EXISTS document_statistics;
DROP TABLE IF EXISTS document_tag_relations;
DROP TABLE IF EXISTS document_tags;
DROP TABLE IF EXISTS document_types;
DROP TABLE IF EXISTS document_versions;
DROP TABLE IF EXISTS institutions;
DROP TABLE IF EXISTS notification_requests;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS table_document;
DROP TABLE IF EXISTS table_document_backup;
DROP TABLE IF EXISTS table_mot_cle;
DROP TABLE IF EXISTS table_previlege;
DROP TABLE IF EXISTS table_tag;
DROP TABLE IF EXISTS user;
DROP TABLE IF EXISTS user_logs;
DROP TABLE IF EXISTS folders;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS features;
DROP TABLE IF EXISTS institution_plans;
DROP TABLE IF EXISTS plan_features;

SET FOREIGN_KEY_CHECKS=1;

-- Verifică că totul este curat
SHOW TABLES;
SELECT 'RAILWAY DATABASE CLEARED' as status;
