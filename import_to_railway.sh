#!/bin/bash

# Script pentru importul bazei de date în Railway MySQL
# Folosește datele din screenshot-ul tău

echo "🚀 Importing database to Railway MySQL..."

# Conectează-te la Railway MySQL și importă baza de date
mysql -h switchback.proxy.rlwy.net -u root -pAgWaFsyNdUoBqjtHZCDJoopvtByDbTsB --port 27678 --protocol=TCP railway < my_database_export.sql

echo "✅ Database import completed!"
echo "🎉 You can now login to your Railway application!"
