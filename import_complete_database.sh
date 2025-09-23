#!/bin/bash

echo "🚀 IMPORTUL COMPLET AL BAZEI DE DATE PSPD ÎN RAILWAY"
echo "=================================================="

# Verifică dacă există fișierul export
if [ ! -f "pspd_export.sql" ]; then
    echo "❌ EROARE: Fișierul pspd_export.sql nu există!"
    echo "📝 Fă export din MySQL Workbench mai întâi!"
    exit 1
fi

echo "✅ Fișierul pspd_export.sql găsit!"

# Importă în Railway
echo "📤 Importul în Railway..."
mysql -h switchback.proxy.rlwy.net -u root -pAgWaFsyNdUoBqjtHZCDJoopvtByDbTsB --port 27678 --protocol=TCP railway < pspd_export.sql

if [ $? -eq 0 ]; then
    echo "✅ IMPORT REUȘIT!"
    
    # Verifică rezultatul
    echo "🔍 Verificarea datelor importate..."
    mysql -h switchback.proxy.rlwy.net -u root -pAgWaFsyNdUoBqjtHZCDJoopvtByDbTsB --port 27678 --protocol=TCP railway -e "
    USE railway;
    SELECT 'VERIFICARE IMPORT COMPLET' as status;
    SELECT 'users' as tabel, COUNT(*) as inregistrari FROM user
    UNION ALL SELECT 'institutions', COUNT(*) FROM institutions  
    UNION ALL SELECT 'folders', COUNT(*) FROM folders
    UNION ALL SELECT 'document_types', COUNT(*) FROM document_types
    UNION ALL SELECT 'document_tags', COUNT(*) FROM document_tags
    UNION ALL SELECT 'table_document', COUNT(*) FROM table_document
    UNION ALL SELECT 'document_versions', COUNT(*) FROM document_versions
    UNION ALL SELECT 'user_logs', COUNT(*) FROM user_logs;
    
    SELECT '🎉 TOATE DATELE AU FOST IMPORTATE CU SUCCES!' as final_message;
    "
    
    echo "🎉 GATA! Aplicația Railway are acum toate datele tale!"
else
    echo "❌ EROARE la import!"
fi
