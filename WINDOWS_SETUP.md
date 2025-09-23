# EDMS Sync Agent - Ghid Instalare Windows

## 📥 Download și Instalare

### 1. Descarcă aplicația
Accesează pagina de download: **http://192.168.0.12:3000/download-app**

### 2. Alege versiunea potrivită
- **💼 Portable (.exe)** - Aplicație portabilă (96 MB)
  - Nu necesită instalare
  - Se poate rula direct din orice folder
  - Ideal pentru utilizare temporară sau pe PC-uri cu restricții

- **📦 ZIP Archive (.zip)** - Arhivă cu toate fișierele (155 MB)
  - Extrage în folderul dorit
  - Rulează `EDMS Sync Agent.exe`

### 3. Rulare pentru prima dată
1. **Pentru versiunea Portable**: 
   - Descarcă fișierul `.exe`
   - Dă dublu-click pentru a rula aplicația

2. **Pentru versiunea ZIP**:
   - Descarcă și extrage arhiva
   - Intră în folderul extras
   - Rulează `EDMS Sync Agent.exe`

### 4. Conectare la EDMS
- **URL Server**: http://192.168.0.12:3003
- **Username**: contul tău EDMS existent
- **Password**: parola ta EDMS

## 🔧 Cerințe de Sistem
- **OS**: Windows 10 sau mai nou
- **Arhitectură**: x64 (64-bit)
- **RAM**: Minim 4GB recomandat
- **Spațiu**: ~200MB pentru aplicație + spațiu pentru sincronizare

## 🚀 Funcționalități

### Sincronizare în Timp Real
- Drag & drop fișiere în aplicație
- Sincronizare automată cu serverul EDMS
- Notificări pentru modificări

### Organizare Automată
- Fișierele sunt organizate pe instituții
- Structură de foldere automată
- Backup automat al documentelor

### Procesare Inteligentă
- OCR pentru documente scanate
- Clasificare automată
- Extragere metadata

## 🛠️ Troubleshooting

### Aplicația nu pornește
1. **Verifică Windows Defender**:
   - Adaugă aplicația la excepții
   - Dezactivează protecția în timp real temporar

2. **Verifică permisiunile**:
   - Click dreapta pe `.exe` → "Run as administrator"

3. **Verifică conexiunea**:
   - Testează accesul la http://192.168.0.12:3002

### Probleme de sincronizare
1. **Verifică conexiunea la internet**
2. **Verifică că serverul EDMS rulează**
3. **Restartează aplicația**

### Erori de autentificare
1. **Verifică username/password**
2. **Verifică URL-ul serverului**
3. **Contactează administratorul EDMS**

## 📞 Suport
Pentru probleme tehnice sau întrebări:
- **Server Web**: http://192.168.0.12:3002
- **API Server**: http://192.168.0.12:3003
- **Download Page**: http://192.168.0.12:3000/download-app

---
*Aplicația EDMS Sync Agent v1.0.0 - Built for Windows 10/11 x64* 