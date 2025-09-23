import { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { backend } from '../config';
import { logRequest } from '../utils/requestMonitor';
const NotificationContext = createContext();

// Create a single socket instance
let socketInstance = null;

const createSocket = () => {
  if (!socketInstance) {
    socketInstance = io(`${backend}`, {
      reconnection: true,
      reconnectionAttempts: 3, // Reduced from 5
      reconnectionDelay: 2000, // Increased from 1000
      reconnectionDelayMax: 10000, // Increased from 5000
      timeout: 30000, // Increased from 20000
      autoConnect: true,
      transports: ['websocket'], // Use only WebSocket transport
      withCredentials: true,
      path: '/socket.io',
      forceNew: false, // Don't force new connection
      upgrade: true,
      rememberUpgrade: true,
      rejectUnauthorized: false,
      // Add additional optimizations
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 10000,
      maxHttpBufferSize: 1e8,
      // Disable polling
      polling: false
    });

    // Add global error handler
    socketInstance.on('error', (error) => {
      console.error('Socket.IO error:', error);
    });

    // Add global connection state logging
    socketInstance.on('connect', () => {
      console.log('Socket.IO connected with ID:', socketInstance.id);
      console.log('Transport:', socketInstance.io.engine.transport.name);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
    });

    // Handle file system updates
    socketInstance.on('fileSystemUpdate', (data) => {
      console.log('Received fileSystemUpdate event:', data);
      console.log('Event from Electron:', data.fromElectron);
      
      // Handle different types of file system updates
      switch (data.type) {
        case 'create_folder':
          console.log('Folder created:', data.folderPath);
          // Dispatch custom event for folder creation
          window.dispatchEvent(new CustomEvent('folderCreated', { 
            detail: { folderPath: data.folderPath } 
          }));
          break;

        case 'remove_folder':
          console.log('Folder removed:', data.folderPath);
          // Dispatch custom event for folder removal
          window.dispatchEvent(new CustomEvent('folderRemoved', { 
            detail: { folderPath: data.folderPath } 
          }));
          break;

        case 'refresh_folder':
          console.log('Refreshing folder:', data.folderPath);
          // Dispatch custom event for folder refresh
          window.dispatchEvent(new CustomEvent('folderRefreshed', { 
            detail: { folderPath: data.folderPath } 
          }));
          break;

        case 'add':
        case 'move':
        case 'delete':
          console.log('File operation:', data.type, data.sourcePath);
          console.log('From Electron:', data.fromElectron);
          
          // Special handling for moves from Electron
          if (data.type === 'move' && data.fromElectron) {
            console.log('🔄 === REACT: Processing MOVE from Electron ===');
            console.log('📄 Document:', data.documentName);
            console.log('📤 Source:', data.sourcePath);
            console.log('📥 Target:', data.targetFolder);
            
            // Dispatch special event for Electron moves
            window.dispatchEvent(new CustomEvent('electronMove', { 
              detail: {
                ...data,
                message: `Document "${data.documentName}" moved by Electron app`
              }
            }));
          }
          
          // Dispatch custom event for file operations
          window.dispatchEvent(new CustomEvent('fileOperation', { 
            detail: data 
          }));
          break;

        default:
          console.log('Unknown file system update type:', data.type);
      }
    });

    // Handle file system change acknowledgments
    socketInstance.on('fileSystemChangeAck', (response) => {
      console.log('Received fileSystemChangeAck:', response);
      if (!response.success) {
        console.error('File system change failed:', response.message);
        // Dispatch error event
        window.dispatchEvent(new CustomEvent('fileSystemError', { 
          detail: { message: response.message, error: response.error } 
        }));
      }
    });
  }
  return socketInstance;
};

export const getSocket = () => {
  return socketInstance || createSocket();
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [pollingInterval, setPollingInterval] = useState(null);

  // Fetch existing notifications with throttling
  let lastFetchTime = 0;
  const fetchNotifications = async () => {
    // Throttle: minimum 10 seconds between fetches
    const now = Date.now();
    if (now - lastFetchTime < 10000) {
      console.log('Throttling notification fetch, too soon since last call');
      return;
    }
    lastFetchTime = now;
    
    try {
      console.log('Fetching existing notifications');
      logRequest('/api/admin/notifications', 'GET');
      const response = await fetch(`${backend}/api/admin/notifications`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      console.log('Fetched notifications:', data);
      
      // Transform the data to match the expected format
      const transformedNotifications = data.map(notification => ({
        _id: notification.id_request,
        id_request: notification.id_request,
        type: notification.request_type,
        userId: notification.user_id,
        current_usage: notification.current_usage,
        plan_limit: notification.plan_limit,
        reason: notification.reason,
        timestamp: notification.created_at,
        status: notification.status || 'pending',
        read: notification.status === 'approved',
        userName: (notification.prenom && notification.nom)
          ? `${notification.prenom} ${notification.nom}`
          : (notification.userName || 'Unknown User'),
        userEmail: notification.email || ''
      }));

      setNotifications(transformedNotifications);
      // Count only pending notifications
      const pendingCount = transformedNotifications.filter(n => n.status === 'pending').length;
      setUnreadCount(pendingCount);
      setForceUpdate(prev => prev + 1); // Force re-render
      console.log('Updated unread count:', pendingCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Start polling for notifications - OPTIMIZED
  const startPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    const interval = setInterval(() => {
      console.log('Polling for new notifications...');
      fetchNotifications();
    }, 30000); // Poll every 30 seconds instead of 5
    
    setPollingInterval(interval);
    console.log('Started notification polling every 30 seconds');
  };

  // Stop polling
  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
      console.log('Stopped notification polling');
    }
  };

  // Handle page visibility change - OPTIMIZED
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      console.log('Page became visible, refreshing notifications...');
      // Don't fetch immediately, respect throttling
      setTimeout(() => {
        fetchNotifications();
      }, 2000); // Wait 2 seconds before fetching
    }
  };

  useEffect(() => {
    console.log('Initializing notification system with WebSocket + Polling');
    const socket = getSocket();

    // Start polling immediately
    fetchNotifications();
    startPolling();

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    socket.on('connect', async () => {
      console.log('Connected to notification server');
      console.log('Socket ID:', socket.id);
      console.log('Transport:', socket.io.engine.transport.name);
      setIsConnected(true);
      
      // Refresh notifications when connected
      fetchNotifications();
      
      // Get user info and subscribe to WebSocket events
      try {
        const response = await fetch(`${backend}/session-check`, {
          credentials: 'include'
        });
        const sessionData = await response.json();
        console.log('Session data for socket subscription:', sessionData);
        
        if (sessionData.valid && sessionData.id_user && sessionData.institution_id) {
          // Subscribe to updates using user ID
          const subscriptionData = {
            userId: sessionData.id_user,
            institutionId: sessionData.institution_id
          };
          console.log('React: Sending subscription data:', subscriptionData);
          
          socket.emit('subscribe', subscriptionData, (response) => {
            console.log('React: Subscription response:', response);
            if (!response || !response.success) {
              console.error('React: Subscription failed:', response);
            }
          });
        } else {
          console.warn('React: Invalid session data for subscription');
        }
      } catch (error) {
        console.error('Error getting user info for subscription:', error);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      console.error('Error details:', {
        message: error.message,
        description: error.description,
        context: error.context
      });
      setIsConnected(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from notification server:', reason);
      console.log('Previous transport:', socket.io.engine.transport.name);
      setIsConnected(false);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected to notification server after', attemptNumber, 'attempts');
      console.log('New transport:', socket.io.engine.transport.name);
      setIsConnected(true);
    });

    socket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
    });

    socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect to notification server');
    });

    // Listen for new notifications - single handler for all notification types
    socket.on('newNotification', (notification) => {
      console.log('Received new notification:', notification);
      // Compose userName from prenom and nom if available
      const mappedNotification = {
        ...notification,
        userName: (notification.prenom && notification.nom)
          ? `${notification.prenom} ${notification.nom}`
          : (notification.userName || 'Unknown User'),
        userEmail: notification.email || ''
      };
      setNotifications(prev => {
        // Check if notification already exists
        const exists = prev.some(n => n.id_request === mappedNotification.id_request);
        if (exists) {
          return prev;
        }
        const newNotification = [mappedNotification, ...prev];
        // Update unread count based on pending notifications
        const pendingCount = newNotification.filter(n => n.status === 'pending').length;
        setUnreadCount(pendingCount);
        setForceUpdate(prev => prev + 1); // Force re-render
        return newNotification;
      });
      // Also refresh notifications from server to ensure sync
      fetchNotifications();
    });

    // Listen for storage upgrade requests
    socket.on('storageUpgradeRequest', (notification) => {
      console.log('Received storage upgrade request:', notification);
      // Compose userName from prenom and nom if available
      const formattedNotification = {
        _id: notification.requestId || notification.id_request,
        id_request: notification.requestId || notification.id_request,
        type: notification.type || 'storage_upgrade',
        userId: notification.userId,
        current_usage: notification.current_usage,
        plan_limit: notification.plan_limit,
        reason: notification.reason,
        timestamp: notification.timestamp,
        status: 'pending',
        read: false,
        userName: (notification.prenom && notification.nom)
          ? `${notification.prenom} ${notification.nom}`
          : (notification.userName || 'Unknown User'),
        userEmail: notification.userEmail || ''
      };
      setNotifications(prev => {
        // Check if notification already exists
        const exists = prev.some(n => n.id_request === formattedNotification.id_request);
        if (exists) {
          return prev;
        }
        const newNotification = [formattedNotification, ...prev];
        // Update unread count based on pending notifications
        const pendingCount = newNotification.filter(n => n.status === 'pending').length;
        setUnreadCount(pendingCount);
        setForceUpdate(prev => prev + 1); // Force re-render
        return newNotification;
      });
      // Sincronizează cu backend-ul pentru a actualiza instant badge-ul și dropdown-ul
      fetchNotifications();
    });

    return () => {
      // Cleanup polling and event listeners
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Don't disconnect the socket here, just remove the listeners
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('reconnect');
      socket.off('reconnect_error');
      socket.off('reconnect_failed');
      socket.off('newNotification');
      socket.off('storageUpgradeRequest');
    };
  }, []);

  const sendUploadRequest = async (data) => {
    console.log('Sending upload request with data:', data);
    const socket = getSocket();
    if (!socket.connected) {
      console.error('Not connected to notification server');
      throw new Error('Not connected to notification server');
    }

    try {
      // First send via HTTP
      console.log('Sending HTTP request to /api/notifications/upload-request');
      const response = await fetch(`${backend}/api/notifications/upload-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          type: 'upload_request',
          timestamp: new Date().toISOString(),
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('HTTP request failed:', response.status, response.statusText);
        throw new Error('Failed to send upload request');
      }

      // Then emit via WebSocket
      console.log('Emitting WebSocket event uploadRequest');
      socket.emit('uploadRequest', {
        ...data,
        type: 'upload_request',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error sending upload request:', error);
      throw error;
    }
  };

  const sendStorageUpgradeRequest = async (data) => {
    console.log('Sending storage upgrade request with data:', data);
    const socket = getSocket();
    if (!socket.connected) {
      console.error('Not connected to notification server');
      throw new Error('Not connected to notification server');
    }

    try {
      // First send via HTTP
      console.log('Sending HTTP request to /api/admin/storage-upgrade-request');
      const response = await fetch(`${backend}/api/admin/storage-upgrade-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          type: 'storage_upgrade',
          timestamp: new Date().toISOString(),
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('HTTP request failed:', response.status, response.statusText);
        throw new Error('Failed to send storage upgrade request');
      }

      // Then emit via WebSocket
      console.log('Emitting WebSocket event storageUpgradeRequest');
      socket.emit('storageUpgradeRequest', {
        ...data,
        type: 'storage_upgrade',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error sending storage upgrade request:', error);
      throw error;
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      console.log('Marking notification as read:', notificationId);
      const response = await fetch(`${backend}/api/admin/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark notification as read');
      }

      const data = await response.json();
      console.log('Mark as read response:', data);

      // Update local state
      setNotifications(prevNotifications => {
        const updatedNotifications = prevNotifications.map(notification => 
          notification.id_request === notificationId 
            ? { ...notification, status: 'approved', read: true }
            : notification
        );

        // Recalculate unread count based on pending notifications
        const pendingCount = updatedNotifications.filter(n => n.status === 'pending').length;
        setUnreadCount(pendingCount);
        setForceUpdate(prev => prev + 1); // Force re-render

        return updatedNotifications;
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    sendUploadRequest,
    sendStorageUpgradeRequest,
    markAsRead,
    isConnected,
    forceUpdate
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext; 