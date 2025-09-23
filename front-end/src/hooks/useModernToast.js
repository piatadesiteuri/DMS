import { useState, useCallback } from 'react';

const useModernToast = () => {
  const [toasts, setToasts] = useState([]);
  const [nextId, setNextId] = useState(1);

  const addToast = useCallback(({
    title,
    message,
    type = 'info', // 'success', 'error', 'warning', 'info', 'folder_create', 'rocket'
    duration = 5000,
    folderInfo = null
  }) => {
    const toast = {
      id: nextId,
      title,
      message,
      type,
      duration,
      folderInfo,
      createdAt: new Date().toISOString()
    };

    setToasts(prev => [...prev, toast]);
    setNextId(prev => prev + 1);

    // Auto-remove after duration
    setTimeout(() => {
      removeToast(toast.id);
    }, duration);

    return toast.id;
  }, [nextId]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Specific toast creators for different real-time events
  const showFolderCreateToast = useCallback((folderData) => {
    return addToast({
      title: '🎉 New Folder Created!',
      message: `A new folder "${folderData.folderName}" has been added with documents.`,
      type: 'folder_create',
      duration: 6000,
      folderInfo: {
        name: folderData.folderName,
        path: folderData.folderPath,
        documentCount: folderData.documentCount || 0
      }
    });
  }, [addToast]);

  const showDocumentAddToast = useCallback((documentData) => {
    return addToast({
      title: '📄 Document Added!',
      message: `"${documentData.documentName}" was added to the folder.`,
      type: 'success',
      duration: 4000
    });
  }, [addToast]);

  const showMoveToast = useCallback((moveData) => {
    const isSource = moveData.eventType === 'move_source';
    return addToast({
      title: isSource ? '📤 Document Moved Out' : '📥 Document Moved In',
      message: isSource 
        ? `"${moveData.documentName}" was moved to another folder.`
        : `"${moveData.documentName}" was moved to this folder.`,
      type: 'info',
      duration: 4000
    });
  }, [addToast]);

  const showDeleteToast = useCallback((deleteData) => {
    return addToast({
      title: '🗑️ Document Deleted',
      message: `"${deleteData.documentName}" was moved to recycle bin.`,
      type: 'warning',
      duration: 4000
    });
  }, [addToast]);

  const showRestoreToast = useCallback((restoreData) => {
    return addToast({
      title: '♻️ Document Restored',
      message: `"${restoreData.documentName}" was restored from recycle bin.`,
      type: 'success',
      duration: 4000
    });
  }, [addToast]);

  const showSyncSuccessToast = useCallback((syncData) => {
    return addToast({
      title: '🚀 Real-Time Sync!',
      message: 'Your documents are synchronized across all devices.',
      type: 'rocket',
      duration: 3000
    });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    // Event-specific toast creators
    showFolderCreateToast,
    showDocumentAddToast,
    showMoveToast,
    showDeleteToast,
    showRestoreToast,
    showSyncSuccessToast
  };
};

export default useModernToast; 