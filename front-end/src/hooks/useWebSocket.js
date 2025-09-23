import { useEffect, useRef } from 'react';
import io from 'socket.io-client';

const useWebSocket = ({
  backend,
  onFolderCreate,
  onDocumentAdd,
  onMove,
  onDelete,
  onRestore,
  userId,
  enabled = true
}) => {
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!enabled || !backend || !userId) {
      return;
    }

    const connectSocket = () => {
      console.log('🔌 Connecting to WebSocket for real-time sync...');
      
      // Disconnect existing socket
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      // Create new socket connection
      socketRef.current = io(backend, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        forceNew: true,
        autoConnect: true,
        withCredentials: true,
        query: {
          userId: userId,
          source: 'react_frontend'
        }
      });

      // Connection events
      socketRef.current.on('connect', () => {
        console.log('✅ WebSocket connected successfully');
        console.log('🆔 Socket ID:', socketRef.current.id);
        reconnectAttempts.current = 0;
        
        // Clear any reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('❌ WebSocket disconnected:', reason);
        
        // Only attempt to reconnect if not manually disconnected
        if (reason !== 'io client disconnect' && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          
          console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectSocket();
          }, delay);
        }
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('🚫 WebSocket connection error:', error);
      });

      // File system update events
      socketRef.current.on('fileSystemUpdate', (data) => {
        console.log('\n🔄 === REACT: Received fileSystemUpdate event ===');
        console.log('📦 Event data:', JSON.stringify(data, null, 2));
        console.log('📅 Timestamp:', new Date().toISOString());
        console.log('👤 User ID from event:', data.userId);
        console.log('👤 Current user ID:', userId);

        // Process different event types
        switch (data.type) {
          case 'folder_create':
            console.log('📁➕ Processing folder creation event');
            if (onFolderCreate) {
              onFolderCreate(data);
            }
            break;

          case 'add':
          case 'upload':
            console.log('📄➕ Processing document add event');
            if (onDocumentAdd) {
              onDocumentAdd(data);
            }
            break;

          case 'move':
            console.log('🔄 Processing move event');
            if (onMove) {
              onMove(data);
            }
            break;

          case 'delete':
          case 'folder_delete':
            console.log('🗑️ Processing delete event');
            if (onDelete) {
              onDelete(data);
            }
            break;

          case 'restore':
            console.log('♻️ Processing restore event');
            if (onRestore) {
              onRestore(data);
            }
            break;

          default:
            console.log('❓ Unknown event type:', data.type);
        }
      });

      // Specific refresh folder events
      socketRef.current.on('refresh_folder', (data) => {
        console.log('\n🔄 === REACT: Received refresh_folder event ===');
        console.log('📦 Refresh data:', JSON.stringify(data, null, 2));
        
        // Trigger appropriate handler based on event type
        if (data.eventType === 'move_source' || data.eventType === 'move_target') {
          if (onMove) {
            onMove(data);
          }
        } else if (data.eventType === 'delete') {
          if (onDelete) {
            onDelete(data);
          }
        } else if (data.eventType === 'restore') {
          if (onRestore) {
            onRestore(data);
          }
        } else if (data.eventType === 'add' || data.eventType === 'upload') {
          if (onDocumentAdd) {
            onDocumentAdd(data);
          }
        }
      });

      // Error handling
      socketRef.current.on('error', (error) => {
        console.error('🚫 WebSocket error:', error);
      });
    };

    // Initial connection
    connectSocket();

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up WebSocket connection');
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [backend, userId, enabled, onFolderCreate, onDocumentAdd, onMove, onDelete, onRestore]);

  // Return socket instance for manual operations if needed
  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected || false
  };
};

export default useWebSocket; 