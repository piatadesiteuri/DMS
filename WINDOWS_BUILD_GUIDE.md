# 🪟 Ghid pentru Build Windows - EDMS Sync Agent

## ⚠️ PROBLEMA IDENTIFICATĂ

**Electron Builder pe macOS NU poate crea installer-e Windows native** din cauza limitărilor platformei. Pentru a crea un installer Windows real (.exe sau .msi), trebuie să folosești una din soluțiile de mai jos.

## 🎯 SOLUȚII DISPONIBILE

### **Soluția 1: Build pe Windows (RECOMANDAT)**

#### Cerințe:
- Windows 10/11
- Node.js 18+ 
- Git

#### Pași:

1. **Clonează proiectul pe Windows:**
```bash
git clone [URL_PROIECT]
cd EDMS-main
```

2. **Rulează script-ul PowerShell:**
```powershell
# Deschide PowerShell ca Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\build-windows.ps1
```

3. **Sau manual:**
```bash
cd sync-agent
npm install
npm install -g electron-builder
npm run build-win
```

#### Rezultat:
- ✅ **NSIS Installer** (.exe) - Installer profesional
- ✅ **Portable EXE** - Fără instalare
- ✅ **ZIP Archive** - Pentru distribuție manuală

---

### **Soluția 2: GitHub Actions (AUTOMAT)**

#### Configurare:

1. **Push codul pe GitHub**
2. **Activează GitHub Actions** 
3. **Workflow-ul va rula automat** și va crea build-uri pentru Windows

#### Avantaje:
- ✅ Build automat pe fiecare commit
- ✅ Build-uri pentru Windows, macOS, Linux
- ✅ Fără nevoie de mașină Windows

---

### **Soluția 3: Servicii Cloud Build**

#### Opțiuni:
- **AppVeyor** - Gratuit pentru proiecte open source
- **Azure DevOps** - Build pipelines
- **CircleCI** - Cu Windows executors

---

## 🔧 CONFIGURAȚIA ACTUALĂ

### Package.json - Targets:
```json
"win": {
  "target": [
    { "target": "nsis", "arch": ["x64"] },      // ← INSTALLER REAL
    { "target": "portable", "arch": ["x64"] },   // ← EXE PORTABIL  
    { "target": "zip", "arch": ["x64"] }         // ← ARHIVĂ
  ]
}
```

### NSIS Installer Features:
- ✅ **Instalare în Program Files**
- ✅ **Shortcut pe Desktop**
- ✅ **Intrare în Start Menu**
- ✅ **Uninstaller în Control Panel**
- ✅ **Auto-update capabilities**

---

## 🚀 TESTARE RAPIDĂ

### Pe Windows:

1. **Descarcă Node.js:** https://nodejs.org/
2. **Clonează proiectul**
3. **Rulează:**
```bash
cd sync-agent
npm install
npm run build-win
```

### Rezultat așteptat:
```
dist/
├── EDMS Sync Agent Setup 1.0.0.exe    (INSTALLER)
├── EDMS Sync Agent-1.0.0-portable.exe (PORTABIL)
└── EDMS Sync Agent-1.0.0-win-x64.zip  (ARHIVĂ)
```

---

## 🎯 RECOMANDAREA FINALĂ

**Pentru distribuție profesională:**

1. **Folosește GitHub Actions** pentru build automat
2. **Testează pe Windows** înainte de release
3. **Distribuie installer-ul NSIS** (.exe) pentru utilizatori finali
4. **Păstrează versiunea portabilă** pentru testare rapidă

### Linkuri utile:
- **Node.js:** https://nodejs.org/
- **Electron Builder:** https://www.electron.build/
- **NSIS:** https://nsis.sourceforge.io/

---

## 📞 SUPORT

Dacă întâmpini probleme:
1. Verifică că Node.js este instalat corect
2. Rulează `npm install` în directorul sync-agent
3. Verifică că ai permisiuni de Administrator
4. Contactează echipa pentru suport tehnic 