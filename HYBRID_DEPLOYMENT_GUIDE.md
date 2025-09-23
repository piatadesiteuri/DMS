# 🚀 EDMS Hybrid Deployment Guide

## 📋 Overview
Ghid pentru implementarea EDMS într-un mediu hibrid: aplicație web centrală + aplicații desktop Electron sincronizate în timp real.

## 🏗️ Arhitectura Sistemului

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │   Web Browser   │    │ Electron App    │
│   (PC User A)   │    │   (PC User B)   │    │   (PC User C)   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │     EDMS Backend API      │
                    │   (192.168.0.12:3003)    │
                    │                           │
                    │  • REST API Routes        │
                    │  • WebSocket Server       │
                    │  • Authentication         │
                    │  • File Management        │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │      MySQL Database       │
                    │                           │
                    │  • Users & Sessions       │
                    │  • Documents Metadata     │
                    │  • Folders Structure      │
                    │  • Real-time Events       │
                    └───────────────────────────┘
```

## 🎯 Flow-ul de Utilizare

### 👨‍💼 Scenariul Business
1. **Manager A** - lucrează pe PC-ul său cu aplicația web prin browser
2. **Employee B** - lucrează remote cu aplicația Electron pe laptop-ul personal
3. **Secretary C** - folosește aplicația Electron pe PC-ul din birou
4. **Toți utilizatorii** văd modificările în timp real, indiferent de platform

### 🔄 Sincronizarea în Timp Real
- **Upload document** în Electron → apare instant în web browser
- **Drag & drop folder** în web → se reflectă în toate aplicațiile Electron
- **Move/Delete/Restore** operations sincronizate pe toate platformele
- **Toast notifications** cu detalii despre modificări

## 🛠️ Setup și Configurare

### 1. Backend Server (Centralizat)
```bash
# Pornire backend pe server
cd back-end
NODE_ENV=production node application.js
# Server disponibil pe: 192.168.0.12:3003
```

### 2. Web Application (Browser Access)
```bash
# Pornire frontend pentru accesul web
cd front-end
REACT_APP_ENV=production npm start
# Web app disponibilă pe: 192.168.0.12:3002
```

### 3. Electron Desktop App (Executabil)

#### Development Mode:
```bash
cd sync-agent
npm install
npm start
```

#### Production Executables:
```bash
# Build pentru toate platformele
npm run build-all

# Build specific platform
npm run build-win    # Windows .exe
npm run build-mac    # macOS .dmg  
npm run build-linux  # Linux AppImage
```

## 📦 Instalare Executabile

### Windows
1. Download `EDMS-Sync-Agent-Setup.exe`
2. Run installer (poate necesita administrator rights)
3. Launch `EDMS Sync Agent` din Start Menu

### macOS  
1. Download `EDMS-Sync-Agent.dmg`
2. Open DMG și drag app în Applications folder
3. Launch din Applications (poate necesita "Allow apps from unidentified developers")

### Linux
1. Download `EDMS-Sync-Agent.AppImage`
2. Make executable: `chmod +x EDMS-Sync-Agent.AppImage`
3. Run direct: `./EDMS-Sync-Agent.AppImage`

## 🔐 Authentication Flow

### Web Browser
1. Navigate to `http://192.168.0.12:3002/login`
2. Enter credentials
3. Session stored în browser cookies

### Electron App
1. Launch desktop application
2. Login screen apare automat
3. Enter same credentials ca pentru web
4. Credentials stored securely în Electron Store
5. Auto-login la următoarea pornire

## 📁 File Operations

### Drag & Drop în Electron
- **PDF Files**: Drag from desktop → Drop în aplicația Electron
- **Folders**: Drop folder cu PDFs → structure replicată automat
- **Real-time sync**: Modificările apar instant în web browser

### Web Interface Operations
- **Upload**: Browser file picker
- **Move**: Drag & drop în web interface  
- **Delete/Restore**: Context menu operations
- **All operations** se sincronizează către aplicațiile Electron

## 🌐 Network Configuration

### Server Requirements
- **IP Address**: 192.168.0.12 (sau IP-ul serverului tău)
- **Ports**:
  - 3002: Web frontend
  - 3003: Backend API + WebSocket
  - 3306: MySQL database

### Client Requirements
- **Network**: Acces la subnet-ul serverului
- **Ports**: Outbound connections la 3002, 3003
- **Browser**: Modern browser cu WebSocket support
- **Electron**: Nu necesită install suplimentar

## 🔧 Troubleshooting

### Connection Issues
```bash
# Test backend connection
curl http://192.168.0.12:3003/health

# Test WebSocket
# Browser Console:
const socket = io('http://192.168.0.12:3003');
console.log('Connected:', socket.connected);
```

### Electron App Issues
- **Clear cache**: Delete app data folder
- **Reinstall**: Uninstall și reinstall executabil
- **Logs**: Check console în app (Ctrl+Shift+I)

### Web App Issues  
- **Clear browser cache**: Ctrl+F5
- **Check network**: Developer Tools → Network tab
- **Cookie issues**: Clear site data

## 📊 Monitoring și Logs

### Backend Logs
```bash
# Urmărește logs în timp real
tail -f /var/log/edms/application.log

# WebSocket connections
grep "Socket.IO" /var/log/edms/application.log
```

### Client-side Debugging
- **Web**: Browser Developer Tools → Console
- **Electron**: Help → Toggle Developer Tools

## 🚀 Deployment Checklist

### Pre-deployment
- [ ] Backend configurat cu IP-ul corect
- [ ] Database accessible din rețea
- [ ] Firewall ports open (3002, 3003)
- [ ] SSL certificates (optional, for HTTPS)

### Testing
- [ ] Web login functional
- [ ] Electron login functional  
- [ ] Real-time sync între platforms
- [ ] File upload/download operations
- [ ] Cross-platform notifications

### Distribution
- [ ] Executabile built pentru toate platformele
- [ ] Installation guides pentru useri
- [ ] Network access documentation
- [ ] User training materials

## 🎯 Benefits

### Pentru Business
- **Flexibilitate**: Users pot lucra de oriunde, cu orice platform
- **Productivitate**: Real-time collaboration fără întârzieri
- **Scalabilitate**: Ușor de adăugat noi utilizatori/dispozitive
- **Cost-effective**: O singură infrastructură pentru toate platformele

### Pentru IT
- **Centralizat**: O singură bază de date, un singur backend
- **Monitoring**: Toate operațiile loggate central
- **Updates**: Backend updates afectează toate clientii
- **Security**: Centralized authentication și access control

## 📞 Support

Pentru probleme técnice:
1. Check logs (backend + client)
2. Verify network connectivity  
3. Test cu alt client (web vs Electron)
4. Contact development team cu log details 