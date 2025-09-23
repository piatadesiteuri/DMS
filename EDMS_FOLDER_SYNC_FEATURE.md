# 📁 EDMS Sync Agent - Funcționalitate Folder Local

## 🎯 **Noua Funcționalitate Implementată**

### 📅 **Build: 11 iunie 2025, 08:46**
### 📦 **Versiune Windows**: 96MB Portable + 156MB ZIP

---

## 🚀 **Ce Face Aplicația Acum:**

### 1. **📂 Creează Folder EDMS_Documents**
- La prima rulare, aplicația creează automat folder `EDMS_Documents` în Home directory-ul utilizatorului
- **Windows**: `C:\Users\[Username]\EDMS_Documents\`
- **macOS**: `/Users/[Username]/EDMS_Documents/`

### 2. **🏢 Setup Folder Instituție**
- După login, verifică dacă există folderul pentru instituția utilizatorului
- Dacă **NU există**, afișează un dialog pentru creare
- **Dialog**: *"Folderul pentru instituția [Nume] nu există local. Doriți să creez folderul și să descarc documentele publice existente?"*

### 3. **📥 Download Automat Structură**
Când se creează folderul instituției:
- **Descarcă toate folderele publice** din baza de date
- **Descarcă toate documentele publice** existente
- **Creează structura locală** identică cu cea de pe server
- **Exclude documentele private** ale altor utilizatori

### 4. **👁️ Monitoring Real-time**
- **Chokidar watcher** pe folderul local
- **Upload automat** când se adaugă fișiere
- **Sincronizare bidirectională** cu serverul
- **Notificări** pentru modificări

---

## 🔧 **Workflow Tehnic:**

### **La Prima Rulare:**
1. Utilizatorul rulează aplicația `.exe`
2. Se conectează cu credentialele EDMS
3. **Automat**: Se creează `~/EDMS_Documents/`
4. **Verificare**: Există `~/EDMS_Documents/[Instituția]/`?
5. **Dacă NU**: Dialog pentru creare folder
6. **Dacă DA**: Pornește monitoring

### **La Creare Folder:**
1. **Query BD**: `SELECT * FROM folders WHERE institution_id = ? AND is_private = 0`
2. **Creare**: Structură de foldere locală
3. **Query BD**: `SELECT * FROM table_document WHERE institution_id = ? AND is_private = 0`
4. **Download**: Fișiere din `/back-end/uploads/` → folder local
5. **Start**: Chokidar watcher pe folderul creat

### **Sincronizare Continuă:**
- **File Add**: Upload automat la server + notificare web
- **File Delete**: Ștergere pe server + notificare web  
- **Server Changes**: Download local prin WebSocket

---

## 📋 **IPC Handlers Noi:**

```javascript
// Verifică dacă folderul instituției există
ipcMain.handle('check-institution-folder', async () => {})

// Creează manual folderul instituției  
ipcMain.handle('create-institution-folder', async () => {})

// Deschide folderul EDMS în File Explorer
ipcMain.handle('open-edms-folder', async () => {})
```

---

## 🧪 **Pentru Testare:**

### **Scenario 1 - Utilizator Nou:**
1. Download & run aplikația 
2. Login cu cont existent EDMS
3. **Expectant**: Dialog "Folderul pentru instituția X nu există"
4. **Click**: "Da, creează folderul"
5. **Verifică**: Se creează `~/EDMS_Documents/[Instituția]/`
6. **Verifică**: Se descarcă folderele și documentele publice
7. **Test**: Adaugă PDF în folder → apare pe web

### **Scenario 2 - Utilizator Existent:**
1. Rulează aplicația a doua oară
2. Login cu același cont
3. **Expectant**: Nu mai apare dialog
4. **Verifică**: Pornește monitoring direct
5. **Test**: Modificări locale/web se sincronizează

### **Scenario 3 - Multiple Instituții:**
1. Login cu cont de la altă instituție
2. **Expectant**: Dialog pentru noua instituție
3. **Verifică**: Se creează `~/EDMS_Documents/[Instituția2]/`
4. **Test**: Ambele foldere funcționează independent

---

## 🔒 **Securitate & Permisiuni:**

### ✅ **Funcționează:**
- **Doar documentele publice** se descarcă
- **Structura pe instituții** - separată complet
- **Monitorizare protejată** - nu poate accesa alte foldere
- **Token-based auth** pentru toate operațiunile

### ⚠️ **Limitări Actuale:**
- **Nu monitorizează ștergerile din File Explorer** (din cauza Windows permissions)
- **Doar PDF-uri** sunt procesate
- **Canvas OCR** încă dezactivat pe Windows

---

## 📊 **Status Implementare:**

| Funcționalitate | Status | Comentarii |
|-----------------|--------|------------|
| 📂 Creare folder EDMS | ✅ **DONE** | Automat la prima rulare |
| 🏢 Setup folder instituție | ✅ **DONE** | Dialog + verificare |
| 📥 Download structură | ✅ **DONE** | Foldere + documente publice |
| 👁️ File watcher | ✅ **DONE** | Chokidar monitoring |
| 🔄 Upload automat | ✅ **DONE** | PDF add → server |
| 📡 WebSocket sync | ✅ **DONE** | Real-time cu web |
| 🗑️ Delete handling | ⚠️ **PARTIAL** | Limitări Windows |
| 🖼️ OCR processing | ❌ **DISABLED** | Canvas issues pe Windows |

---

**🎉 Ready for Testing!**  
Download: http://192.168.0.12:3000/download-app 