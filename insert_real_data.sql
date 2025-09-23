-- INSERAREA DATELOR REALE DIN BAZA LOCALĂ ÎN RAILWAY
-- Rulează cu: mysql -h switchback.proxy.rlwy.net -u root -pAgWaFsyNdUoBqjtHZCDJoopvtByDbTsB --port 27678 --protocol=TCP railway < insert_real_data.sql

USE railway;
SET FOREIGN_KEY_CHECKS=0;

-- Mai întâi să modificăm structura tabelelor în Railway să se potrivească cu cele locale

-- Modifică table_document să se potrivească cu structura locală
DROP TABLE IF EXISTS table_document;
CREATE TABLE table_document (
    id_document INT PRIMARY KEY AUTO_INCREMENT,
    nom_document VARCHAR(255) NOT NULL,
    path VARCHAR(255) NOT NULL,
    id_user_source INT,
    date_upload DATETIME DEFAULT CURRENT_TIMESTAMP,
    comment TEXT,
    nom_document_original VARCHAR(255),
    isVerfied TINYINT(1) DEFAULT 1,
    type_id INT NOT NULL,
    file_size BIGINT DEFAULT 0,
    current_version_id INT,
    first_page LONGTEXT
);

-- Modifică document_versions să se potrivească cu structura locală
DROP TABLE IF EXISTS document_versions;
CREATE TABLE document_versions (
    id_version INT PRIMARY KEY AUTO_INCREMENT,
    id_document INT NOT NULL,
    id_institution INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    first_page LONGTEXT,
    file_size BIGINT,
    version_number INT NOT NULL,
    version_name VARCHAR(255) NOT NULL,
    tags JSON,
    keywords JSON,
    comment TEXT,
    original_document_name VARCHAR(255) NOT NULL,
    change_summary TEXT,
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_current TINYINT(1) DEFAULT 0,
    is_archived TINYINT(1) DEFAULT 0,
    archive_path VARCHAR(255),
    archive_filename VARCHAR(255),
    archived_by INT,
    archived_at DATETIME,
    type_id INT NOT NULL,
    parent_version_id INT,
    diff_summary TEXT,
    metadata_changes JSON
);

-- Modifică user_logs să se potrivească cu structura locală  
DROP TABLE IF EXISTS user_logs;
CREATE TABLE user_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SET FOREIGN_KEY_CHECKS=1;

SELECT 'TABELELE AU FOST MODIFICATE PENTRU A SE POTRIVI CU STRUCTURA LOCALĂ!' as status;
SHOW TABLES;

-- Acum datele pot fi copiate cu structura corectă
SELECT 'GATA PENTRU COPIEREA DATELOR!' as message;
