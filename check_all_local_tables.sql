-- Verifică TOATE tabelele din baza ta locală PSPD
-- Rulează cu: mysql -h switchback.proxy.rlwy.net -u root -pAgWaFsyNdUoBqjtHZCDJoopvtByDbTsB --port 27678 --protocol=TCP -e "$(cat check_all_local_tables.sql)"

-- Conectează-te la baza ta locală PSPD prin Railway
USE PSPD;

-- Afișează TOATE tabelele
SELECT 'TOATE TABELELE DIN PSPD LOCAL:' as info;
SHOW TABLES;

-- Verifică și prin information_schema pentru a fi sigur
SELECT 'VERIFICARE PRIN INFORMATION_SCHEMA:' as info;
SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'PSPD' 
ORDER BY TABLE_NAME;

-- Pentru fiecare tabel, arată câte înregistrări are
SELECT 'NUMĂRUL DE ÎNREGISTRĂRI PER TABEL:' as info;
