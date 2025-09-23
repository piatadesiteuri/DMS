-- COPIEREA TUTUROR CELOR 26 DE TABELE DIN MYSQL WORKBENCH
-- Conectează-te la baza ta locală și rulează acest script

-- Pentru a rula: conectează-te la MySQL Workbench și execută în baza PSPD locală
-- Apoi copiază rezultatul și execută în Railway

-- PASUL 1: Creează toate tabelele în Railway
USE railway;
SET FOREIGN_KEY_CHECKS=0;

-- Tabele pentru documente șterse/backup
CREATE TABLE deleted_documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    original_id INT,
    document_name VARCHAR(255),
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_by INT,
    reason TEXT
);

CREATE TABLE deleted_document_versions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    original_version_id INT,
    document_id INT,
    version_number INT,
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_by INT
);

CREATE TABLE deleted_folders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    original_folder_id INT,
    folder_name VARCHAR(255),
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_by INT
);

CREATE TABLE deleted_versions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    original_id INT,
    document_id INT,
    version_info TEXT,
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabele pentru documente și versiuni
CREATE TABLE document_drafts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    document_id INT,
    draft_content LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE document_files (
    id INT PRIMARY KEY AUTO_INCREMENT,
    document_id INT,
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    document_id INT,
    user_id INT,
    action VARCHAR(100),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_signatures (
    id INT PRIMARY KEY AUTO_INCREMENT,
    document_id INT,
    user_id INT,
    signature_data LONGTEXT,
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_statistics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    document_id INT,
    views_count INT DEFAULT 0,
    downloads_count INT DEFAULT 0,
    last_viewed TIMESTAMP,
    last_downloaded TIMESTAMP
);

CREATE TABLE document_tag_relations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    document_id INT,
    tag_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_versions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    document_id INT,
    version_number INT,
    file_path VARCHAR(500),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE institution_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    institution_id INT,
    plan_id INT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE TABLE notification_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    title VARCHAR(255),
    message TEXT,
    type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE plan_features (
    id INT PRIMARY KEY AUTO_INCREMENT,
    plan_id INT,
    feature_id INT,
    enabled BOOLEAN DEFAULT TRUE
);

CREATE TABLE table_document (
    id_document INT PRIMARY KEY AUTO_INCREMENT,
    nom_document VARCHAR(255),
    type_document VARCHAR(100),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    institution_id INT,
    folder_id INT
);

CREATE TABLE table_document_backup (
    id INT PRIMARY KEY AUTO_INCREMENT,
    original_document_id INT,
    backup_data LONGTEXT,
    backup_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE table_mot_cle (
    id INT PRIMARY KEY AUTO_INCREMENT,
    mot_cle VARCHAR(255),
    document_id INT
);

CREATE TABLE table_previlege (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    privilege_type VARCHAR(100),
    resource_id INT,
    granted_by INT,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SET FOREIGN_KEY_CHECKS=1;

SELECT 'TOATE TABELELE AU FOST CREATE!' as status;
SHOW TABLES;
