# EDMS Sync Agent - Deployment Guide

## 🚀 **Build și Deploy Automat**

### **Pentru a crea un build nou și a-l pune la download:**

```bash
# Din directorul sync-agent
npm run deploy
```

Sau manual:
```bash
npm run build-win
node deploy-to-downloads.js
node update-download-page.js
```

### **Rezultat:**
- ✅ Build pentru Windows creat în `dist/`
- ✅ Fișier copiat în `back-end/public/downloads/EDMS_Sync_Agent_Latest.exe`
- ✅ Informații de versiune create în `version.json`
- ✅ Disponibil la: `http://192.168.0.13:3000/download-app`

## 📁 **Structura Fișierelor**

### **Build Output:**
```
sync-agent/
├── dist/
│   └── EDMS Sync Agent 1.0.0.exe (96MB)
└── deploy-to-downloads.js
```

### **Download Location:**
```
back-end/
└── public/
    └── downloads/
        ├── EDMS_Sync_Agent_Latest.exe (96MB)
        └── version.json
```

## 🔧 **Configurare**

### **Calea pentru fișiere:**
- **Windows:** `%USERPROFILE%\Documents\DocDiL\`
- **macOS:** `~/DocDiL/`
- **Linux:** `~/DocDiL/`

### **Funcționalități:**
- ✅ Auto-upload pentru fișiere PDF noi
- ✅ Auto-delete pentru fișiere șterse
- ✅ Sincronizare în timp real
- ✅ Generare keywords și tags
- ✅ Generare thumbnail-uri
- ✅ Sincronizare structură foldere
- ✅ Integrare cu baza de date

## 📊 **Informații Versiune**

Fișierul `version.json` conține:
```json
{
  "version": "1.0.0",
  "buildDate": "2025-08-25T05:41:21.782Z",
  "fileName": "EDMS_Sync_Agent_Latest.exe",
  "fileSize": 100668887,
  "fileSizeMB": "96.01",
  "features": [...],
  "changelog": [...]
}
```

## 🎯 **Testare**

### **Pentru a testa auto-upload:**
1. Pornește aplicația
2. Loghează-te cu un cont valid
3. Copiază un PDF în folderul DocDiL corespunzător
4. Verifică că apare în ambele aplicații în 1-2 secunde

### **Pentru a testa auto-delete:**
1. Șterge un PDF din folderul DocDiL
2. Verifică că dispare din ambele aplicații în 1-2 secunde

## 🚨 **Debugging**

### **Log-uri importante:**
- `🔍 [WATCHER]` - Evenimente de file watching
- `🚀 [AUTO-UPLOAD]` - Procesare fișiere noi
- `🗑️ [AUTO-DELETE]` - Procesare fișiere șterse
- `🖼️ [FirstPage]` - Generare thumbnail-uri

### **Scripturi de test:**
```bash
# Test watcher
node test-watcher.js

# Test auto-upload live
node test-auto-upload-live.js

# Debug watcher
node debug-watcher.js
```

## 📝 **Notă Importantă**

Aplicația funcționează pe toate platformele (Windows, macOS, Linux) și folosește calea corectă pentru fiecare sistem de operare.
