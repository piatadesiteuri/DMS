import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { FaFolder, FaFolderPlus, FaCog, FaTrash, FaEdit, FaChevronLeft, FaChevronRight, FaFilePdf, FaArrowRight, FaEye, FaDownload, FaPlus } from 'react-icons/fa';
import path from 'path-browserify';
import { backend } from '../config';

const MoveModal = ({ isOpen, onClose, onMove, currentItem, folders, currentPath, setCurrentFolder }) => {
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderHistory, setFolderHistory] = useState([]);
  const [error, setError] = useState(null);

  const handleFolderClick = (folder) => {
    if (folder.type === 'folder') {
      setFolderHistory([...folderHistory, selectedFolder]);
      setSelectedFolder(folder);
      setError(null);
    }
  };

  const handleBack = () => {
    if (folderHistory.length > 0) {
      const previousFolder = folderHistory[folderHistory.length - 1];
      setSelectedFolder(previousFolder);
      setFolderHistory(folderHistory.slice(0, -1));
      setError(null);
    }
  };

  const handleMove = () => {
    if (selectedFolder) {
      // Check if trying to move file to its current location
      const sourceFolderPath = path.dirname(currentItem.path);
      if (sourceFolderPath === selectedFolder.path) {
        setError('Cannot move file to its current location');
        return; // Don't close the modal
      }

      onMove(currentItem.path, selectedFolder.path);
      // Update currentFolder if we're in the destination folder
      if (currentPath === selectedFolder.path) {
        setCurrentFolder(prev => ({
          ...prev,
          children: [...(prev.children || []), {
            ...currentItem,
            path: `${selectedFolder.path}/${currentItem.name}`
          }]
        }));
      }
      onClose();
    }
  };

  const getCurrentItems = () => {
    if (!selectedFolder) {
      return folders;
    }
    return selectedFolder.children || [];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Move to Folder</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={handleBack}
            disabled={folderHistory.length === 0}
            className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            <FaChevronLeft />
          </button>
          <span className="text-gray-500">
            {selectedFolder ? selectedFolder.path : 'Root'}
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {getCurrentItems().map((item) => (
              <div
                key={item.path}
                onClick={() => handleFolderClick(item)}
                className={`flex items-center gap-2 p-3 border rounded-lg ${
                  item.type === 'folder' 
                    ? 'cursor-pointer hover:bg-gray-50' 
                    : 'cursor-not-allowed opacity-50'
                }`}
                title={item.type === 'folder' ? 'Click to select folder' : 'Only folders can be selected as destination'}
              >
                {item.type === 'folder' ? (
                  <FaFolder className="text-yellow-500" />
                ) : (
                  <FaFilePdf className="text-red-500" />
                )}
                <span className="text-sm">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={!selectedFolder}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Move Here
          </button>
        </div>
      </div>
    </div>
  );
};

const FolderMoveModal = ({ isOpen, onClose, onMove, item, folders, currentFolder, setCurrentFolder }) => {
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderHistory, setFolderHistory] = useState([]);
  const [error, setError] = useState(null);

  const handleFolderClick = (folder) => {
    if (folder.type === 'folder' && (!item || folder.path !== item.path)) {
      setFolderHistory([...folderHistory, selectedFolder]);
      setSelectedFolder(folder);
      setError(null);
    }
  };

  const handleBack = () => {
    if (folderHistory.length > 0) {
      const previousFolder = folderHistory[folderHistory.length - 1];
      setSelectedFolder(previousFolder);
      setFolderHistory(folderHistory.slice(0, -1));
      setError(null);
    }
  };

  const handleMove = () => {
    // Check if trying to move folder to its current location
    const sourceFolderPath = path.dirname(item.path);
    const destinationPath = selectedFolder ? selectedFolder.path : '';
    
    if (sourceFolderPath === destinationPath) {
      setError('Cannot move folder to its current location');
      return; // Don't close the modal
    }

    onMove(item.path, destinationPath);
    onClose();
  };

  const getCurrentItems = () => {
    if (!selectedFolder) {
      return folders;
    }
    return selectedFolder.children || [];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {item ? 'Move Folder' : 'Move Selected Items'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={handleBack}
            disabled={folderHistory.length === 0}
            className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            <FaChevronLeft />
          </button>
          <span className="text-gray-500">
            {selectedFolder ? selectedFolder.path : 'Select a folder'}
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {getCurrentItems().map((folder) => (
              <div
                key={folder.path}
                onClick={() => handleFolderClick(folder)}
                className={`flex items-center gap-2 p-3 border rounded-lg ${
                  folder.type === 'folder' && (!item || folder.path !== item.path)
                    ? 'cursor-pointer hover:bg-gray-50' 
                    : 'cursor-not-allowed opacity-50'
                }`}
                title={folder.type === 'folder' && (!item || folder.path !== item.path) ? 'Click to select folder' : 'Cannot select this folder'}
              >
                <FaFolder className="text-yellow-500" />
                <span className="text-sm">{folder.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={selectedFolder === undefined}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Move Here
          </button>
        </div>
      </div>
    </div>
  );
};

const Item = ({ item, onRename, onDelete, onDragStart, onDragOver, onDrop, onNavigate, setFolders, setSuccess, folders, currentFolder, setCurrentFolder, isSelected, onSelect, isMultiSelectMode, fetchFolders, setRefreshTrigger, setFolderHistory }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newName, setNewName] = useState(item.name);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [error, setError] = useState(null);
  const [displayName, setDisplayName] = useState(
    item.type === 'file' ? item.name.replace(/\.pdf$/i, '') : item.name
  );
  const [showFolderMoveModal, setShowFolderMoveModal] = useState(false);

  const handleDragStart = (e) => {
    e.stopPropagation();
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: item.type,
      path: item.path,
      name: item.name
    }));
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (item.type === 'folder') {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.type === 'folder' && item.type === 'folder') {
        handleFolderMove(data.path, item.path);
      } else if (data.type === 'file' && item.type === 'folder') {
        handleFileMove(data.path, item.path);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
      setError('Failed to move item: ' + error.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleFileMove = async (sourcePath, destinationPath) => {
    try {
      // Check if trying to move file to its current location
      const sourceFolderPath = path.dirname(sourcePath);
      if (sourceFolderPath === destinationPath) {
        setError('Cannot move file to its current location');
        setTimeout(() => setError(null), 3000);
        return;
      }

      const response = await fetch(`${backend}/post_docs/files/move`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourcePath, destinationPath }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to move file');
      }

      const data = await response.json();
      if (data.success) {
        // Get destination folder name
        const getFolderName = (path) => {
          const parts = path.split('/');
          return parts[parts.length - 1] || 'Root';
        };

        const destinationFolderName = getFolderName(destinationPath);
        setSuccess(`File moved successfully to folder "${destinationFolderName}"`);
        setTimeout(() => setSuccess(null), 3000);

        // Update the folders state to reflect the move
        const updateFoldersState = (items) => {
          return items.map(folder => {
            // Remove file from source folder
            if (folder.path === sourceFolderPath) {
              return {
                ...folder,
                children: folder.children.filter(child => child.path !== sourcePath)
              };
            }
            // Add file to destination folder
            if (folder.path === destinationPath) {
              const fileName = path.basename(sourcePath);
              return {
                ...folder,
                children: [...(folder.children || []), {
                  name: fileName,
                  path: `${destinationPath}/${fileName}`,
                  type: 'file',
                  createdAt: new Date()
                }]
              };
            }
            // Recursively update children
            if (folder.children) {
              return {
                ...folder,
                children: updateFoldersState(folder.children)
              };
            }
            return folder;
          });
        };

        // Update the main folders state
        setFolders(prevFolders => updateFoldersState(prevFolders));

        // Update currentFolder based on whether we're in source or destination
        if (currentFolder) {
          const isInSourceFolder = currentFolder.path === sourceFolderPath;
          const isInDestinationFolder = currentFolder.path === destinationPath;

          if (isInSourceFolder) {
            // Remove file from current view if we're in source folder
            setCurrentFolder(prev => ({
              ...prev,
              children: prev.children.filter(child => child.path !== sourcePath)
            }));
          } else if (isInDestinationFolder) {
            // Add file to current view if we're in destination folder
            const fileName = path.basename(sourcePath);
            setCurrentFolder(prev => ({
              ...prev,
              children: [...(prev.children || []), {
                name: fileName,
                path: `${destinationPath}/${fileName}`,
                type: 'file',
                createdAt: new Date()
              }]
            }));
          }
        }

        // Trigger a refresh of the folder list
        setRefreshTrigger(prev => prev + 1);
        
        // Dispatch a custom event to refresh folders
        const folderManager = document.querySelector('.folder-manager');
        if (folderManager) {
          const event = new CustomEvent('refreshFolders');
          folderManager.dispatchEvent(event);
        }

        // Also call fetchFolders to ensure the entire folder structure is updated
        fetchFolders();
      } else {
        setError(data.error || 'Failed to move file');
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      console.error('Error moving file:', error);
      setError('Failed to move file: ' + error.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleFolderMove = async (sourcePath, destinationPath) => {
    try {
      // Only check if source path is provided
      if (!sourcePath) {
        throw new Error('Source path is required');
      }

      // Check if trying to move folder to its current location
      const sourceFolderPath = path.dirname(sourcePath);
      if (sourceFolderPath === destinationPath) {
        setError('Cannot move folder to its current location');
        setTimeout(() => setError(null), 3000);
        return;
      }

      const response = await fetch(`${backend}/post_docs/folders/move`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourcePath: sourcePath,
          destinationPath: destinationPath || '' // Allow empty string for root
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to move folder');
      }

      // Get destination folder name
      const getFolderName = (path) => {
        const parts = path.split('/');
        return parts[parts.length - 1] || 'Root';
      };

      const destinationFolderName = getFolderName(destinationPath);
      setSuccess(`Folder moved successfully to "${destinationFolderName}"`);
      setTimeout(() => setSuccess(null), 3000);

      // Trigger a refresh of the folder list
      setRefreshTrigger(prev => prev + 1);
      
      // Dispatch a custom event to refresh folders
      const folderManager = document.querySelector('.folder-manager');
      if (folderManager) {
        const event = new CustomEvent('refreshFolders');
        folderManager.dispatchEvent(event);
      }

      // Refresh the current folder view
      const refreshCurrentFolder = async () => {
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
            // Find the current folder in the updated structure
            const findFolder = (items, path) => {
              for (const item of items) {
                if (item.path === path) return item;
                if (item.children) {
                  const found = findFolder(item.children, path);
                  if (found) return found;
                }
              }
              return null;
            };

            // Update both source and destination folders if they exist
            if (currentFolder) {
              const sourceFolder = findFolder(data.folders, sourceFolderPath);
              const destinationFolder = findFolder(data.folders, destinationPath);

              if (sourceFolder && currentFolder.path === sourceFolderPath) {
                setCurrentFolder(sourceFolder);
              } else if (destinationFolder && currentFolder.path === destinationPath) {
                setCurrentFolder(destinationFolder);
              }
            }

            // Update the main folders state
            setFolders(data.folders);

            // If we're in the destination folder, navigate to it to refresh the view
            if (currentFolder && currentFolder.path === destinationPath) {
              const destinationFolder = findFolder(data.folders, destinationPath);
              if (destinationFolder) {
                setCurrentFolder(destinationFolder);
              }
            }
          }
        } catch (error) {
          console.error('Error refreshing current folder:', error);
        }
      };

      refreshCurrentFolder();
    } catch (error) {
      console.error('Error moving folder:', error);
      setError('Failed to move folder: ' + error.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleRename = async () => {
    try {
      if (item.type === 'file') {
        // Ensure the new name ends with .pdf
        const newFileName = displayName.endsWith('.pdf') ? displayName : `${displayName}.pdf`;
        
        const response = await fetch(`${backend}/post_docs/files/rename`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            oldPath: item.path,
            newName: newFileName
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to rename file');
        }

        // Calculate the new path
        const newPath = path.join(path.dirname(item.path), newFileName);

        // Update the current folder state
        setCurrentFolder(prevFolder => ({
          ...prevFolder,
          children: prevFolder.children.map(child => 
            child.path === item.path 
              ? { ...child, name: newFileName, path: newPath }
              : child
          )
        }));

        // Update the main folders state
        const updateFoldersState = (items) => {
          return items.map(folder => {
            if (folder.path === item.path) {
              return {
                ...folder,
                name: newFileName,
                path: newPath
              };
            }
            if (folder.children) {
              return {
                ...folder,
                children: updateFoldersState(folder.children)
              };
            }
            return folder;
          });
        };

        setFolders(prevFolders => updateFoldersState(prevFolders));

        setShowRenameModal(false);
        setError(null);
      } else {
        // Handle folder rename
        const response = await fetch(`${backend}/post_docs/folders/rename`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            oldPath: item.path,
            newName: displayName
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to rename folder');
        }

        // Calculate the new path
        const newPath = path.join(path.dirname(item.path), displayName);

        // Update the current folder state
        setCurrentFolder(prevFolder => ({
          ...prevFolder,
          children: prevFolder.children.map(child => 
            child.path === item.path 
              ? { ...child, name: displayName, path: newPath }
              : child
          )
        }));

        // Update the main folders state
        const updateFoldersState = (items) => {
          return items.map(folder => {
            if (folder.path === item.path) {
              return {
                ...folder,
                name: displayName,
                path: newPath
              };
            }
            if (folder.children) {
              return {
                ...folder,
                children: updateFoldersState(folder.children)
              };
            }
            return folder;
          });
        };

        setFolders(prevFolders => updateFoldersState(prevFolders));

        setShowRenameModal(false);
        setError(null);
      }
    } catch (error) {
      console.error('Error renaming:', error);
      setError(error.message || 'Failed to rename item');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDoubleClick = () => {
    if (item.type === 'folder') {
      onNavigate(item);
    } else {
      // Handle PDF file click - you can add download or preview functionality here
      window.open(`${backend}/${item.path}`, '_blank');
    }
  };

  const handleDelete = async () => {
    try {
      console.log("Attempting to delete item:", item);
      
      // Check if item is a PDF file
      if (item.type === 'file' && !item.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('Only PDF files can be deleted');
      }
      
      // For files, use just the filename if it's in the current folder
      let deletePath = item.path;
      if (item.type === 'file' && currentFolder) {
        deletePath = item.name;
      }
      
      // Delete the item
      const response = await fetch(`${backend}/post_docs/${item.type === 'folder' ? 'folders' : 'files'}/${encodeURIComponent(deletePath)}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete ${item.type}`);
      }

      // Immediately update the current folder view to remove the deleted item
      if (currentFolder && currentFolder.children) {
        setCurrentFolder(prev => ({
          ...prev,
          children: prev.children.filter(child => child.path !== item.path)
        }));
      }

      // Update the folders state to remove the item
      setFolders(prevFolders => {
        const removeItem = (items) => {
          return items.filter(folder => {
            if (folder.path === item.path) return false;
            if (folder.children) {
              folder.children = removeItem(folder.children);
            }
            return true;
          });
        };
        return removeItem(prevFolders);
      });

      setSuccess(`${item.type === 'folder' ? 'Folder' : 'File'} moved to recycle bin`);
      setTimeout(() => setSuccess(null), 3000);
      
      // Force a complete refresh of the folder structure
      await fetchFolders();
      
      // Trigger a refresh of the folder list
      setRefreshTrigger(prev => prev + 1);
      
      // Dispatch a custom event to refresh folders
      const folderManager = document.querySelector('.folder-manager');
      if (folderManager) {
        const event = new CustomEvent('refreshFolders');
        folderManager.dispatchEvent(event);
      }

      // If we're in a folder and deleted a file, force refresh the current folder content
      if (currentFolder && item.type === 'file') {
        try {
          // Force a complete refresh of the current folder
          const response = await fetch(`${backend}/post_docs/folders`, {
            credentials: 'include',
            headers: { 'Origin': window.location.origin }
          });

          if (!response.ok) {
            throw new Error('Failed to fetch folders');
          }

          const data = await response.json();
          if (data.folders) {
            // Find the current folder in the updated structure
            const findFolder = (items, path) => {
              for (const item of items) {
                if (item.path === path) return item;
                if (item.children) {
                  const found = findFolder(item.children, path);
                  if (found) return found;
                }
              }
              return null;
            };

            // Update the current folder with the latest data
            const updatedFolder = findFolder(data.folders, currentFolder.path);
            if (updatedFolder) {
              setCurrentFolder(updatedFolder);
            } else {
              // If the folder is not found, it might have been deleted, so reset to root
              setCurrentFolder(null);
              setFolderHistory([]);
            }
          }
        } catch (error) {
          console.error('Error refreshing current folder:', error);
        }
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      setError(error.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const showDeleteConfirmation = () => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 w-[400px]">
        <h3 class="text-lg font-semibold mb-4">Confirm Delete</h3>
        <p class="text-gray-600 mb-6">Are you sure you want to delete "${item.name}"? This action cannot be undone.</p>
        <div class="flex justify-end gap-3">
          <button class="px-4 py-2 text-gray-600 hover:text-gray-800" id="cancelDelete">Cancel</button>
          <button class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700" id="confirmDelete">Delete</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const cancelBtn = modal.querySelector('#cancelDelete');
    const confirmBtn = modal.querySelector('#confirmDelete');

    cancelBtn.onclick = () => {
      document.body.removeChild(modal);
    };

    confirmBtn.onclick = () => {
      handleDelete();
      document.body.removeChild(modal);
    };
  };

  const handleRestore = async (item) => {
    try {
      // Create and show confirmation modal
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-[400px]">
          <h3 class="text-lg font-semibold mb-4">Confirm Restore</h3>
          <p class="text-gray-600 mb-6">Are you sure you want to restore "${item.name}"?</p>
          <div class="flex justify-end gap-3">
            <button class="px-4 py-2 text-gray-600 hover:text-gray-800" id="cancelRestore">Cancel</button>
            <button class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors" id="confirmRestore">Restore</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const cancelBtn = modal.querySelector('#cancelRestore');
      const confirmBtn = modal.querySelector('#confirmRestore');

      cancelBtn.onclick = () => {
        document.body.removeChild(modal);
      };

      confirmBtn.onclick = async () => {
        const response = await fetch(`${backend}/post_docs/recycle-bin/restore/${item.type}/${item.id}`, {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to restore ${item.type}`);
        }

        const data = await response.json();
        
        // Update the folders state to add the restored item
        const updateFoldersState = (items) => {
          // If we're restoring to root level
          if (!item.path.includes('/')) {
            return [...items, {
              name: item.name,
              path: item.path,
              type: item.type,
              id: item.id,
              createdAt: new Date(),
              children: []
            }];
          }

          // If we're restoring to a subfolder
          const parentPath = path.dirname(item.path);
          const findAndUpdateFolder = (items) => {
            return items.map(folder => {
              if (folder.path === parentPath) {
                return {
                  ...folder,
                  children: [...(folder.children || []), {
                    name: item.name,
                    path: item.path,
                    type: item.type,
                    id: item.id,
                    createdAt: new Date(),
                    children: []
                  }]
                };
              }
              if (folder.children) {
                return {
                  ...folder,
                  children: findAndUpdateFolder(folder.children)
                };
              }
              return folder;
            });
          };

          return findAndUpdateFolder(items);
        };

        // Update the main folders state
        setFolders(prevFolders => updateFoldersState(prevFolders));

        // Update currentFolder if we're in the parent folder
        if (currentFolder) {
          const parentPath = path.dirname(item.path);
          if (currentFolder.path === parentPath) {
            setCurrentFolder(prev => ({
              ...prev,
              children: [...(prev.children || []), {
                name: item.name,
                path: item.path,
                type: item.type,
                id: item.id,
                createdAt: new Date(),
                children: []
              }]
            }));
          }
        }

        setSuccess(`${item.type === 'folder' ? 'Folder' : 'File'} restored successfully`);
        setTimeout(() => setSuccess(null), 3000);
        document.body.removeChild(modal);
      };
    } catch (error) {
      console.error("Error restoring item:", error);
      setError(error.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <div
      className={`relative group cursor-pointer transition-all duration-200 ${
        isDragging ? 'opacity-50' : ''
      } ${isDragOver ? 'bg-blue-100 rounded-lg' : ''} ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setShowSettings(true)}
      onMouseLeave={() => {
        setShowSettings(false);
        setShowMenu(false);
      }}
      onClick={(e) => {
        if (isMultiSelectMode) {
          e.stopPropagation();
          onSelect(item);
        }
      }}
    >
      <div className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 relative">
        {showSettings && !isMultiSelectMode && (
          <div className="absolute top-2 right-2">
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1 hover:bg-gray-100 rounded"
                title="More actions"
              >
                <FaCog className="text-gray-600" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg py-1 z-20">
                  {item.type === 'file' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPdfModal(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                    >
                      <FaEye className="text-blue-500" />
                      View PDF
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRenameModal(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                  >
                    <FaEdit className="text-gray-600" />
                    Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.type === 'folder') {
                        setShowFolderMoveModal(true);
                      } else {
                        setShowMoveModal(true);
                      }
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                  >
                    <FaArrowRight className="text-blue-500" />
                    Move
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      showDeleteConfirmation();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <FaTrash className="text-red-500" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="relative">
          {item.type === 'folder' ? (
            <FaFolder className="text-4xl text-yellow-500 mb-2" />
          ) : (
            <FaFilePdf className="text-4xl text-red-500 mb-2" />
          )}
        </div>
        <div className="text-center">
          <span className="text-sm font-medium text-gray-700">{item.name}</span>
        </div>
      </div>

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Rename {item.type === 'folder' ? 'Folder' : 'File'}</h3>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 p-2 border rounded"
                placeholder={`Enter new ${item.type === 'folder' ? 'folder' : 'file'} name`}
              />
              {item.type === 'file' && <span className="text-gray-500">.pdf</span>}
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowRenameModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <MoveModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        onMove={item.type === 'folder' ? onDrop : handleFileMove}
        currentItem={item}
        folders={folders}
        currentPath={currentFolder?.path || ''}
        setCurrentFolder={setCurrentFolder}
      />

      <FolderMoveModal
        isOpen={showFolderMoveModal}
        onClose={() => setShowFolderMoveModal(false)}
        onMove={handleFolderMove}
        item={item}
        folders={folders}
        currentFolder={currentFolder}
        setCurrentFolder={setCurrentFolder}
      />

      {/* PDF Viewer Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[95vw] h-[95vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <FaFilePdf className="text-red-500 text-xl" />
                <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.open(`${backend}/uploads/${item.path}`, '_blank')}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <FaDownload className="text-sm" />
                  Download
                </button>
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 bg-gray-100 p-4 overflow-hidden">
              <div className="w-full h-full bg-white rounded-lg shadow-sm overflow-hidden">
                <iframe
                  src={`${backend}/uploads/${item.path}`}
                  className="w-full h-full"
                  title="PDF Viewer"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Last modified: {new Date().toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CreateFolderModal = ({ isOpen, onClose, onCreate, currentPath, folders }) => {
  const [folderName, setFolderName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderHistory, setFolderHistory] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Set initial selected folder based on currentPath
    const findFolder = (items, path) => {
      for (const item of items) {
        if (item.path === path) return item;
        if (item.children) {
          const found = findFolder(item.children, path);
          if (found) return found;
        }
      }
      return null;
    };

    if (currentPath) {
      const initialFolder = findFolder(folders, currentPath);
      setSelectedFolder(initialFolder);
    }
  }, [currentPath, folders]);

  const handleFolderClick = (folder) => {
    if (folder.type === 'folder') {
      setFolderHistory([...folderHistory, selectedFolder]);
      setSelectedFolder(folder);
    }
  };

  const handleBack = () => {
    if (folderHistory.length > 0) {
      const previousFolder = folderHistory[folderHistory.length - 1];
      setSelectedFolder(previousFolder);
      setFolderHistory(folderHistory.slice(0, -1));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setError('Folder name is required');
      return;
    }
    onCreate(folderName.trim(), selectedFolder ? selectedFolder.path : '');
    setFolderName('');
    setError(null);
  };

  const getCurrentItems = () => {
    if (!selectedFolder) {
      return folders;
    }
    return selectedFolder.children || [];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Create New Folder</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={handleBack}
            disabled={folderHistory.length === 0}
            className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            <FaChevronLeft />
          </button>
          <span className="text-gray-500">
            {selectedFolder ? selectedFolder.path : 'Root'}
          </span>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Folder Name
          </label>
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter folder name"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {getCurrentItems().map((item) => (
              <div
                key={item.path}
                onClick={() => handleFolderClick(item)}
                className={`flex items-center gap-2 p-3 border rounded-lg ${
                  item.type === 'folder' 
                    ? 'cursor-pointer hover:bg-gray-50' 
                    : 'cursor-not-allowed opacity-50'
                }`}
                title={item.type === 'folder' ? 'Click to select folder' : 'Only folders can be selected as destination'}
              >
                {item.type === 'folder' ? (
                  <FaFolder className="text-yellow-500" />
                ) : (
                  <FaFilePdf className="text-red-500" />
                )}
                <span className="text-sm">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

const CreateDocumentTypeModal = ({ isOpen, onClose, folders, setSuccess, setFolders, currentFolder, setCurrentFolder, setDocumentTypes, onDocumentTypeCreated }) => {
  const [typeName, setTypeName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderHistory, setFolderHistory] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedFolder(currentFolder);
    }
  }, [isOpen, currentFolder]);

  const handleFolderClick = (folder) => {
    if (folder.type === 'folder') {
      setFolderHistory([...folderHistory, selectedFolder]);
      setSelectedFolder(folder);
      setError(null);
    }
  };

  const handleBack = () => {
    if (folderHistory.length > 0) {
      const previousFolder = folderHistory[folderHistory.length - 1];
      setSelectedFolder(previousFolder);
      setFolderHistory(folderHistory.slice(0, -1));
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Create the document type
      const response = await fetch(`${backend}/post_docs/document-types`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          typeName,
          description,
          folderPath: selectedFolder ? selectedFolder.path : ''
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create document type');
      }

      // Create a new folder for this document type in the selected location
      const folderResponse = await fetch(`${backend}/post_docs/folders`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          folderName: typeName,
          parentPath: selectedFolder ? selectedFolder.path : ''
        })
      });

      const folderData = await folderResponse.json();

      if (!folderResponse.ok) {
        throw new Error(folderData.error || 'Failed to create folder');
      }

      // Update folders state
      const newFolder = {
        name: typeName,
        path: folderData.folder.path,
        type: 'folder',
        createdAt: new Date(),
        children: []
      };

      const updateFoldersState = (items) => {
        return items.map(item => {
          if (item.path === (selectedFolder ? selectedFolder.path : '')) {
            return {
              ...item,
              children: [...item.children, newFolder]
            };
          }
          if (item.children) {
            return {
              ...item,
              children: updateFoldersState(item.children)
            };
          }
          return item;
        });
      };

      setFolders(prevFolders => updateFoldersState(prevFolders));

      // Update current folder if we're in the parent folder
      if (currentFolder && currentFolder.path === (selectedFolder ? selectedFolder.path : '')) {
        setCurrentFolder(prev => ({
          ...prev,
          children: [...prev.children, newFolder]
        }));
      }

      // Fetch updated document types
      const typesResponse = await fetch(`${backend}/post_docs/document-types`, {
        credentials: 'include',
        headers: { 'Origin': window.location.origin }
      });

      const typesData = await typesResponse.json();
      if (typesData.success) {
        setDocumentTypes(typesData.types);
        // Call the callback to update document list
        if (onDocumentTypeCreated) {
          onDocumentTypeCreated();
        }
      }

      setSuccess('Document type created successfully');
      onClose();
    } catch (error) {
      console.error('Error creating document type:', error);
      setError(error.message);
    }
  };

  const getCurrentItems = () => {
    if (!selectedFolder) {
      return folders;
    }
    return selectedFolder.children || [];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Create New Document Type</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type Name
            </label>
            <input
              type="text"
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter document type name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter description (optional)"
              rows="3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Folder Location
            </label>
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={handleBack}
                disabled={folderHistory.length === 0}
                className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                <FaChevronLeft />
              </button>
              <span className="text-gray-500">
                {selectedFolder ? selectedFolder.path : 'Select a folder'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[200px] overflow-y-auto p-4 border rounded">
              {getCurrentItems().map((folder) => (
                <div
                  key={folder.path}
                  onClick={() => handleFolderClick(folder)}
                  className={`flex items-center gap-2 p-3 border rounded-lg ${
                    folder.type === 'folder'
                      ? 'cursor-pointer hover:bg-gray-50' 
                      : 'cursor-not-allowed opacity-50'
                  }`}
                  title={folder.type === 'folder' ? 'Click to select folder' : 'Only folders can be selected'}
                >
                  <FaFolder className="text-yellow-500" />
                  <span className="text-sm">{folder.name}</span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Type
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FolderManager = ({ onDocumentTypeCreated }, ref) => {
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderHistory, setFolderHistory] = useState([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [draggedFolder, setDraggedFolder] = useState(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true);
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
      setError('Failed to load folders');
    } finally {
      setLoading(false);
    }
  }, []);

  // Expose fetchFolders through a ref
  useImperativeHandle(ref, () => ({
    fetchFolders
  }));

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchData = async () => {
      if (isMounted) {
        await fetchFolders();
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [fetchFolders, refreshTrigger]);

  useEffect(() => {
    let isMounted = true;
    const handleRefresh = () => {
      if (isMounted) {
        fetchFolders();
      }
    };

    // Define handleUpdateCurrentFolder outside the if block
    const handleUpdateCurrentFolder = (event) => {
      if (isMounted && event.detail && event.detail.folderData) {
        console.log('Updating current folder with data:', event.detail.folderData);
        setCurrentFolder(event.detail.folderData);
      }
    };

    const folderManager = document.querySelector('.folder-manager');
    if (folderManager) {
      folderManager.addEventListener('refreshFolders', handleRefresh);
      
      // Add event listener for updateCurrentFolder event
      folderManager.addEventListener('updateCurrentFolder', handleUpdateCurrentFolder);
    }

    return () => {
      isMounted = false;
      if (folderManager) {
        folderManager.removeEventListener('refreshFolders', handleRefresh);
        folderManager.removeEventListener('updateCurrentFolder', handleUpdateCurrentFolder);
      }
    };
  }, [fetchFolders]);

  const handleNavigate = async (folder) => {
    setCurrentFolder(folder);
    setFolderHistory([...folderHistory, currentFolder]);
    // Refresh the folder data when entering it
    await fetchFolders();
    
    // Also refresh the current folder's content
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
        // Find the current folder in the updated structure
        const findFolder = (items, path) => {
          for (const item of items) {
            if (item.path === path) return item;
            if (item.children) {
              const found = findFolder(item.children, path);
              if (found) return found;
            }
          }
          return null;
        };

        // Update the current folder with the latest data
        const updatedFolder = findFolder(data.folders, folder.path);
        if (updatedFolder) {
          setCurrentFolder(updatedFolder);
        }
      }
    } catch (error) {
      console.error('Error refreshing current folder:', error);
    }
  };

  const handleNavigateBack = async () => {
    if (folderHistory.length > 0) {
      const previousFolder = folderHistory[folderHistory.length - 1];
      setCurrentFolder(previousFolder);
      setFolderHistory(folderHistory.slice(0, -1));
      // Refresh the previous folder data when going back
      if (previousFolder) {
        await fetchFolders();
        
        // Also refresh the current folder's content
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
            // Find the current folder in the updated structure
            const findFolder = (items, path) => {
              for (const item of items) {
                if (item.path === path) return item;
                if (item.children) {
                  const found = findFolder(item.children, path);
                  if (found) return found;
                }
              }
              return null;
            };

            // Update the current folder with the latest data
            const updatedFolder = findFolder(data.folders, previousFolder.path);
            if (updatedFolder) {
              setCurrentFolder(updatedFolder);
            }
          }
        } catch (error) {
          console.error('Error refreshing current folder:', error);
        }
      }
    }
  };

  const getCurrentItems = () => {
    if (!currentFolder) {
      return folders;
    }
    return currentFolder.children || [];
  };

  const getCurrentPath = () => {
    if (!currentFolder) {
      return 'Root';
    }
    return currentFolder.path;
  };

  const handleCreateFolder = async (folderName, parentPath) => {
    try {
      // First save the folder in the database
      const response = await fetch(`${backend}/post_docs/folders`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderName,
          parentPath: parentPath || ''
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create folder');
      }

      const data = await response.json();
      
      // Then update the UI state
      const updateFoldersState = (items) => {
        if (!parentPath) {
          return [...items, {
            name: folderName,
            path: folderName,
            type: 'folder',
            createdAt: new Date(),
            children: []
          }];
        }

        const findFolder = (items, path) => {
          for (const item of items) {
            if (item.path === path) {
              return item;
            }
            if (item.children) {
              const found = findFolder(item.children, path);
              if (found) return found;
            }
          }
          return null;
        };

        const parentFolder = findFolder(items, parentPath);
        if (parentFolder) {
          parentFolder.children = [
            ...(parentFolder.children || []),
            {
              name: folderName,
              path: `${parentPath}/${folderName}`,
              type: 'folder',
              createdAt: new Date(),
              children: []
            }
          ];
        }
        return items;
      };

      setFolders(prevFolders => updateFoldersState(prevFolders));
      setSuccess('Folder created successfully');
      setShowCreateFolderModal(false);
    } catch (error) {
      console.error('Error creating folder:', error);
      setError(error.message || 'Failed to create folder');
    }
  };

  const handleDeleteFolder = async (folderPath) => {
    if (!window.confirm('Are you sure you want to delete this folder and all its contents?')) return;

    try {
      const response = await fetch(`${backend}/post_docs/folders/${encodeURIComponent(folderPath)}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete folder');
      }

      // Remove folder and all its subfolders from state
      const removeFolder = (folders, path) => {
        return folders.filter(folder => {
          // Remove the folder itself and all its subfolders
          if (folder.path === path || folder.path.startsWith(`${path}/`)) {
            return false;
          }
          // Recursively check children
          if (folder.children) {
            folder.children = removeFolder(folder.children, path);
          }
          return true;
        });
      };

      setFolders(prevFolders => removeFolder(prevFolders, folderPath));

      // Update currentFolder if we're in the deleted folder or its subfolder
      if (currentFolder && (currentFolder.path === folderPath || currentFolder.path.startsWith(`${folderPath}/`))) {
        // Navigate back to parent folder
        if (folderHistory.length > 0) {
          const previousFolder = folderHistory[folderHistory.length - 1];
          setCurrentFolder(previousFolder);
          setFolderHistory(folderHistory.slice(0, -1));
        } else {
          setCurrentFolder(null);
          setFolderHistory([]);
        }
      }

      setSuccess('Folder and its contents moved to recycle bin successfully');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh the folders list to ensure consistency
      fetchFolders();
    } catch (error) {
      setError(error.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleRenameFolder = async (oldPath, newName) => {
    try {
      const response = await fetch(`${backend}/post_docs/folders/move`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourcePath: oldPath,
          destinationPath: path.dirname(oldPath)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rename folder');
      }

      const data = await response.json();
      setSuccess('Folder renamed successfully');
      setTimeout(() => setSuccess(null), 3000);
      fetchFolders(); // Refresh folder structure
    } catch (error) {
      setError(error.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDragStart = (e, folder) => {
    setDraggedFolder(folder);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetFolder) => {
    e.preventDefault();
    if (targetFolder && targetFolder.path === draggedFolder?.path) {
      e.dataTransfer.dropEffect = 'none';
    } else {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = async (e, targetFolder) => {
    e.preventDefault();
    if (!draggedFolder) return;
    
    // If dropping on the same folder, ignore
    if (targetFolder && draggedFolder.path === targetFolder.path) return;

    try {
      const response = await fetch(`${backend}/post_docs/folders/move`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourcePath: draggedFolder.path,
          destinationPath: targetFolder ? targetFolder.path : '' // Empty string for root level
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to move folder');
      }

      // Update the folders state to reflect the move
      const updateFoldersState = (items) => {
        return items.map(folder => {
          // Remove folder from current location
          if (folder.path === draggedFolder.path) {
            return null;
          }
          // Add folder to new location
          if (folder.path === (targetFolder ? targetFolder.path : '')) {
            return {
              ...folder,
              children: [...(folder.children || []), {
                ...draggedFolder,
                path: targetFolder ? `${targetFolder.path}/${draggedFolder.name}` : draggedFolder.name
              }]
            };
          }
          // Recursively update children
          if (folder.children) {
            return {
              ...folder,
              children: updateFoldersState(folder.children).filter(Boolean)
            };
          }
          return folder;
        }).filter(Boolean);
      };

      // Update the main folders state
      setFolders(prevFolders => updateFoldersState(prevFolders));

      // Update currentFolder based on whether we're in source or destination
      if (currentFolder) {
        const sourceFolderPath = path.dirname(draggedFolder.path);
        const isInSourceFolder = currentFolder.path === sourceFolderPath;
        const isInDestinationFolder = currentFolder.path === (targetFolder ? targetFolder.path : '');

        if (isInSourceFolder) {
          // Remove folder from current view if we're in source folder
          setCurrentFolder(prev => ({
            ...prev,
            children: prev.children.filter(child => child.path !== draggedFolder.path)
          }));
        } else if (isInDestinationFolder) {
          // Add folder to current view if we're in destination folder
          const fileName = path.basename(draggedFolder.path);
          setCurrentFolder(prev => ({
            ...prev,
            children: [...(prev.children || []), {
              name: fileName,
              path: `${targetFolder ? targetFolder.path : draggedFolder.path}/${fileName}`,
              type: 'file',
              createdAt: new Date()
            }]
          }));
        }
      }

      setSuccess('Folder moved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(error.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleItemSelect = (item) => {
    if (isMultiSelectMode) {
      setSelectedItems(prev => {
        const isSelected = prev.some(selected => selected.path === item.path);
        if (isSelected) {
          return prev.filter(selected => selected.path !== item.path);
        } else {
          return [...prev, item];
        }
      });
    }
  };

  const handleBulkMove = async (destinationPath) => {
    try {
      const movePromises = selectedItems.map(item => 
        fetch(`${backend}/post_docs/folders/move`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sourcePath: item.path,
            destinationPath: destinationPath
          }),
        })
      );

      await Promise.all(movePromises);

      // Update the folders state to reflect all moves
      const updateFoldersState = (items) => {
        return items.map(folder => {
          // Remove folders from current location
          if (selectedItems.some(item => item.path === folder.path)) {
            return null;
          }
          // Add folders to new location
          if (folder.path === destinationPath) {
            return {
              ...folder,
              children: [
                ...(folder.children || []),
                ...selectedItems.map(item => ({
                  ...item,
                  path: `${destinationPath}/${item.name}`
                }))
              ]
            };
          }
          // Recursively update children
          if (folder.children) {
            return {
              ...folder,
              children: updateFoldersState(folder.children).filter(Boolean)
            };
          }
          return folder;
        }).filter(Boolean);
      };

      setFolders(prevFolders => updateFoldersState(prevFolders));

      // Update currentFolder if we're in the destination folder
      if (currentFolder && currentFolder.path === destinationPath) {
        setCurrentFolder(prev => ({
          ...prev,
          children: [
            ...(prev.children || []),
            ...selectedItems.map(item => ({
              ...item,
              path: `${destinationPath}/${item.name}`
            }))
          ]
        }));
      }

      setSuccess(`${selectedItems.length} items moved successfully`);
      setTimeout(() => setSuccess(null), 3000);
      setShowBulkMoveModal(false);
      setSelectedItems([]);
      setIsMultiSelectMode(false);
    } catch (error) {
      setError('Failed to move some items: ' + error.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDocumentTypeCreated = () => {
    console.log('Document type created in FolderManager');
    setRefreshTrigger(prev => prev + 1);
    if (onDocumentTypeCreated) {
      onDocumentTypeCreated();
    }
  };

  return (
    <div className="folder-manager" data-current-folder={currentFolder?.path || ''}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={handleNavigateBack}
            disabled={folderHistory.length === 0}
            className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            <FaChevronLeft />
          </button>
          <h2 className="text-2xl font-semibold text-gray-800">Folder Management</h2>
          <span className="text-gray-500">/ {getCurrentPath()}</span>
        </div>
        <div className="flex items-center gap-2">
          {selectedItems.length > 0 && (
            <button
              onClick={() => setShowBulkMoveModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <FaArrowRight className="mr-2" />
              Move Selected ({selectedItems.length})
            </button>
          )}
          <button
            onClick={() => {
              setIsMultiSelectMode(!isMultiSelectMode);
              if (!isMultiSelectMode) {
                setSelectedItems([]);
              }
            }}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${
              isMultiSelectMode 
                ? 'bg-gray-600 text-white hover:bg-gray-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FaCog className="mr-2" />
            {isMultiSelectMode ? 'Cancel Selection' : 'Select Multiple'}
          </button>
          <button
            onClick={() => setShowCreateTypeModal(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <FaPlus className="mr-2" />
            Add New Type
          </button>
          <button
            onClick={() => setShowCreateFolderModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <FaFolderPlus className="mr-2" />
            New Folder
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
          {success}
        </div>
      )}

      {isMultiSelectMode && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-md">
          Select items to move. Click "Select Multiple" again to cancel.
        </div>
      )}

      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onCreate={handleCreateFolder}
        currentPath={currentFolder?.path || ''}
        folders={folders}
      />

      <CreateDocumentTypeModal
        isOpen={showCreateTypeModal}
        onClose={() => setShowCreateTypeModal(false)}
        folders={folders}
        setSuccess={setSuccess}
        setFolders={setFolders}
        currentFolder={currentFolder}
        setCurrentFolder={setCurrentFolder}
        setDocumentTypes={setDocumentTypes}
        onDocumentTypeCreated={handleDocumentTypeCreated}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4 border-2 border-dashed border-gray-300 rounded-lg min-h-[200px]">
        {getCurrentItems().map((item) => (
          <Item
            key={item.path}
            item={item}
            onRename={handleRenameFolder}
            onDelete={handleDeleteFolder}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onNavigate={handleNavigate}
            setFolders={setFolders}
            setSuccess={setSuccess}
            folders={folders}
            currentFolder={currentFolder}
            setCurrentFolder={setCurrentFolder}
            isSelected={selectedItems.includes(item.path)}
            onSelect={handleItemSelect}
            isMultiSelectMode={isMultiSelectMode}
            fetchFolders={fetchFolders}
            setRefreshTrigger={setRefreshTrigger}
            setFolderHistory={setFolderHistory}
          />
        ))}
      </div>

      <FolderMoveModal
        isOpen={showBulkMoveModal}
        onClose={() => setShowBulkMoveModal(false)}
        onMove={handleBulkMove}
        item={null}
        folders={folders}
        currentFolder={currentFolder}
        setCurrentFolder={setCurrentFolder}
      />
    </div>
  );
};

export default forwardRef(FolderManager); 