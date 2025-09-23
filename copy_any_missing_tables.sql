-- Script pentru a copia ORICE tabel care lipsește din PSPD în railway
-- Încearcă să copieze tabele comune care ar putea exista

USE railway;
SET FOREIGN_KEY_CHECKS=0;

-- Încearcă să copieze tabele care ar putea exista (ignoră erorile)
-- Tabele pentru documente
CREATE TABLE IF NOT EXISTS table_document LIKE PSPD.table_document;
INSERT IGNORE INTO table_document SELECT * FROM PSPD.table_document;

CREATE TABLE IF NOT EXISTS document_versions LIKE PSPD.document_versions;
INSERT IGNORE INTO document_versions SELECT * FROM PSPD.document_versions;

CREATE TABLE IF NOT EXISTS document_files LIKE PSPD.document_files;
INSERT IGNORE INTO document_files SELECT * FROM PSPD.document_files;

-- Tabele pentru loguri
CREATE TABLE IF NOT EXISTS user_logs LIKE PSPD.user_logs;
INSERT IGNORE INTO user_logs SELECT * FROM PSPD.user_logs;

CREATE TABLE IF NOT EXISTS document_log LIKE PSPD.document_log;
INSERT IGNORE INTO document_log SELECT * FROM PSPD.document_log;

-- Tabele pentru notificări
CREATE TABLE IF NOT EXISTS notification_requests LIKE PSPD.notification_requests;
INSERT IGNORE INTO notification_requests SELECT * FROM PSPD.notification_requests;

-- Tabele pentru relații
CREATE TABLE IF NOT EXISTS document_tag_relations LIKE PSPD.document_tag_relations;
INSERT IGNORE INTO document_tag_relations SELECT * FROM PSPD.document_tag_relations;

-- Tabele pentru planuri instituționale
CREATE TABLE IF NOT EXISTS institution_plans LIKE PSPD.institution_plans;
INSERT IGNORE INTO institution_plans SELECT * FROM PSPD.institution_plans;

CREATE TABLE IF NOT EXISTS plan_features LIKE PSPD.plan_features;
INSERT IGNORE INTO plan_features SELECT * FROM PSPD.plan_features;

-- Tabele pentru backup și șterse
CREATE TABLE IF NOT EXISTS deleted_documents LIKE PSPD.deleted_documents;
INSERT IGNORE INTO deleted_documents SELECT * FROM PSPD.deleted_documents;

CREATE TABLE IF NOT EXISTS deleted_folders LIKE PSPD.deleted_folders;
INSERT IGNORE INTO deleted_folders SELECT * FROM PSPD.deleted_folders;

CREATE TABLE IF NOT EXISTS deleted_versions LIKE PSPD.deleted_versions;
INSERT IGNORE INTO deleted_versions SELECT * FROM PSPD.deleted_versions;

CREATE TABLE IF NOT EXISTS deleted_document_versions LIKE PSPD.deleted_document_versions;
INSERT IGNORE INTO deleted_document_versions SELECT * FROM PSPD.deleted_document_versions;

-- Tabele pentru drafturi și semnături
CREATE TABLE IF NOT EXISTS document_drafts LIKE PSPD.document_drafts;
INSERT IGNORE INTO document_drafts SELECT * FROM PSPD.document_drafts;

CREATE TABLE IF NOT EXISTS document_signatures LIKE PSPD.document_signatures;
INSERT IGNORE INTO document_signatures SELECT * FROM PSPD.document_signatures;

CREATE TABLE IF NOT EXISTS document_statistics LIKE PSPD.document_statistics;
INSERT IGNORE INTO document_statistics SELECT * FROM PSPD.document_statistics;

-- Tabele vechi (dacă există)
CREATE TABLE IF NOT EXISTS table_mot_cle LIKE PSPD.table_mot_cle;
INSERT IGNORE INTO table_mot_cle SELECT * FROM PSPD.table_mot_cle;

CREATE TABLE IF NOT EXISTS table_previlege LIKE PSPD.table_previlege;
INSERT IGNORE INTO table_previlege SELECT * FROM PSPD.table_previlege;

CREATE TABLE IF NOT EXISTS table_tag LIKE PSPD.table_tag;
INSERT IGNORE INTO table_tag SELECT * FROM PSPD.table_tag;

CREATE TABLE IF NOT EXISTS table_document_backup LIKE PSPD.table_document_backup;
INSERT IGNORE INTO table_document_backup SELECT * FROM PSPD.table_document_backup;

SET FOREIGN_KEY_CHECKS=1;

-- Verificare finală - arată toate tabelele copiate
SELECT 'TABELE COPIATE CU SUCCES:' as status;
SHOW TABLES;

-- Numără înregistrările pentru tabelele noi
SELECT 'VERIFICARE TABELE NOI:' as info;
SELECT 
    TABLE_NAME, 
    TABLE_ROWS 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'railway' 
    AND TABLE_ROWS > 0
ORDER BY TABLE_ROWS DESC;
