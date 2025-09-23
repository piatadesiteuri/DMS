-- COPIEREA DATELOR CU STRUCTURA CORECTĂ
-- Rulează în MySQL Workbench conectat la baza PSPD locală

USE PSPD;

-- Generează INSERT-uri pentru table_document cu coloanele corecte
SELECT CONCAT(
    'INSERT INTO railway.table_document (id_document, nom_document, path, id_user_source, date_upload, comment, nom_document_original, isVerfied, type_id, file_size, current_version_id, first_page) VALUES (',
    IFNULL(id_document, 'NULL'), ',',
    IFNULL(CONCAT('"', REPLACE(nom_document, '"', '\\"'), '"'), 'NULL'), ',',
    IFNULL(CONCAT('"', REPLACE(path, '"', '\\"'), '"'), 'NULL'), ',',
    IFNULL(id_user_source, 'NULL'), ',',
    IFNULL(CONCAT('"', date_upload, '"'), 'NULL'), ',',
    IFNULL(CONCAT('"', REPLACE(IFNULL(comment, ''), '"', '\\"'), '"'), 'NULL'), ',',
    IFNULL(CONCAT('"', REPLACE(IFNULL(nom_document_original, ''), '"', '\\"'), '"'), 'NULL'), ',',
    IFNULL(isVerfied, '1'), ',',
    IFNULL(type_id, 'NULL'), ',',
    IFNULL(file_size, '0'), ',',
    IFNULL(current_version_id, 'NULL'), ',',
    IFNULL(CONCAT('"', REPLACE(IFNULL(first_page, ''), '"', '\\"'), '"'), 'NULL'),
    ');'
) as sql_statement FROM table_document LIMIT 10;

-- Generează INSERT-uri pentru document_versions
SELECT CONCAT(
    'INSERT INTO railway.document_versions (id_version, id_document, id_institution, file_path, version_number, version_name, original_document_name, created_by, created_at, type_id) VALUES (',
    IFNULL(id_version, 'NULL'), ',',
    IFNULL(id_document, 'NULL'), ',',
    IFNULL(id_institution, 'NULL'), ',',
    IFNULL(CONCAT('"', REPLACE(file_path, '"', '\\"'), '"'), 'NULL'), ',',
    IFNULL(version_number, 'NULL'), ',',
    IFNULL(CONCAT('"', REPLACE(version_name, '"', '\\"'), '"'), 'NULL'), ',',
    IFNULL(CONCAT('"', REPLACE(original_document_name, '"', '\\"'), '"'), 'NULL'), ',',
    IFNULL(created_by, 'NULL'), ',',
    IFNULL(CONCAT('"', created_at, '"'), 'NULL'), ',',
    IFNULL(type_id, 'NULL'),
    ');'
) as sql_statement FROM document_versions LIMIT 10;

-- Generează INSERT-uri pentru user_logs
SELECT CONCAT(
    'INSERT INTO railway.user_logs (id, user_id, action, details, created_at) VALUES (',
    IFNULL(id, 'NULL'), ',',
    IFNULL(user_id, 'NULL'), ',',
    IFNULL(CONCAT('"', REPLACE(action, '"', '\\"'), '"'), 'NULL'), ',',
    IFNULL(CONCAT('"', REPLACE(IFNULL(details, ''), '"', '\\"'), '"'), 'NULL'), ',',
    IFNULL(CONCAT('"', created_at, '"'), 'NULL'),
    ');'
) as sql_statement FROM user_logs LIMIT 10;

SELECT 'COPIAZĂ INSERT-URILE DE MAI SUS ȘI RULEAZĂ-LE ÎN RAILWAY!' as final_message;
