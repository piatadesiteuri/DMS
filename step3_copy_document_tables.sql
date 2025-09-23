-- PASUL 3: Copierea tabelelor pentru documente
USE railway;

-- Tabele pentru documente
CREATE TABLE document_types LIKE PSPD.document_types;
INSERT INTO document_types SELECT * FROM PSPD.document_types;
SELECT 'Document types copied' as status, COUNT(*) as count FROM document_types;

CREATE TABLE document_tags LIKE PSPD.document_tags;
INSERT INTO document_tags SELECT * FROM PSPD.document_tags;
SELECT 'Document tags copied' as status, COUNT(*) as count FROM document_tags;

CREATE TABLE folders LIKE PSPD.folders;
INSERT INTO folders SELECT * FROM PSPD.folders;
SELECT 'Folders copied' as status, COUNT(*) as count FROM folders;

SELECT 'DOCUMENT TABLES COMPLETED' as final_status;
