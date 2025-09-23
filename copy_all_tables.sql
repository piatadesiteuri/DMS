-- Copy ALL tables from PSPD to railway database
USE railway;

-- Step 1: Base tables (no foreign keys)
CREATE TABLE plans LIKE PSPD.plans;
INSERT INTO plans SELECT * FROM PSPD.plans;

CREATE TABLE features LIKE PSPD.features;
INSERT INTO features SELECT * FROM PSPD.features;

CREATE TABLE sessions LIKE PSPD.sessions;
INSERT INTO sessions SELECT * FROM PSPD.sessions;

-- Step 2: Core tables
CREATE TABLE institutions LIKE PSPD.institutions;
INSERT INTO institutions SELECT * FROM PSPD.institutions;

CREATE TABLE user LIKE PSPD.user;
INSERT INTO user SELECT * FROM PSPD.user;

-- Step 3: Document related tables
CREATE TABLE document_types LIKE PSPD.document_types;
INSERT INTO document_types SELECT * FROM PSPD.document_types;

CREATE TABLE document_tags LIKE PSPD.document_tags;
INSERT INTO document_tags SELECT * FROM PSPD.document_tags;

CREATE TABLE folders LIKE PSPD.folders;
INSERT INTO folders SELECT * FROM PSPD.folders;

-- Verification
SELECT 'COPY COMPLETED' as status;
SELECT COUNT(*) as users_copied FROM user;
SELECT COUNT(*) as folders_copied FROM folders;
SELECT COUNT(*) as institutions_copied FROM institutions;
SELECT COUNT(*) as document_types_copied FROM document_types;
SELECT COUNT(*) as document_tags_copied FROM document_tags;
SHOW TABLES;
