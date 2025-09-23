-- INSERAREA DATELOR DE EXEMPLU ÎN RAILWAY
-- Rulează cu: mysql -h switchback.proxy.rlwy.net -u root -pAgWaFsyNdUoBqjtHZCDJoopvtByDbTsB --port 27678 --protocol=TCP railway < insert_sample_data.sql

USE railway;
SET FOREIGN_KEY_CHECKS=0;

-- Inserează date de test în table_document
INSERT INTO table_document (id_document, nom_document, type_document, date_creation, created_by, institution_id, folder_id) VALUES
(1, 'Document Test 1', 'Official Document', NOW(), 25, 3, 1),
(2, 'Document Test 2', 'Shared Document', NOW(), 25, 3, 2),
(3, 'Document Test 3', 'General Document', NOW(), 25, 3, 3);

-- Inserează date în document_versions
INSERT INTO document_versions (id, document_id, version_number, file_path, created_by, created_at) VALUES
(1, 1, 1, './uploads/test1.pdf', 25, NOW()),
(2, 2, 1, './uploads/test2.pdf', 25, NOW()),
(3, 3, 1, './uploads/test3.pdf', 25, NOW());

-- Inserează date în document_files
INSERT INTO document_files (id, document_id, file_path, file_name, file_size, mime_type, uploaded_at) VALUES
(1, 1, './uploads/test1.pdf', 'test1.pdf', 1024000, 'application/pdf', NOW()),
(2, 2, './uploads/test2.pdf', 'test2.pdf', 2048000, 'application/pdf', NOW()),
(3, 3, './uploads/test3.pdf', 'test3.pdf', 1536000, 'application/pdf', NOW());

-- Inserează date în user_logs
INSERT INTO user_logs (id, user_id, action, details, ip_address, user_agent, created_at) VALUES
(1, 25, 'login', 'User logged in successfully', '192.168.1.100', 'Mozilla/5.0', NOW()),
(2, 25, 'upload', 'Document uploaded: test1.pdf', '192.168.1.100', 'Mozilla/5.0', NOW()),
(3, 25, 'view', 'Document viewed: test1.pdf', '192.168.1.100', 'Mozilla/5.0', NOW());

-- Inserează date în document_tag_relations
INSERT INTO document_tag_relations (id, document_id, tag_id, created_at) VALUES
(1, 1, 1, NOW()),
(2, 2, 2, NOW()),
(3, 3, 1, NOW());

-- Inserează date în notification_requests
INSERT INTO notification_requests (id, user_id, title, message, type, status, created_at) VALUES
(1, 25, 'Welcome', 'Welcome to the document management system!', 'info', 'unread', NOW()),
(2, 25, 'Document Ready', 'Your document has been processed', 'success', 'unread', NOW());

SET FOREIGN_KEY_CHECKS=1;

-- Verifică ce s-a inserat
SELECT 'VERIFICARE INSERARE DATELOR:' as status;
SELECT 'table_document' as tabel, COUNT(*) as inregistrari FROM table_document
UNION ALL SELECT 'document_versions', COUNT(*) FROM document_versions  
UNION ALL SELECT 'document_files', COUNT(*) FROM document_files
UNION ALL SELECT 'user_logs', COUNT(*) FROM user_logs
UNION ALL SELECT 'document_tag_relations', COUNT(*) FROM document_tag_relations
UNION ALL SELECT 'notification_requests', COUNT(*) FROM notification_requests;

SELECT 'DATELE AU FOST INSERATE CU SUCCES!' as final_message;
