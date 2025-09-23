# EDMS Sync Agent - Deployment Guide

## 📋 Overview

This guide explains how to build and deploy the EDMS Sync Agent for multi-user distribution. Each user can install and run their own instance of the application.

## 🚀 Quick Start

### 1. Build the Application

```bash
cd sync-agent

# Build for current platform
npm run deploy

# Build for specific platform
npm run deploy-win    # Windows
npm run deploy-mac    # macOS
npm run deploy-linux  # Linux
npm run deploy-all    # All platforms
```

### 2. Distribute the Application

After building, installer files will be available in the `dist/` directory:
- **Windows**: `EDMS Sync Agent-1.0.0-win32-x64.exe` (installer) and `EDMS Sync Agent-1.0.0-portable-x64.exe` (portable)
- **macOS**: `EDMS Sync Agent-1.0.0-mac.dmg`
- **Linux**: `EDMS Sync Agent-1.0.0-linux-x64.AppImage`, `.deb`, and `.rpm` packages

## 🌐 Web Distribution

### Server Setup

1. **Copy installers to server**:
   ```bash
   cp sync-agent/dist/* /path/to/web/server/downloads/
   ```

2. **Access download page**:
   - Visit: `http://192.168.0.12:3000/download-app`
   - Users can download the appropriate installer for their OS

### Direct Download Links

- **Windows Installer**: `http://192.168.0.12:3000/downloads/EDMS Sync Agent-1.0.0-win32-x64.exe`
- **Windows Portable**: `http://192.168.0.12:3000/downloads/EDMS Sync Agent-1.0.0-portable-x64.exe`
- **macOS**: `http://192.168.0.12:3000/downloads/EDMS Sync Agent-1.0.0-mac.dmg`
- **Linux AppImage**: `http://192.168.0.12:3000/downloads/EDMS Sync Agent-1.0.0-linux-x64.AppImage`

## 👥 Multi-User Support

### How It Works

1. **Individual Installations**: Each user downloads and installs their own copy
2. **Separate Data**: Each installation maintains its own data and settings
3. **Concurrent Sessions**: Multiple users can run the application simultaneously
4. **Individual Authentication**: Each user logs in with their own EDMS credentials

### User Flow

1. **Access Web Interface**: User visits `http://192.168.0.12:3002/login`
2. **Login**: User authenticates with their credentials
3. **Download**: User clicks "Download Desktop App" or visits `/download-app`
4. **Install**: User runs the installer and follows installation wizard
5. **Launch**: User opens the installed application
6. **Login**: User enters their EDMS credentials in the desktop app
7. **Sync**: Application automatically syncs documents

## 🔧 Configuration

### Environment Variables

The application uses these environment variables:

```bash
NODE_ENV=production          # Production mode
DB_HOST=192.168.0.12        # Database host
DB_USER=root                # Database user
DB_PASSWORD=                # Database password
DB_NAME=digital_documents_db # Database name
DB_PORT=3306                # Database port
API_URL=http://192.168.0.12:3000 # Backend API URL
```

### Build Configuration

Edit `package.json` build section to customize:
- App name and version
- Icons and assets
- Target platforms
- Installer options

## 📦 Installation Types

### Windows

1. **NSIS Installer** (`.exe`):
   - Full installation with Start Menu shortcuts
   - Desktop shortcut option
   - Uninstaller included
   - Auto-start option

2. **Portable** (`.exe`):
   - No installation required
   - Run directly from any folder
   - Perfect for USB drives or temporary use

### macOS

1. **DMG Package** (`.dmg`):
   - Standard macOS installer
   - Drag & drop to Applications folder
   - Code signing for security (if configured)

### Linux

1. **AppImage** (`.AppImage`):
   - Portable application
   - No installation required
   - Works on most Linux distributions

2. **DEB Package** (`.deb`):
   - For Debian/Ubuntu systems
   - Install with `sudo dpkg -i filename.deb`

3. **RPM Package** (`.rpm`):
   - For Red Hat/CentOS/Fedora systems
   - Install with `sudo rpm -i filename.rpm`

## 🔄 Updates

### Automatic Updates

The application is configured for automatic updates:
- Checks for updates on startup
- Downloads and installs updates automatically
- Users are notified when updates are available

### Manual Updates

To update manually:
1. Download the latest installer
2. Run the installer (it will update the existing installation)
3. Restart the application

## 🛠️ Troubleshooting

### Common Issues

1. **Application won't start**:
   - Check if another instance is running
   - Verify network connectivity to server
   - Check Windows Defender/antivirus settings

2. **Login fails**:
   - Verify server URL is correct
   - Check username/password
   - Ensure database is running

3. **Sync not working**:
   - Check WebSocket connection
   - Verify file permissions
   - Check server logs

### Debug Mode

Run in development mode for debugging:
```bash
npm run dev
```

## 📊 Monitoring

### Server Logs

Check backend logs for:
- User connections
- WebSocket events
- File synchronization
- Error messages

### Application Logs

Check application logs in:
- **Windows**: `%APPDATA%\EDMS Sync Agent\logs\`
- **macOS**: `~/Library/Logs/EDMS Sync Agent/`
- **Linux**: `~/.config/EDMS Sync Agent/logs/`

## 🔐 Security

### Best Practices

1. **Use HTTPS** in production
2. **Code signing** for installers
3. **Secure database** connections
4. **Regular updates** for security patches
5. **User access control** in backend

### Permissions

The application requires:
- Network access (for API communication)
- File system access (for document sync)
- Local storage (for user data)

## 📈 Scaling

### Multiple Servers

For larger deployments:
1. Use load balancers
2. Implement database clustering
3. Set up CDN for installer distribution
4. Monitor server performance

### Database Optimization

- Regular backups
- Index optimization
- Connection pooling
- Query optimization

## 🎯 Next Steps

1. **Test deployment** in staging environment
2. **Train users** on installation process
3. **Monitor usage** and performance
4. **Plan updates** and maintenance
5. **Collect feedback** from users

## 📞 Support

For technical support:
- Check application logs
- Review server logs
- Contact system administrator
- Submit bug reports with detailed information 