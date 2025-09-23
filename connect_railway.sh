#!/bin/bash

# Script pentru conectare la Railway MySQL
echo "🚀 Conectare la Railway MySQL..."

mysql -h switchback.proxy.rlwy.net -u root -pAgWaFsyNdUoBqjtHZCDJoopvtByDbTsB --port 27678 --protocol=TCP railway

echo "✅ Conexiune închisă."
