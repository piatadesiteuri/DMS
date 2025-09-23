# Real-Time Sync Integration Guide

## Overview
This guide shows how to integrate real-time synchronization between React frontend and Electron sync-agent.

## Files Created
1. `src/components/ModernToast.js` - Beautiful toast notification component
2. `src/hooks/useWebSocket.js` - WebSocket connection management
3. `src/hooks/useModernToast.js` - Toast state management
4. `src/components/RealTimeSync.js` - Main integration wrapper

## Integration Steps

### Step 1: Install Dependencies
```bash
npm install socket.io-client
```

### Step 2: Import Components in Diffuse.js

Add these imports at the top of `Diffuse.js`:

```javascript
import RealTimeSync from '../components/RealTimeSync';
```

### Step 3: Wrap DiffusePage Component

Find the return statement of DiffusePage and wrap the entire JSX with RealTimeSync:

```javascript
const DiffusePage = () => {
  // ... existing code ...

  // Add this handler function
  const handleRealTimeDataChange = useCallback((eventType, data) => {
    console.log('🔄 Real-time data change:', eventType, data);
    
    // Refresh data based on event type
    switch (eventType) {
      case 'folder_create':
      case 'document_add':
      case 'move':
      case 'delete':
      case 'restore':
        // Call your existing fetchData function
        fetchData();
        break;
      default:
        console.log('Unknown event type:', eventType);
    }
  }, []);

  return (
    <RealTimeSync
      userId={userId}
      currentPath={getCurrentPath()} // Your existing function
      onDataChanged={handleRealTimeDataChange}
    >
      {/* Your existing JSX content */}
      <div className="flex h-screen bg-gray-50">
        {/* ... rest of your component ... */}
      </div>
    </RealTimeSync>
  );
};
```

## Features Included

### 🎉 Modern Toast Notifications
- **Folder Creation**: Shows when new folders are created via Electron
- **Document Addition**: Shows when documents are added via drag & drop
- **Move Operations**: Shows when documents are moved between folders
- **Delete Operations**: Shows when documents are moved to recycle bin
- **Restore Operations**: Shows when documents are restored
- **Sync Status**: Shows real-time sync status

### 🔄 Real-Time Synchronization
- **Automatic Data Refresh**: Refreshes React data when Electron makes changes
- **Path-based Filtering**: Only refreshes if current folder is affected
- **WebSocket Reconnection**: Automatically reconnects if connection is lost
- **Event Type Handling**: Processes all file system events from backend

### 🎨 Beautiful UI
- **Gradient Borders**: Color-coded by event type
- **Smooth Animations**: Spring-based animations using framer-motion
- **Progress Bars**: Shows auto-dismiss countdown
- **Detailed Information**: Shows folder name, document count, paths
- **Connection Status**: Visual indicator of WebSocket connection

## Toast Types

1. **Success** (Green): Document additions, restores
2. **Warning** (Yellow): Delete operations
3. **Info** (Blue): Move operations
4. **Folder Create** (Purple): New folder creation
5. **Rocket** (Blue): Sync success confirmations

## Event Handlers

The system automatically handles these WebSocket events:
- `fileSystemUpdate`: General file system changes
- `refresh_folder`: Specific folder refresh requests

## Path Matching Logic

The system uses intelligent path matching to determine when to refresh:
- Compares event path with current folder path
- Handles both source and target paths for move operations
- Supports root folder operations

## Connection Management

- **Auto-Reconnect**: Exponential backoff reconnection strategy
- **Status Indicator**: Shows connection status in bottom-left corner
- **Error Handling**: Graceful handling of connection errors
- **Multiple Transports**: Uses both WebSocket and polling fallback

## Usage Example

Once integrated, when a user drags and drops folders/documents in Electron:

1. **Electron** processes the files and creates folders/documents
2. **Backend** emits WebSocket events with file system changes
3. **React** receives events and shows beautiful toast notifications
4. **React** automatically refreshes its data to show new content
5. **Users** see real-time updates with professional notifications

The integration provides seamless real-time synchronization between Electron and React applications! 