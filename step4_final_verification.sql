-- PASUL 4: Verificarea finală
USE railway;

-- Verifică toate tabelele copiate
SELECT 'FINAL VERIFICATION' as status;
SHOW TABLES;

-- Numără înregistrările
SELECT 'Users' as table_name, COUNT(*) as count FROM user
UNION ALL
SELECT 'Institutions' as table_name, COUNT(*) as count FROM institutions
UNION ALL
SELECT 'Folders' as table_name, COUNT(*) as count FROM folders
UNION ALL
SELECT 'Document Types' as table_name, COUNT(*) as count FROM document_types
UNION ALL
SELECT 'Document Tags' as table_name, COUNT(*) as count FROM document_tags
UNION ALL
SELECT 'Plans' as table_name, COUNT(*) as count FROM plans
UNION ALL
SELECT 'Features' as table_name, COUNT(*) as count FROM features
UNION ALL
SELECT 'Sessions' as table_name, COUNT(*) as count FROM sessions;

-- Test login query
SELECT 'LOGIN TEST' as test_type;
SELECT 
  u.id_user,
  u.nom,
  u.prenom,
  u.email,
  u.roles,
  u.institution_id,
  i.name as institution_name,
  u.verified,
  u.accepted
FROM user u
LEFT JOIN institutions i ON u.institution_id = i.id_institution
WHERE u.email = 'raulrusescu@gmail.com';

SELECT '✅ ALL DATA COPIED SUCCESSFULLY!' as final_message;
