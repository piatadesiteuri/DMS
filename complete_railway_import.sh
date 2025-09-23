#!/bin/bash

# Complete Railway Database Import Script
# This script will create all tables and import all data from local PSPD database

echo "🚀 Starting complete Railway database import..."

# Database connection details
RAILWAY_HOST="switchback.proxy.rlwy.net"
RAILWAY_USER="root"
RAILWAY_PASS="AgWaFsyNdUoBqjtHZCDJoopvtByDbTsB"
RAILWAY_PORT="27678"
RAILWAY_DB="PSPD"

# Function to run Railway MySQL command
run_railway_mysql() {
    mysql -h $RAILWAY_HOST -u $RAILWAY_USER -p$RAILWAY_PASS --port $RAILWAY_PORT --protocol=TCP $RAILWAY_DB -e "$1"
}

# Function to import table data
import_table() {
    local table_name=$1
    echo "📊 Importing $table_name..."
    mysqldump -u root -p --no-create-info --complete-insert --single-transaction PSPD $table_name | mysql -h $RAILWAY_HOST -u $RAILWAY_USER -p$RAILWAY_PASS --port $RAILWAY_PORT --protocol=TCP $RAILWAY_DB
}

echo "✅ Basic tables and data already imported (institutions, user, plans)"

echo "📝 Creating remaining tables..."

# Create document_types table
run_railway_mysql "
CREATE TABLE IF NOT EXISTS document_types (
  id int NOT NULL AUTO_INCREMENT,
  type_name varchar(100) NOT NULL,
  description text,
  folder_path varchar(255) DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  institution_id int DEFAULT NULL,
  PRIMARY KEY (id),
  KEY institution_id (institution_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"

# Create document_tags table
run_railway_mysql "
CREATE TABLE IF NOT EXISTS document_tags (
  id_tag int NOT NULL AUTO_INCREMENT,
  tag_name varchar(50) NOT NULL,
  created_by int DEFAULT NULL,
  is_predefined tinyint(1) DEFAULT 0,
  usage_count int DEFAULT 0,
  PRIMARY KEY (id_tag),
  UNIQUE KEY tag_name (tag_name),
  KEY created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"

# Create folders table
run_railway_mysql "
CREATE TABLE IF NOT EXISTS folders (
  id int NOT NULL AUTO_INCREMENT,
  folder_name varchar(255) NOT NULL,
  folder_path varchar(500) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  created_by int DEFAULT NULL,
  institution_id int DEFAULT NULL,
  is_private tinyint(1) DEFAULT 0,
  PRIMARY KEY (id),
  KEY created_by (created_by),
  KEY institution_id (institution_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"

# Create user_logs table
run_railway_mysql "
CREATE TABLE IF NOT EXISTS user_logs (
  id int NOT NULL AUTO_INCREMENT,
  user_id int NOT NULL,
  action varchar(100) NOT NULL,
  description text,
  ip_address varchar(45) DEFAULT NULL,
  user_agent text,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY user_id (user_id),
  KEY created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"

echo "📊 Importing table data..."

# Import data for each table
import_table "document_types"
import_table "document_tags" 
import_table "folders"
import_table "user_logs"

echo "🔗 Adding foreign key constraints..."

# Add foreign key constraints
run_railway_mysql "
ALTER TABLE user ADD CONSTRAINT user_ibfk_1 FOREIGN KEY (created_by) REFERENCES user (id_user);
ALTER TABLE user ADD CONSTRAINT user_ibfk_2 FOREIGN KEY (current_plan_id) REFERENCES plans (id);
ALTER TABLE user ADD CONSTRAINT user_ibfk_3 FOREIGN KEY (institution_id) REFERENCES institutions (id_institution);
ALTER TABLE institutions ADD CONSTRAINT institutions_ibfk_1 FOREIGN KEY (superadmin_id) REFERENCES user (id_user);
ALTER TABLE document_types ADD CONSTRAINT document_types_ibfk_1 FOREIGN KEY (institution_id) REFERENCES institutions (id_institution);
ALTER TABLE document_tags ADD CONSTRAINT document_tags_ibfk_1 FOREIGN KEY (created_by) REFERENCES user (id_user);
ALTER TABLE folders ADD CONSTRAINT folders_ibfk_1 FOREIGN KEY (created_by) REFERENCES user (id_user);
ALTER TABLE folders ADD CONSTRAINT folders_ibfk_2 FOREIGN KEY (institution_id) REFERENCES institutions (id_institution);
ALTER TABLE user_logs ADD CONSTRAINT user_logs_ibfk_1 FOREIGN KEY (user_id) REFERENCES user (id_user);
"

echo "✅ Railway database import complete!"
echo "📊 Final verification..."

run_railway_mysql "
SELECT 'FINAL RESULTS' as status;
SELECT COUNT(*) as institutions_count FROM institutions;
SELECT COUNT(*) as users_count FROM user;
SELECT COUNT(*) as plans_count FROM plans;
SELECT COUNT(*) as document_types_count FROM document_types;
SELECT COUNT(*) as document_tags_count FROM document_tags;
SELECT COUNT(*) as folders_count FROM folders;
SELECT COUNT(*) as user_logs_count FROM user_logs;
"

echo "🎉 Import complete! Login with: raulrusescu@gmail.com / password"
