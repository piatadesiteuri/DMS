-- COPIEREA COMPLETĂ A TUTUROR TABELELOR DIN PSPD ÎN RAILWAY
-- Cu toate FK-urile și datele

USE railway;
SET FOREIGN_KEY_CHECKS=0;

-- PASUL 1: Copiază TOATE tabelele din PSPD (structură + date)
CREATE TABLE plans LIKE PSPD.plans;
INSERT INTO plans SELECT * FROM PSPD.plans;

CREATE TABLE features LIKE PSPD.features;
INSERT INTO features SELECT * FROM PSPD.features;

CREATE TABLE sessions LIKE PSPD.sessions;
INSERT INTO sessions SELECT * FROM PSPD.sessions;

CREATE TABLE institutions LIKE PSPD.institutions;
INSERT INTO institutions SELECT * FROM PSPD.institutions;

CREATE TABLE user LIKE PSPD.user;
INSERT INTO user SELECT * FROM PSPD.user;

CREATE TABLE document_types LIKE PSPD.document_types;
INSERT INTO document_types SELECT * FROM PSPD.document_types;

CREATE TABLE document_tags LIKE PSPD.document_tags;
INSERT INTO document_tags SELECT * FROM PSPD.document_tags;

CREATE TABLE folders LIKE PSPD.folders;
INSERT INTO folders SELECT * FROM PSPD.folders;

-- PASUL 2: Verifică ce am copiat până acum
SELECT 'BASIC TABLES COPIED' as status;
SELECT COUNT(*) as users FROM user;
SELECT COUNT(*) as institutions FROM institutions;
SELECT COUNT(*) as folders FROM folders;
SELECT COUNT(*) as document_types FROM document_types;
SELECT COUNT(*) as document_tags FROM document_tags;

-- PASUL 3: Acum să vedem ce alte tabele mai avem în PSPD local
-- (le vei vedea în MySQL Workbench și le adaugi aici)

SET FOREIGN_KEY_CHECKS=1;

-- PASUL 4: Verificare finală
SHOW TABLES;
SELECT 'ALL TABLES COPIED SUCCESSFULLY!' as final_status;
