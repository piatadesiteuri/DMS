-- COPIEREA TUTUROR TABELELOR RĂMASE DIN MYSQL WORKBENCH
USE railway;
SET FOREIGN_KEY_CHECKS=0;

-- Tabele pentru documente și versiuni
CREATE TABLE table_document LIKE PSPD.table_document;
INSERT INTO table_document SELECT * FROM PSPD.table_document;

CREATE TABLE document_versions LIKE PSPD.document_versions;
INSERT INTO document_versions SELECT * FROM PSPD.document_versions;

CREATE TABLE document_files LIKE PSPD.document_files;
INSERT INTO document_files SELECT * FROM PSPD.document_files;

CREATE TABLE document_drafts LIKE PSPD.document_drafts;
INSERT INTO document_drafts SELECT * FROM PSPD.document_drafts;

CREATE TABLE document_signatures LIKE PSPD.document_signatures;
INSERT INTO document_signatures SELECT * FROM PSPD.document_signatures;

CREATE TABLE document_statistics LIKE PSPD.document_statistics;
INSERT INTO document_statistics SELECT * FROM PSPD.document_statistics;

CREATE TABLE document_log LIKE PSPD.document_log;
INSERT INTO document_log SELECT * FROM PSPD.document_log;

-- Tabele pentru relații și tag-uri
CREATE TABLE document_tag_relations LIKE PSPD.document_tag_relations;
INSERT INTO document_tag_relations SELECT * FROM PSPD.document_tag_relations;

-- Tabele pentru backup și versiuni șterse
CREATE TABLE deleted_documents LIKE PSPD.deleted_documents;
INSERT INTO deleted_documents SELECT * FROM PSPD.deleted_documents;

CREATE TABLE deleted_document_versions LIKE PSPD.deleted_document_versions;
INSERT INTO deleted_document_versions SELECT * FROM PSPD.deleted_document_versions;

CREATE TABLE deleted_folders LIKE PSPD.deleted_folders;
INSERT INTO deleted_folders SELECT * FROM PSPD.deleted_folders;

CREATE TABLE deleted_versions LIKE PSPD.deleted_versions;
INSERT INTO deleted_versions SELECT * FROM PSPD.deleted_versions;

CREATE TABLE table_document_backup LIKE PSPD.table_document_backup;
INSERT INTO table_document_backup SELECT * FROM PSPD.table_document_backup;

-- Tabele pentru notificări și loguri
CREATE TABLE notification_requests LIKE PSPD.notification_requests;
INSERT INTO notification_requests SELECT * FROM PSPD.notification_requests;

CREATE TABLE user_logs LIKE PSPD.user_logs;
INSERT INTO user_logs SELECT * FROM PSPD.user_logs;

-- Tabele pentru planuri și instituții
CREATE TABLE institution_plans LIKE PSPD.institution_plans;
INSERT INTO institution_plans SELECT * FROM PSPD.institution_plans;

CREATE TABLE plan_features LIKE PSPD.plan_features;
INSERT INTO plan_features SELECT * FROM PSPD.plan_features;

-- Tabele pentru privilegii și tag-uri (tabele vechi)
CREATE TABLE table_mot_cle LIKE PSPD.table_mot_cle;
INSERT INTO table_mot_cle SELECT * FROM PSPD.table_mot_cle;

CREATE TABLE table_previlege LIKE PSPD.table_previlege;
INSERT INTO table_previlege SELECT * FROM PSPD.table_previlege;

CREATE TABLE table_tag LIKE PSPD.table_tag;
INSERT INTO table_tag SELECT * FROM PSPD.table_tag;

SET FOREIGN_KEY_CHECKS=1;

-- Verificare completă
SELECT 'ALL REMAINING TABLES COPIED' as status;
SHOW TABLES;

-- Numără toate înregistrările
SELECT 'Documents' as table_name, COUNT(*) as count FROM table_document
UNION ALL
SELECT 'Document Versions' as table_name, COUNT(*) as count FROM document_versions
UNION ALL
SELECT 'Document Files' as table_name, COUNT(*) as count FROM document_files
UNION ALL
SELECT 'User Logs' as table_name, COUNT(*) as count FROM user_logs
UNION ALL
SELECT 'Notifications' as table_name, COUNT(*) as count FROM notification_requests;

SELECT '🎉 TOATE TABELELE AU FOST COPIATE CU SUCCES!' as final_message;
