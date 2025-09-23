-- COPIEREA DATELOR DIN BAZA LOCALĂ PSPD ÎN RAILWAY
-- Rulează cu: mysql -u root -p < copy_data_from_local.sql

-- Conectează-te la baza locală PSPD
USE PSPD;

-- Exportă toate datele din tabelele care au înregistrări
-- Pentru table_document
SELECT 'Exporting table_document...' as status;
SELECT CONCAT(
    'INSERT INTO railway.table_document VALUES (',
    IFNULL(id_document, 'NULL'), ',',
    IFNULL(CONCAT('"', REPLACE(nom_document, '"', '\\"'), '"'), 'NULL'), ',',
    IFNULL(CONCAT('"', type_document, '"'), 'NULL'), ',',
    IFNULL(CONCAT('"', date_creation, '"'), 'NULL'), ',',
    IFNULL(created_by, 'NULL'), ',',
    IFNULL(institution_id, 'NULL'), ',',
    IFNULL(folder_id, 'NULL'),
    ');'
) as sql_statement FROM table_document;

-- Pentru document_versions
SELECT 'Exporting document_versions...' as status;
SELECT CONCAT(
    'INSERT INTO railway.document_versions VALUES (',
    IFNULL(id, 'NULL'), ',',
    IFNULL(document_id, 'NULL'), ',',
    IFNULL(version_number, 'NULL'), ',',
    IFNULL(CONCAT('"', REPLACE(file_path, '"', '\\"'), '"'), 'NULL'), ',',
    IFNULL(created_by, 'NULL'), ',',
    IFNULL(CONCAT('"', created_at, '"'), 'NULL'),
    ');'
) as sql_statement FROM document_versions;

-- Pentru document_files
SELECT 'Exporting document_files...' as status;
SELECT CONCAT(
    'INSERT INTO railway.document_files VALUES (',
    IFNULL(id, 'NULL'), ',',
    IFNULL(document_id, 'NULL'), ',',
    IFNULL(CONCAT('"', REPLACE(file_path, '"', '\\"'), '"'), 'NULL'), ',',
    IFNULL(CONCAT('"', REPLACE(file_name, '"', '\\"'), '"'), 'NULL'), ',',
    IFNULL(file_size, 'NULL'), ',',
    IFNULL(CONCAT('"', mime_type, '"'), 'NULL'), ',',
    IFNULL(CONCAT('"', uploaded_at, '"'), 'NULL'),
    ');'
) as sql_statement FROM document_files;

-- Pentru user_logs
SELECT 'Exporting user_logs...' as status;
SELECT CONCAT(
    'INSERT INTO railway.user_logs VALUES (',
    IFNULL(id, 'NULL'), ',',
    IFNULL(user_id, 'NULL'), ',',
    IFNULL(CONCAT('"', REPLACE(action, '"', '\\"'), '"'), 'NULL'), ',',
    IFNULL(CONCAT('"', REPLACE(details, '"', '\\"'), '"'), 'NULL'), ',',
    IFNULL(CONCAT('"', ip_address, '"'), 'NULL'), ',',
    IFNULL(CONCAT('"', REPLACE(user_agent, '"', '\\"'), '"'), 'NULL'), ',',
    IFNULL(CONCAT('"', created_at, '"'), 'NULL'),
    ');'
) as sql_statement FROM user_logs;

SELECT 'EXPORT COMPLETED - Copy the INSERT statements above and run them in Railway!' as final_message;
