-- PASUL 2: Copierea tabelelor de bază (fără foreign keys)
USE railway;

-- Tabele de bază
CREATE TABLE plans LIKE PSPD.plans;
INSERT INTO plans SELECT * FROM PSPD.plans;
SELECT 'Plans copied' as status, COUNT(*) as count FROM plans;

CREATE TABLE features LIKE PSPD.features;
INSERT INTO features SELECT * FROM PSPD.features;
SELECT 'Features copied' as status, COUNT(*) as count FROM features;

CREATE TABLE sessions LIKE PSPD.sessions;
INSERT INTO sessions SELECT * FROM PSPD.sessions;
SELECT 'Sessions copied' as status, COUNT(*) as count FROM sessions;

-- Tabele principale
CREATE TABLE institutions LIKE PSPD.institutions;
INSERT INTO institutions SELECT * FROM PSPD.institutions;
SELECT 'Institutions copied' as status, COUNT(*) as count FROM institutions;

CREATE TABLE user LIKE PSPD.user;
INSERT INTO user SELECT * FROM PSPD.user;
SELECT 'Users copied' as status, COUNT(*) as count FROM user;

SELECT 'CORE TABLES COMPLETED' as final_status;
