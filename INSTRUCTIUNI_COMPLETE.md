# 🚀 INSTRUCȚIUNI COMPLETE PENTRU COPIEREA BAZEI DE DATE

## Pasul 1: Rulează primul script (tabelele de bază)
```bash
mysql -h switchback.proxy.rlwy.net -u root -pAgWaFsyNdUoBqjtHZCDJoopvtByDbTsB --port 27678 --protocol=TCP railway < copy_everything_complete.sql
```

## Pasul 2: Rulează al doilea script (tabelele rămase)
```bash
mysql -h switchback.proxy.rlwy.net -u root -pAgWaFsyNdUoBqjtHZCDJoopvtByDbTsB --port 27678 --protocol=TCP railway < copy_all_remaining_tables.sql
```

## SAU - Dacă vrei să te conectezi interactiv:
```bash
mysql -h switchback.proxy.rlwy.net -u root -pAgWaFsyNdUoBqjtHZCDJoopvtByDbTsB --port 27678 --protocol=TCP railway
```

Apoi în MySQL prompt copiezi și lipești conținutul din fișierele SQL.

## Verificare finală:
```bash
mysql -h switchback.proxy.rlwy.net -u root -pAgWaFsyNdUoBqjtHZCDJoopvtByDbTsB --port 27678 --protocol=TCP railway -e "SHOW TABLES; SELECT COUNT(*) FROM user; SELECT COUNT(*) FROM folders;"
```

## ✅ Rezultatul așteptat:
- 32 users
- 141 folders  
- 6 institutions
- 20 document types
- 448 document tags
- + toate celelalte tabele
