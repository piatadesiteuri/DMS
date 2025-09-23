# 🌐 EDMS Network Access Guide

## 📍 **Current Network Configuration**

### **Server Information**
- **Host IP:** `192.168.0.12`
- **Frontend URL:** `http://192.168.0.12:3002`
- **Backend API:** `http://192.168.0.12:3003`
- **Login Page:** `http://192.168.0.12:3002/login`

### **Service Status**
✅ Frontend (React) - Running on `192.168.0.12:3002`  
✅ Backend (Node.js) - Running on `192.168.0.12:3003`  
✅ Database (MySQL) - Connected and operational  
✅ WebSocket (Real-time sync) - Active  
✅ CORS - Configured for local network access  

## 🔗 **Access URLs**

### **For Web Browser Access:**
```
Main Application: http://192.168.0.12:3002
Login Page:       http://192.168.0.12:3002/login
Admin Panel:      http://192.168.0.12:3002/admin
```

### **For Mobile/Tablet Access:**
```
http://192.168.0.12:3002/login
```

### **For Electron Desktop App:**
- Download and install the EDMS Sync Agent
- The app will auto-connect to `192.168.0.12:3003`

## 📱 **How to Access from Other Devices**

### **From Another PC/Laptop:**
1. Open any web browser (Chrome, Firefox, Safari, Edge)
2. Navigate to: `http://192.168.0.12:3002/login`
3. Login with your EDMS credentials
4. ✅ You should see the full EDMS interface

### **From Mobile Device:**
1. Connect to the same WiFi network
2. Open mobile browser
3. Navigate to: `http://192.168.0.12:3002/login`
4. ✅ Mobile-responsive interface will load

### **From Tablet:**
1. Connect to the same WiFi network  
2. Open browser (Safari, Chrome, etc.)
3. Navigate to: `http://192.168.0.12:3002/login`
4. ✅ Tablet-optimized interface will load

## 🔧 **Network Requirements**

### **All devices must be on the same network:**
- **WiFi Network:** Same WiFi network as the server
- **LAN Network:** Same local area network (192.168.0.x)
- **Port Access:** Devices must be able to reach ports 3002 and 3003

### **Supported IP Ranges:**
- `192.168.0.x` (Primary network)
- `192.168.1.x` (Alternative local network)
- `10.x.x.x` (Corporate networks)
- `172.16.x.x` (Extended networks)

## 🧪 **Testing Network Access**

### **Quick Test Commands:**
```bash
# Test if frontend is accessible
curl -I http://192.168.0.12:3002

# Test if backend is accessible  
curl -I http://192.168.0.12:3003/health

# Test login page
curl http://192.168.0.12:3002/login
```

### **From Windows PC:**
```cmd
# Test connection
ping 192.168.0.12
telnet 192.168.0.12 3002
```

### **From Mac/Linux:**
```bash
# Test connection
ping 192.168.0.12
nc -zv 192.168.0.12 3002
nc -zv 192.168.0.12 3003
```

## 🛠️ **Troubleshooting**

### **If you can't access from another device:**

1. **Check Network Connection:**
   ```bash
   ping 192.168.0.12
   ```

2. **Check Firewall (Windows):**
   - Windows Defender Firewall → Allow apps through firewall
   - Add browser to exceptions

3. **Check Firewall (Mac):**
   - System Preferences → Security & Privacy → Firewall
   - Ensure firewall allows connections

4. **Check Router Settings:**
   - Ensure client isolation is disabled
   - Check if devices are on same subnet

### **Common Issues:**

| Issue | Solution |
|-------|----------|
| "Can't reach site" | Check IP address and port |
| "Connection refused" | Check if services are running |
| "CORS error" | Contact admin - may need IP whitelist |
| "Slow loading" | Check WiFi signal strength |

## 🔄 **Real-Time Features**

### **Features that work across network:**
✅ **File Upload** - Upload from any device  
✅ **Document View** - View PDFs from any device  
✅ **Search** - Full-text search across network  
✅ **User Management** - Admin functions accessible  
✅ **Real-time Sync** - Changes sync between devices  
✅ **Drag & Drop** - Desktop app syncs with web  

## 📞 **Support Information**

### **Current Configuration:**
- **Server:** MacBook Pro (macOS)
- **Network:** 192.168.0.x subnet
- **Services:** All operational and network-accessible
- **Last Updated:** $(date)

### **Contact for Issues:**
- Check this document first
- Verify network connectivity  
- Contact system administrator

---
**✅ Ready for multi-device access!** 