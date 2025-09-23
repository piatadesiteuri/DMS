import React from 'react';
import { backend } from '../config';
import useWebSocket from '../hooks/useWebSocket';
import useModernToast from '../hooks/useModernToast';
import ModernToast from './ModernToast';

const RealTimeSync = ({ 
  children, 
  userId, 
  currentPath = '',
  onDataChanged 
}) => {
  const {
    toasts,
    removeToast,
    showFolderCreateToast,
    showDocumentAddToast,
    showMoveToast,
    showDeleteToast,
    showRestoreToast,
    showSyncSuccessToast
  } = useModernToast();

  // WebSocket event handlers
  const handleFolderCreate = (data) => {
    console.log('\n🎉 === REACT: Processing folder creation ===');
    console.log('📁 Folder data:', data);
    
    // Show beautiful toast notification
    showFolderCreateToast({
      folderName: data.folderName,
      folderPath: data.folderPath || data.parentPath,
      documentCount: 0 // Will be updated when documents are processed
    });

    // Trigger data refresh if current path matches
    if (shouldRefreshForPath(data.parentPath || data.folderPath, currentPath)) {
      console.log('🔄 Triggering data refresh for folder creation');
      if (onDataChanged) {
        onDataChanged('folder_create', data);
      }
    }
  };

  const handleDocumentAdd = (data) => {
    console.log('\n📄 === REACT: Processing document addition ===');
    console.log('📄 Document data:', data);
    
    // Show toast notification
    showDocumentAddToast({
      documentName: data.documentName || data.fileName || 'New Document'
    });

    // Trigger data refresh if current path matches
    if (shouldRefreshForPath(data.sourceFolder || data.folderPath, currentPath)) {
      console.log('🔄 Triggering data refresh for document addition');
      if (onDataChanged) {
        onDataChanged('document_add', data);
      }
    }

    // Show sync success toast for extra feedback
    setTimeout(() => {
      showSyncSuccessToast();
    }, 1000);
  };

  const handleMove = (data) => {
    console.log('\n🔄 === REACT: Processing move operation ===');
    console.log('🔄 Move data:', data);
    
    // Show toast notification
    showMoveToast(data);

    // Trigger data refresh for both source and target paths if they match current path
    const sourcePath = data.sourceFolder || data.sourcePath;
    const targetPath = data.targetFolder || data.destinationPath;
    
    if (shouldRefreshForPath(sourcePath, currentPath) || shouldRefreshForPath(targetPath, currentPath)) {
      console.log('🔄 Triggering data refresh for move operation');
      if (onDataChanged) {
        onDataChanged('move', data);
      }
    }
  };

  const handleDelete = (data) => {
    console.log('\n🗑️ === REACT: Processing delete operation ===');
    console.log('🗑️ Delete data:', data);
    
    // Show toast notification
    showDeleteToast({
      documentName: data.documentName || 'Document'
    });

    // Trigger data refresh if current path matches
    if (shouldRefreshForPath(data.sourceFolder || data.sourcePath, currentPath)) {
      console.log('🔄 Triggering data refresh for delete operation');
      if (onDataChanged) {
        onDataChanged('delete', data);
      }
    }
  };

  const handleRestore = (data) => {
    console.log('\n♻️ === REACT: Processing restore operation ===');
    console.log('♻️ Restore data:', data);
    
    // Show toast notification
    showRestoreToast({
      documentName: data.documentName || 'Document'
    });

    // Trigger data refresh if current path matches
    if (shouldRefreshForPath(data.targetPath || data.sourceFolder, currentPath)) {
      console.log('🔄 Triggering data refresh for restore operation');
      if (onDataChanged) {
        onDataChanged('restore', data);
      }
    }
  };

  // Helper function to determine if we should refresh for a given path
  const shouldRefreshForPath = (eventPath, currentPath) => {
    if (!eventPath && !currentPath) return true; // Both are root
    if (!eventPath || !currentPath) return false;
    
    // Clean paths for comparison
    const cleanEventPath = eventPath.replace(/^\/+|\/+$/g, '');
    const cleanCurrentPath = currentPath.replace(/^\/+|\/+$/g, '');
    
    console.log('🔍 Path comparison:', {
      event: cleanEventPath,
      current: cleanCurrentPath,
      match: cleanEventPath === cleanCurrentPath
    });
    
    return cleanEventPath === cleanCurrentPath;
  };

  // Initialize WebSocket connection
  const { socket, isConnected } = useWebSocket({
    backend,
    userId,
    enabled: !!userId,
    onFolderCreate: handleFolderCreate,
    onDocumentAdd: handleDocumentAdd,
    onMove: handleMove,
    onDelete: handleDelete,
    onRestore: handleRestore
  });

  console.log('🔌 WebSocket status:', { isConnected, userId, currentPath });

  return (
    <>
      {children}
      <ModernToast toasts={toasts} removeToast={removeToast} />
      
      {/* Connection status indicator (optional) */}
      {userId && (
        <div className="fixed bottom-4 left-4 z-40">
          <div className={`
            px-3 py-1 rounded-full text-xs font-medium transition-all duration-300
            ${isConnected 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
            }
          `}>
            <div className="flex items-center gap-2">
              <div className={`
                w-2 h-2 rounded-full 
                ${isConnected ? 'bg-green-500' : 'bg-red-500'}
              `} />
              <span>
                {isConnected ? 'Real-time sync active' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RealTimeSync; 