import React, { useState, useEffect } from 'react';
import FolderSidebar from '../components/FolderSidebar';
import { backend } from '../config';

const Sidebar = () => {
  // Mock data for folders - you can replace this with real data
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [currentPath, setCurrentPath] = useState('');

  // Fetch folders
  const fetchFolders = async () => {
    try {
      const response = await fetch(`${backend}/post_docs/folders`, {
        credentials: 'include',
        headers: { 'Origin': window.location.origin }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch folders');
      }

      const data = await response.json();
      if (data.folders) {
        setFolders(data.folders);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  const showSuccess = (message) => {
    console.log('Success:', message);
  };

  const showError = (title, message) => {
    console.error('Error:', title, message);
  };

  const handleMoveFolder = async (sourcePath, destinationPath) => {
    try {
      const response = await fetch(`${backend}/post_docs/folders/move`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourcePath: sourcePath,
          destinationPath: destinationPath || ''
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to move folder');
      }

      showSuccess('Folder moved successfully');
      await fetchFolders();
    } catch (error) {
      console.error('Error moving folder:', error);
      showError('Failed to move folder: ' + error.message);
    }
  };

  return (
    <FolderSidebar
      currentPath={currentPath}
      folders={folders}
      currentFolder={currentFolder}
      draggedItem={null}
      isDragging={false}
      onRefreshFolders={fetchFolders}
      onRefreshDocuments={() => {}} // Not needed for SuperAdmin
      onFolderSelect={async (folder) => {
        if (folder.name === 'Root') {
          setCurrentFolder(null);
          setCurrentPath('');
        } else {
          setCurrentFolder(folder);
          setCurrentPath(folder.folder_path || folder.name);
        }
      }}
      onNewFolder={() => {
        // Handle new folder creation
        console.log('Create new folder');
      }}
      onDeleteFolder={(folder) => {
        // Handle folder deletion
        console.log('Delete folder:', folder);
      }}
      onRenameFolder={(folder) => {
        // Handle folder rename
        console.log('Rename folder:', folder);
      }}
      onTogglePrivate={(folder) => {
        // Handle private toggle
        console.log('Toggle private:', folder);
      }}
      onNavigateToRecycleBin={() => {
        // Handle recycle bin navigation
        console.log('Navigate to recycle bin');
      }}
      onMoveFolder={handleMoveFolder}
      showSuccess={showSuccess}
      showError={showError}
    />
  );
};

export default Sidebar; 