# 🌐 Ghid de Configurare Rețea pentru EDMS

## 🚨 Problema Identificată

Aplicația nu funcționa pe IP pentru că:
1. **IP Greșit**: Se încerca accesul la `192.168.0.13` în loc de `192.168.0.12` 
2. **Proxy incorect**: `setupProxy.js` avea IP-ul `192.168.1.3` în loc de `192.168.0.12`
3. **Environment variables**: Nu era setat `REACT_APP_ENV=production`

## ✅ Soluția Implementată

### 1. Configurația Porturilor Corecte:
- **Backend**: Port 3003 pe toate interfețele (0.0.0.0)  
- **Frontend Network**: Port 3002 pe IP 192.168.0.12
- **Frontend Local**: Port 3001 pe localhost
- **Backend Local**: Port 3000 pe localhost

### 2. Fix în `setupProxy.js`:
```javascript
target: process.env.REACT_APP_ENV === 'production' 
  ? 'http://192.168.0.12:3003'  // ✅ IP corect 
  : 'http://localhost:3000',

proxyReq.setHeader('Origin', process.env.REACT_APP_ENV === 'production'
  ? 'http://192.168.0.12:3002'  // ✅ IP corect
  : 'http://localhost:3001'
);
```

## 🚀 Cum să pornești aplicația pentru acces de rețea:

### Pasul 1: Backend pe port 3003
```bash
cd back-end
PORT=3003 npm start
```

### Pasul 2: Frontend pe IP pentru rețea  
```bash
cd front-end
HOST=192.168.0.12 PORT=3002 REACT_APP_ENV=production npm start
```

## 🔍 Verificare Status

### Verifică porturile active:
```bash
lsof -nP -iTCP:3000,3001,3002,3003 -sTCP:LISTEN
```

**Output așteptat:**
```
COMMAND   PID USER   FD   TYPE     DEVICE SIZE/OFF NODE NAME
node    xxxxx  PDS   22u  IPv4    xxxxxxxx      0t0  TCP 192.168.0.12:3002 (LISTEN)  # Frontend Network
node    xxxxx  PDS   22u  IPv6    xxxxxxxx      0t0  TCP *:3000 (LISTEN)              # Backend Local  
node    xxxxx  PDS   22u  IPv4    xxxxxxxx      0t0  TCP *:3001 (LISTEN)              # Frontend Local
node    xxxxx  PDS   20u  IPv6    xxxxxxxx      0t0  TCP *:3003 (LISTEN)              # Backend Network
```

### Verifică IP-ul curent al laptopului:
```bash
ifconfig | grep -E "inet.*broadcast" | head -5
```

## 🎯 URL-uri de Acces

### Pentru accesul local:
- **Frontend**: http://localhost:3001
- **Backend**: http://localhost:3000

### Pentru accesul de pe rețea:
- **Frontend**: http://192.168.0.12:3002 
- **Backend API**: http://192.168.0.12:3003

## 🔧 Troubleshooting

### Problema 1: "Connection refused"
```bash
# Verifică dacă backend-ul rulează pe 3003
curl http://192.168.0.12:3003/api/health

# Dacă nu răspunde, repornește backend:
cd back-end
PORT=3003 npm start
```

### Problema 2: Frontend nu se conectează la backend
```bash
# Verifică environment variable
echo $REACT_APP_ENV

# Trebuie să fie 'production' pentru acces de rețea
HOST=192.168.0.12 PORT=3002 REACT_APP_ENV=production npm start
```

### Problema 3: "CORS error"
- Verifică că backend-ul include IP-ul în configurația CORS
- Restart backend după modificări CORS

### Problema 4: "Address already in use"
```bash
# Găsește procesul care folosește portul
lsof -i :3002

# Oprește procesul
kill <PID>

# Repornește aplicația
npm start
```

## 🔍 Debug Console

### În browser (F12 Console):
- **Network tab**: Verifică URL-urile request-urilor
- **Console tab**: Caută erori WebSocket sau CORS
- Dacă vezi `localhost:3000` în Network → backend-ul nu e configurat corect

### Request-urile ar trebui să fie către:
- `http://192.168.0.12:3003/api/...`
- `http://192.168.0.12:3003/post_docs/...`

## 🌐 Configurare pentru alte IP-uri

Dacă IP-ul se schimbă, actualizează:

1. **`setupProxy.js`**:
```javascript
target: 'http://NOUi_IP:3003'
Origin: 'http://NOUi_IP:3002'
```

2. **Restart frontend cu noul IP**:
```bash
HOST=NOUi_IP PORT=3002 REACT_APP_ENV=production npm start
```

## 📱 Accesul de pe alte dispozitive

De pe telefon/alte laptop-uri în aceeași rețea:
- Accesează: `http://192.168.0.12:3002`
- Asigură-te că firewall-ul permite accesul pe portul 3002

## ✅ Verificare Finală

1. ✅ Backend rulează pe `192.168.0.12:3003`
2. ✅ Frontend rulează pe `192.168.0.12:3002`  
3. ✅ `REACT_APP_ENV=production` setat
4. ✅ Proxy configurația corectă în `setupProxy.js`
5. ✅ CORS permite IP-ul în backend

**După acești pași, aplicația ar trebui să funcționeze perfect pe `http://192.168.0.12:3002`! 🎉** 