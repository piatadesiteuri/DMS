#!/bin/bash

echo "🚀 Starting DMS application with database initialization..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
sleep 10

# Create PSPD database if it doesn't exist
echo "📋 Creating PSPD database..."
mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD --port $MYSQL_PORT --protocol=TCP -e "CREATE DATABASE IF NOT EXISTS PSPD;" 2>/dev/null || echo "Database creation failed or already exists"

# Create all tables and populate with essential data
echo "📝 Creating tables and populating data..."
mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD --port $MYSQL_PORT --protocol=TCP PSPD << 'EOF'

-- Create user table
CREATE TABLE IF NOT EXISTS user (
  id_user int NOT NULL AUTO_INCREMENT,
  prenom varchar(50) DEFAULT NULL,
  nom varchar(50) DEFAULT NULL,
  email varchar(100) NOT NULL,
  phone_number varchar(20) DEFAULT NULL,
  password varchar(255) DEFAULT NULL,
  diffuse tinyint(1) DEFAULT 0,
  upload tinyint(1) DEFAULT 0,
  download tinyint(1) DEFAULT 0,
  print tinyint(1) DEFAULT 0,
  roles varchar(20) DEFAULT 'user',
  accepted tinyint(1) DEFAULT 0,
  verified tinyint(1) DEFAULT 0,
  dropbox_token varchar(255) DEFAULT NULL,
  created_by int DEFAULT NULL,
  current_plan_id int DEFAULT NULL,
  institution_id int DEFAULT NULL,
  personal_folder_name varchar(255) DEFAULT NULL,
  stripe_customer_id varchar(255) DEFAULT NULL,
  subscription_status enum('free','active','canceled','past_due') DEFAULT 'free',
  PRIMARY KEY (id_user),
  UNIQUE KEY email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create institutions table
CREATE TABLE IF NOT EXISTS institutions (
  id_institution int NOT NULL AUTO_INCREMENT,
  nom_institution varchar(255) NOT NULL,
  adresse text,
  telephone varchar(50),
  email varchar(255),
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_institution)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create document_types table
CREATE TABLE IF NOT EXISTS document_types (
  id int NOT NULL AUTO_INCREMENT,
  type_name varchar(255) NOT NULL,
  description text,
  folder_path varchar(255) DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  institution_id int DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY type_name (type_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create document_tags table
CREATE TABLE IF NOT EXISTS document_tags (
  id int NOT NULL AUTO_INCREMENT,
  tag_name varchar(255) NOT NULL,
  color varchar(7) DEFAULT '#007bff',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  institution_id int DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY tag_name (tag_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id int NOT NULL AUTO_INCREMENT,
  folder_name varchar(255) NOT NULL,
  folder_path varchar(255) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  created_by int DEFAULT NULL,
  institution_id int DEFAULT NULL,
  is_private tinyint(1) DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create table_document
CREATE TABLE IF NOT EXISTS table_document (
  id_document int NOT NULL AUTO_INCREMENT,
  nom_document varchar(255) NOT NULL,
  type_id int,
  path varchar(255) NOT NULL,
  mot_cle1 varchar(255),
  mot_cle2 varchar(255),
  mot_cle3 varchar(255),
  mot_cle4 varchar(255),
  mot_cle5 varchar(255),
  date_upload datetime NOT NULL,
  commentaire text,
  id_user_source int NOT NULL,
  file_size bigint DEFAULT 0,
  first_page longtext,
  PRIMARY KEY (id_document)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Insert default institutions
INSERT IGNORE INTO institutions (id_institution, nom_institution, adresse, telephone, email) VALUES
(1, 'Default Institution', 'Default Address', '0000000000', 'admin@example.com'),
(2, 'Test Institution', 'Test Address', '1111111111', 'test@example.com'),
(3, 'Demo Institution', 'Demo Address', '2222222222', 'demo@example.com');

-- Insert default document types
INSERT IGNORE INTO document_types (id, type_name, description, folder_path, institution_id) VALUES
(1, 'Official Document', 'Official documents', './uploads/Official Document', 1),
(2, 'Shared Document', 'Shared documents', './uploads/Shared Document', 1),
(3, 'General Document', 'General documents', './uploads/General Document', 1),
(4, 'Others', 'Other documents', './uploads/Others', 1);

-- Insert default document tags
INSERT IGNORE INTO document_tags (id, tag_name, color, institution_id) VALUES
(1, 'Important', '#ff0000', 1),
(2, 'Urgent', '#ff8800', 1),
(3, 'Confidential', '#8800ff', 1),
(4, 'Public', '#00ff00', 1);

-- Insert default folders
INSERT IGNORE INTO folders (id, folder_name, folder_path, created_by, institution_id, is_private) VALUES
(1, 'Official Documents', './uploads/Official Document', 1, 1, 0),
(2, 'Shared Documents', './uploads/Shared Document', 1, 1, 0),
(3, 'General Documents', './uploads/General Document', 1, 1, 0),
(4, 'Others', './uploads/Others', 1, 1, 0);

-- Insert essential users
INSERT IGNORE INTO user (id_user, prenom, nom, email, phone_number, password, diffuse, upload, download, print, roles, accepted, verified, created_by, current_plan_id, institution_id, subscription_status) VALUES
(1, 'Admin', 'System', 'admin@example.com', NULL, '$2b$10$qqka0E2SE1vltY1WfhwBleZ0R9IGD7iHVSI2b84ZIMcPiSXki51z', 1, 1, 1, 1, 'admin', 1, 1, 20, 1, 1, 'free'),
(20, 'Super', 'Admin', 'superadmin@example.com', NULL, '$2b$10$t2mah5/R2eA/UTJCBD2w/.26tkqwkNKo9N.e1Xwp6tO4HSGrn9.Ty', 1, 1, 1, 1, 'superadmin', 1, 1, NULL, 2, 3, 'free'),
(25, 'Raul', 'Rusescu', 'raulrusescu@gmail.com', '0734342342', '$2b$10$O1b.JK3ir2ooEu5sfOtoWuNF9tsTdwbfS0/r2wv7hcKyT0CU1bYpa', 1, 1, 1, 1, 'user', 1, 1, 20, 2, 3, 'free');

-- Show what was created
SELECT 'Users created:' as info, COUNT(*) as count FROM user;
SELECT 'Institutions created:' as info, COUNT(*) as count FROM institutions;
SELECT 'Document types created:' as info, COUNT(*) as count FROM document_types;
SELECT 'Document tags created:' as info, COUNT(*) as count FROM document_tags;
SELECT 'Folders created:' as info, COUNT(*) as count FROM folders;

EOF

if [ $? -eq 0 ]; then
    echo "✅ Database initialization completed successfully!"
    echo "📊 Tables created and populated with essential data"
else
    echo "❌ Database initialization failed"
fi

# Start the application
echo "🚀 Starting Node.js application..."
npm start
