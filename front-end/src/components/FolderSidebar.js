import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFolder, FaLock, FaChevronRight, FaEllipsisV, FaPlus, FaTrash, FaSearch, FaEye, FaDownload, FaEdit, FaShare, FaArrowLeft, FaArrowUp, FaFolderOpen } from 'react-icons/fa';
import { backend } from '../config';

const FolderSidebar = ({ 
  currentPath, 
  folders,
  currentFolder, // Add currentFolder prop
  draggedItem,
  isDragging,
  onFolderSelect, 
  onNewFolder, 
  onDeleteFolder, 
  onRenameFolder,
  onTogglePrivate,
  onNavigateToRecycleBin,
  onMoveFolder,
  // Add refresh callbacks
  onRefreshFolders,
  onRefreshDocuments,
  // Add notification functions
  showSuccess,
  showError,
  // Optional: allow parent to pass the role; will fallback to localStorage
  userRole
}) => {
  // Role-based theme mapping (static strings so Tailwind can tree-shake correctly)
  const roleToThemeKey = (role) => {
    const r = (role || '').toString().toLowerCase();
    if (r === 'superadmin') return 'amber';
    if (r === 'admin') return 'blue';
    if (r === 'director') return 'purple';
    if (r === 'responsable') return 'green';
    if (r === 'user') return 'purple';
    return 'blue';
  };

  // Define concrete class sets per theme
  const themes = {
    blue: {
      containerBorder: 'border-blue-200/30',
      headerBorder: 'border-blue-100',
      itemSelectedBg: 'bg-blue-100',
      itemSelectedBorder: 'border-blue-300',
      itemHoverBg: 'hover:bg-blue-50',
      chevronHoverText: 'hover:text-blue-600',
      iconPrivate: 'text-blue-600',
      iconPublic: 'text-blue-500',
      ctxHoverText: 'hover:text-blue-600',
      backText: 'text-blue-600',
      backHoverText: 'hover:text-blue-800',
      backHoverBg: 'hover:bg-blue-50',
      backBorder: 'border-blue-200',
      buttonPrimary: 'bg-blue-600 hover:bg-blue-700',
      inputFocusRing: 'focus:ring-blue-500',
      inputFocusBorder: 'focus:border-blue-500',
      spinnerBorder: 'border-blue-600',
    },
    indigo: {
      containerBorder: 'border-indigo-200/30',
      headerBorder: 'border-indigo-100',
      itemSelectedBg: 'bg-indigo-100',
      itemSelectedBorder: 'border-indigo-300',
      itemHoverBg: 'hover:bg-indigo-50',
      chevronHoverText: 'hover:text-indigo-600',
      iconPrivate: 'text-indigo-600',
      iconPublic: 'text-indigo-500',
      ctxHoverText: 'hover:text-indigo-600',
      backText: 'text-indigo-600',
      backHoverText: 'hover:text-indigo-800',
      backHoverBg: 'hover:bg-indigo-50',
      backBorder: 'border-indigo-200',
      buttonPrimary: 'bg-indigo-600 hover:bg-indigo-700',
      inputFocusRing: 'focus:ring-indigo-500',
      inputFocusBorder: 'focus:border-indigo-500',
      spinnerBorder: 'border-indigo-600',
    },
    green: {
      containerBorder: 'border-green-200/30',
      headerBorder: 'border-green-100',
      itemSelectedBg: 'bg-green-100',
      itemSelectedBorder: 'border-green-300',
      itemHoverBg: 'hover:bg-green-50',
      chevronHoverText: 'hover:text-green-600',
      iconPrivate: 'text-green-600',
      iconPublic: 'text-green-500',
      ctxHoverText: 'hover:text-green-600',
      backText: 'text-green-600',
      backHoverText: 'hover:text-green-800',
      backHoverBg: 'hover:bg-green-50',
      backBorder: 'border-green-200',
      buttonPrimary: 'bg-green-600 hover:bg-green-700',
      inputFocusRing: 'focus:ring-green-500',
      inputFocusBorder: 'focus:border-green-500',
      spinnerBorder: 'border-green-600',
    },
    purple: {
      containerBorder: 'border-purple-200/30',
      headerBorder: 'border-purple-100',
      itemSelectedBg: 'bg-purple-100',
      itemSelectedBorder: 'border-purple-300',
      itemHoverBg: 'hover:bg-purple-50',
      chevronHoverText: 'hover:text-purple-600',
      iconPrivate: 'text-purple-600',
      iconPublic: 'text-purple-500',
      ctxHoverText: 'hover:text-purple-600',
      backText: 'text-purple-600',
      backHoverText: 'hover:text-purple-800',
      backHoverBg: 'hover:bg-purple-50',
      backBorder: 'border-purple-200',
      buttonPrimary: 'bg-purple-600 hover:bg-purple-700',
      inputFocusRing: 'focus:ring-purple-500',
      inputFocusBorder: 'focus:border-purple-500',
      spinnerBorder: 'border-purple-600',
    },
    amber: {
      containerBorder: 'border-amber-200/30',
      headerBorder: 'border-amber-100',
      itemSelectedBg: 'bg-amber-100',
      itemSelectedBorder: 'border-amber-300',
      itemHoverBg: 'hover:bg-amber-50',
      chevronHoverText: 'hover:text-amber-600',
      iconPrivate: 'text-amber-600',
      iconPublic: 'text-amber-500',
      ctxHoverText: 'hover:text-amber-600',
      backText: 'text-amber-600',
      backHoverText: 'hover:text-amber-800',
      backHoverBg: 'hover:bg-amber-50',
      backBorder: 'border-amber-200',
      buttonPrimary: 'bg-amber-600 hover:bg-amber-700',
      inputFocusRing: 'focus:ring-amber-500',
      inputFocusBorder: 'focus:border-amber-500',
      spinnerBorder: 'border-amber-600',
    }
  };

  const effectiveRole = (userRole || (typeof window !== 'undefined' ? localStorage.getItem('userRole') : null) || 'user');
  const themeKey = roleToThemeKey(effectiveRole);
  const theme = themes[themeKey] || themes.blue;

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [selectedFolder, setSelectedFolder] = useState(null);

  // Sync selectedFolder with currentFolder prop
  useEffect(() => {
    if (currentFolder) {
      setSelectedFolder(currentFolder);
      
      // Auto-expand the current folder's parent path
      if (currentFolder.folder_path) {
        const pathParts = currentFolder.folder_path.split('/').filter(Boolean);
        const newExpanded = new Set(expandedFolders);
        
        // Expand all parent folders in the path
        let currentPath = '';
        for (let i = 0; i < pathParts.length - 1; i++) {
          currentPath += (currentPath ? '/' : '') + pathParts[i];
          const parentFolder = folders.find(f => f.folder_path === currentPath);
          if (parentFolder) {
            newExpanded.add(parentFolder.id);
          }
        }
        
        setExpandedFolders(newExpanded);
      }
    }
  }, [currentFolder, folders]);
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, folder: null });


  // Use folders from props instead of fetching
  useEffect(() => {
    if (folders && folders.length > 0) {
      // console.log('📁 Folders updated:', folders.length, 'folders');
    }
  }, [folders]);

  // Auto-expand folders when searching
  useEffect(() => {
    if (searchTerm) {
      const searchResults = getFilteredFolders();
      
      if (searchResults.length > 0) {
        const newExpanded = new Set(expandedFolders);
        
        // Only expand folders that are direct parents of search results
        // Don't auto-expand all matching folders
        const expandDirectParents = (folders) => {
          folders.forEach(folder => {
            if (folder.children && folder.children.length > 0) {
              // Check if any direct children are in search results
              const hasMatchingChildren = folder.children.some(child => {
                const childName = (child.folder_name || child.name || '').toLowerCase();
                const searchLower = searchTerm.toLowerCase();
                return childName.includes(searchLower);
              });
              
              if (hasMatchingChildren) {
                newExpanded.add(folder.id);
                console.log(`🔍 Expanding parent folder: "${folder.folder_name || folder.name}" (has matching children)`);
              }
            }
          });
        };
        
        expandDirectParents(folders);
        setExpandedFolders(newExpanded);
      }
    } else {
      // Only reset expanded folders when search is cleared, not when folders change
      setExpandedFolders(new Set());
    }
  }, [searchTerm]); // Remove folders dependency to prevent resetting on folder changes

  // Build tree structure for all folders - memoized to prevent re-building
  const buildFolderTree = React.useMemo(() => {
    if (!folders || folders.length === 0) return [];

    // Only log when debugging is needed
    if (folders.length > 0) {
      // console.log('🌳 Building folder tree for', folders.length, 'folders');
    }

    // Get root folders (level 1)
    const rootFolders = folders.filter(folder => {
      const pathParts = (folder.folder_path || '').split('/');
      return pathParts.length === 2; // Only folders directly under institution
    });

    // Build tree structure recursively
    const buildChildren = (parentPath) => {
      return folders.filter(folder => {
        const folderPath = folder.folder_path || '';
        return folderPath.startsWith(parentPath + '/') && 
               folderPath.split('/').length === parentPath.split('/').length + 1;
      }).map(folder => ({
        ...folder,
        children: buildChildren(folder.folder_path)
      }));
    };

    // Build complete tree
    const tree = rootFolders.map(folder => ({
      ...folder,
      children: buildChildren(folder.folder_path)
    }));

    if (tree.length > 0) {
      // console.log('✅ Folder tree built:', tree.length, 'root folders');
    }
    return tree;
  }, [folders]);

  // Get all folders for display (tree structure)
  const getFoldersToDisplay = () => {
    return buildFolderTree;
  };

  // Get current path display (like in Diffuse.js)
  const getCurrentPathDisplay = () => {
    if (!currentFolder) {
      return 'Root';
    }
    return currentFolder.folder_path || 'Root';
  };

  // Get parent folder name for navigation
  const getParentFolderName = () => {
    if (!currentFolder || !currentFolder.folder_path) {
      return 'Root';
    }
    
    const pathParts = currentFolder.folder_path.split('/').filter(Boolean);
    if (pathParts.length <= 1) {
      return 'Root';
    }
    
    // Get the parent folder name (second to last part)
    const parentFolderName = pathParts[pathParts.length - 2];
    return parentFolderName || 'Root';
  };

  // Handle back to parent folder
  const handleBackToParent = () => {
    if (!currentFolder || !currentFolder.folder_path) {
      // If no current folder, go to root
      handleFolderClick({ name: 'Root', path: '/', id: 'root' });
      return;
    }
    
    const pathParts = currentFolder.folder_path.split('/').filter(Boolean);
    if (pathParts.length <= 1) {
      // If we're at root level, go to root
      handleFolderClick({ name: 'Root', path: '/', id: 'root' });
      return;
    }
    
    // Remove the last part to get parent path
    const parentPath = pathParts.slice(0, -1).join('/');
    
    // Find the parent folder
    const parentFolder = folders.find(folder => {
      const folderPath = folder.folder_path || '';
      return folderPath === parentPath;
    });
    
    if (parentFolder) {
      console.log('🔄 Going back to parent folder:', parentFolder);
      handleFolderClick(parentFolder);
    } else {
      // If parent not found, go to root
      console.log('🔄 Parent folder not found, going to root');
      handleFolderClick({ name: 'Root', path: '/', id: 'root' });
    }
  };

  // Filter folders based on search
  const getFilteredFolders = () => {
    const foldersToDisplay = getFoldersToDisplay();
    // Only log when searching
    if (searchTerm) {
      console.log('🔍 Search term:', searchTerm);
    }
    
    if (!searchTerm) return foldersToDisplay;
    
    // Simple recursive search that works
    const searchInFolders = (folders, searchTerm) => {
      const results = [];
      
      folders.forEach(folder => {
        const folderName = (folder.folder_name || folder.name || '').toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        
        // Only log when debugging search
        // console.log(`🔍 Checking folder: "${folderName}" against search: "${searchLower}"`);
        
        // Check children recursively first
        let childResults = [];
        if (folder.children && folder.children.length > 0) {
          childResults = searchInFolders(folder.children, searchTerm);
        }
        
        // Check if current folder matches
        const currentFolderMatches = folderName.includes(searchLower);
        
        if (currentFolderMatches || childResults.length > 0) {
          // Always keep all children for expandability, but don't auto-expand
          const folderToAdd = {
            ...folder,
            children: folder.children // Always keep all children
          };
          
          // Only log when debugging search
          // if (currentFolderMatches) {
          //   console.log(`✅ Found match: "${folderName}" - keeping all children for manual expansion`);
          // }
          // if (childResults.length > 0) {
          //   console.log(`✅ Adding parent with matching children: "${folderName}"`);
          // }
          
          results.push(folderToAdd);
        }
      });
      
      return results;
    };
    
    const searchResults = searchInFolders(foldersToDisplay, searchTerm);
    
    if (searchResults.length > 0) {
      console.log('✅ Search found', searchResults.length, 'results');
      return searchResults;
    }
    
    console.log('❌ No search results found');
    return [];
  };

  const filteredFolders = React.useMemo(() => {
    const result = getFilteredFolders();
    // Only log when there are changes
    if (searchTerm && result.length > 0) {
      console.log('Filtered folders:', result.length, 'folders');
    }
    return result;
  }, [searchTerm, folders]);

  // Handle folder click
  const handleFolderClick = (folder) => {
    // console.log('🔄 Folder clicked:', folder?.folder_name || folder?.name || 'Root');
    
    // Update local state immediately for responsive UI
    setSelectedFolder(folder);
    
    // Call parent callback
    if (onFolderSelect) {
      onFolderSelect(folder);
    }
  };

  // Handle folder expansion
  const handleFolderExpand = (folderId) => {
    console.log('🔄 Expanding folder:', folderId);
    setExpandedFolders(prevExpanded => {
      const newExpanded = new Set(prevExpanded);
      if (newExpanded.has(folderId)) {
        newExpanded.delete(folderId);
        console.log('📁 Collapsed folder:', folderId);
      } else {
        newExpanded.add(folderId);
        console.log('📁 Expanded folder:', folderId);
      }
      console.log('📁 New expanded folders:', Array.from(newExpanded));
      return newExpanded;
    });
  };

  // Auto-expand folders that match search
  const expandMatchingFolders = (folders, searchTerm) => {
    if (!searchTerm) return;
    
    const newExpanded = new Set(expandedFolders);
    
    const traverseAndExpand = (folderList) => {
      folderList.forEach(folder => {
        const folderName = (folder.folder_name || folder.name || '').toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        
        if (folderName.includes(searchLower) && folder.children && folder.children.length > 0) {
          newExpanded.add(folder.id);
          console.log(`🔍 Auto-expanding matching folder: "${folderName}"`);
        }
        
        if (folder.children && folder.children.length > 0) {
          traverseAndExpand(folder.children);
        }
      });
    };
    
    traverseAndExpand(folders);
    setExpandedFolders(newExpanded);
  };

  // Render folder tree recursively
  const renderFolderTree = (folders, level = 0) => {
    return folders.map((folder, index) => {
      const hasChildren = folder.children && folder.children.length > 0;
      const isExpanded = expandedFolders.has(folder.id);
      const isSelected = selectedFolder?.id === folder.id;

      return (
        <div key={folder.id} className="w-full">
          {/* Delimiter line between folders */}
          {index > 0 && (
            <div className="h-px bg-gray-200 mx-3 my-1"></div>
          )}
          {/* Folder Item */}
          <div 
            className={`group flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer border ${
              isSelected
                ? `${theme.itemSelectedBg} ${theme.itemSelectedBorder}`
                : `${theme.itemHoverBg} border-transparent`
            } ${isDragging && draggedItem?.type === 'file' ? 'border-dashed border-gray-300' : ''} ${
              'cursor-grab active:cursor-grabbing'
            }`}
            style={{ marginLeft: `${level * 16}px` }}
            title={`${folder.folder_name || folder.name} ${folder.is_private ? '(Private)' : '(Public)'} - drag to move`}
            draggable={true}
            onClick={() => handleFolderClick(folder)}
            onMouseEnter={() => {
              // Pre-load documents for this folder on hover
              if (window.preloadDocuments && folder.folder_path) {
                window.preloadDocuments(folder.folder_path);
              }
            }}
            onContextMenu={(e) => handleContextMenu(e, folder)}
            onDragStart={(e) => handleFolderDragStart(e, folder)}
            onDragEnd={handleFolderDragEnd}
            onDragOver={(e) => handleDragOver(e, folder)}
            onDragLeave={(e) => handleDragLeave(e, folder)}
            onDrop={(e) => handleDrop(e, folder)}
          >
            <div className="flex items-center space-x-3 flex-1">
              {/* Expand/Collapse Button - Always reserve space */}
              <div className="w-6 h-6 flex items-center justify-center">
                {hasChildren && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFolderExpand(folder.id);
                    }}
                  className={`p-1 text-gray-400 ${theme.chevronHoverText} rounded transition-colors`}
                  >
                    <FaChevronRight 
                      className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                    />
                  </button>
                )}
              </div>
              
              {/* Folder Icon */}
              <FaFolder className={`w-4 h-4 ${folder.is_private ? theme.iconPrivate : theme.iconPublic}`} />
              
              {/* Folder Name with Tooltip */}
              <span 
                className="text-sm text-gray-700 truncate" 
                title={folder.folder_name || folder.name}
              >
                {folder.folder_name || folder.name}
              </span>
              
              {/* Private Lock Icon */}
              {folder.is_private && (
                <FaLock className="w-3 h-3 text-yellow-500" title="Private folder - drag to move" />
              )}
            </div>
            
            {/* Action buttons on hover - For all folders (SuperAdmin) */}
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Context Menu Button - For all folders */}
              <button 
                className={`p-1 text-gray-400 ${theme.ctxHoverText} rounded`}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('🔘 Context menu clicked for folder:', folder.folder_name);
                  handleContextMenu(e, folder);
                }}
                title="Folder actions"
              >
                <FaEllipsisV className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Children Folders */}
          {hasChildren && isExpanded && (
            <div className="mt-1">
              {renderFolderTree(folder.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  // Handle context menu
  const handleContextMenu = (e, folder) => {
    e.preventDefault();
    console.log('🎯 Opening context menu for folder:', folder.folder_name, 'at position:', e.clientX, e.clientY);
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      folder
    });
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu({ show: false, x: 0, y: 0, folder: null });
  };

  // Handle context menu actions
  const handleContextAction = (action) => {
    const folder = contextMenu.folder;
    closeContextMenu();

    switch (action) {
      case 'open':
        handleFolderClick(folder);
        break;
      case 'rename':
        onRenameFolder(folder);
        break;
      case 'delete':
        onDeleteFolder(folder);
        break;
      case 'move':
        // For now, we'll use the same logic as drag and drop
        // This could be enhanced with a modal to select destination
        console.log('📁 Move action for folder:', folder.folder_name);
        // TODO: Implement move folder modal
        break;
      case 'toggle-private':
        onTogglePrivate(folder);
        break;
      case 'download':
        // Handle download
        break;
      case 'share':
        // Handle share
        break;
    }
  };

  // Drag and Drop handlers for sidebar
  const handleDragOver = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check for dragged item from props or dataTransfer
    let draggedItemData = draggedItem;
    if (!draggedItemData) {
      try {
        const dataTransferData = e.dataTransfer.getData('application/json');
        if (dataTransferData) {
          draggedItemData = JSON.parse(dataTransferData);
        }
      } catch (error) {
        // Ignore error, dataTransfer might not be available during dragover
      }
    }
    
    if (draggedItemData) {
      if (draggedItemData.type === 'file') {
        e.currentTarget.classList.add('bg-blue-50', 'border-blue-300');
      } else if (draggedItemData.type === 'folder') {
        // Don't allow dropping folder into itself or its subfolder
        if (draggedItemData.path !== folder.folder_path && !folder.folder_path.startsWith(draggedItemData.path + '/')) {
          e.currentTarget.classList.add('bg-green-50', 'border-green-300');
        } else {
          e.currentTarget.classList.add('bg-red-50', 'border-red-300');
        }
      }
    }
  };

  const handleDragLeave = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300', 'bg-green-50', 'border-green-300', 'bg-red-50', 'border-red-300');
  };

  // Handle drag start for folders
  const handleFolderDragStart = (e, folder) => {
    // All folders can be dragged (SuperAdmin)
    
    e.stopPropagation();
    
    // Set dragged item data in dataTransfer for cross-component communication
    const dragData = {
      type: 'folder',
      id: folder.id,
      name: folder.folder_name || folder.name,
      path: folder.folder_path,
      is_private: folder.is_private
    };
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    
    // Create a drag image
    const dragImage = e.currentTarget.cloneNode(true);
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-9999px';
    dragImage.style.left = '-9999px';
    dragImage.style.width = e.currentTarget.offsetWidth + 'px';
    dragImage.style.height = e.currentTarget.offsetHeight + 'px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, e.currentTarget.offsetWidth / 2, e.currentTarget.offsetHeight / 2);
    
    // Add visual feedback
    e.currentTarget.style.opacity = '0.5';
  };

  const handleFolderDragEnd = (e) => {
    e.preventDefault();
    
    // Remove drag image
    const dragImages = document.querySelectorAll('.drag-image');
    dragImages.forEach(img => img.remove());
    
    // Reset visual feedback
    const draggedElement = e.currentTarget;
    draggedElement.style.opacity = '1';
  };

  const handleDrop = async (e, targetFolder) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300', 'bg-green-50', 'border-green-300', 'bg-red-50', 'border-red-300');
    
    // Try to get dragged item from dataTransfer first (for folder drags)
    let draggedItemData = draggedItem;
    
    if (!draggedItemData) {
      try {
        const dataTransferData = e.dataTransfer.getData('application/json');
        if (dataTransferData) {
          draggedItemData = JSON.parse(dataTransferData);
        }
      } catch (error) {
        console.log('No drag data found in dataTransfer');
      }
    }
    
    if (!draggedItemData) return;
    
    try {
      if (draggedItemData.type === 'file') {
        // Handle file drop - existing logic
        const sourceFolderPath = draggedItemData.path;
        const fileName = draggedItemData.nom_document;

        // Check if trying to move file to its current location
        if (sourceFolderPath === targetFolder.folder_path) {
          console.log('Cannot move file to its current location');
          return;
        }

        // Construct the full source path
        const fullSourcePath = `${sourceFolderPath}/${fileName}`;

        console.log('🔄 Moving file:', {
          sourcePath: fullSourcePath,
          destinationPath: targetFolder.folder_path
        });

        const response = await fetch(`${backend}/post_docs/files/move`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sourcePath: fullSourcePath,
            destinationPath: targetFolder.folder_path
          }),
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

          const destinationFolderName = getFolderName(targetFolder.folder_path);
          console.log(`✅ File moved to "${destinationFolderName}"`);

          // Show success message for file move
          if (showSuccess) {
            showSuccess(`Document moved to "${destinationFolderName}"`);
          }

          // Update documents state instantly without refresh
          const fileName = draggedItemData.nom_document;
          const oldPath = draggedItemData.path;
          const newPath = targetFolder.folder_path;
          
          console.log('🔄 Updating document path instantly:', {
            fileName,
            oldPath,
            newPath
          });
          
          // Call the function to update document path instantly (send full doc where possible)
          if (window.updateDocumentPathInstantly) {
            window.updateDocumentPathInstantly(fileName, oldPath, newPath, draggedItemData);
            console.log('✅ Document path updated instantly');
          } else {
            console.warn('updateDocumentPathInstantly function not found, falling back to refresh');
            if (onRefreshDocuments) {
              await onRefreshDocuments();
            }
          }

          // Don't clear cache for move operations - let updateDocumentPathInstantly handle it
          console.log('✅ Move operation completed - cache updated by updateDocumentPathInstantly');

          // Call the parent's move handler to refresh data (only for folders)
          if (onMoveFolder && draggedItemData.type === 'folder') {
            onMoveFolder(draggedItemData, targetFolder);
          }
        } else {
          console.error('Failed to move file:', data.error);
          if (showError) {
            showError('Error', data.error || 'Failed to move document');
          }
        }
      } else if (draggedItemData.type === 'folder') {
        // Handle folder drop - delegate to parent component
        const sourcePath = draggedItemData.path;
        const destinationPath = targetFolder.folder_path;

        // Check if trying to move folder to its current location
        if (sourcePath === destinationPath) {
          console.log('Cannot move folder to its current location');
          return;
        }

        // Check if trying to move folder into itself or its subfolder
        if (destinationPath.startsWith(sourcePath + '/')) {
          console.log('Cannot move folder into itself or its subfolder');
          return;
        }

        console.log('🔄 Moving folder via parent component:', {
          sourcePath,
          destinationPath
        });

        // Delegate folder move to parent component (Diffuse.js)
        if (onMoveFolder) {
          onMoveFolder(sourcePath, destinationPath);
        }
      }
    } catch (error) {
      console.error('Error moving item:', error);
      if (showError) {
        showError('Error', error.message || 'Failed to move item');
      }
    }
  };

  return (
    <motion.div
      initial={{ x: -280, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className={`fixed left-0 top-[56px] h-[calc(100vh-56px)] w-80 bg-white/95 backdrop-blur-xl shadow-2xl border-r ${theme.containerBorder} z-30`}
    >
      {/* Sidebar Header */}
      <div className={`p-6 border-b ${theme.headerBorder}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Folder Manager</h2>
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-2 mb-4">
          <button 
            onClick={onNewFolder}
            className={`flex-1 flex items-center justify-center space-x-2 p-2 ${theme.buttonPrimary} text-white rounded-lg transition-colors text-sm`}
          >
            <FaPlus className="w-3 h-3" />
            <span>Add</span>
          </button>
          <button 
            onClick={onNavigateToRecycleBin}
            className="flex-1 flex items-center justify-center space-x-2 p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <FaTrash className="w-3 h-3" />
            <span>Bin</span>
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search folders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 ${theme.inputFocusRing} focus:border-transparent transition-all`}
          />
          <FaSearch className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 280px)' }}>

        {/* Navigation Breadcrumb - Show only when not in root */}
        {currentFolder && (
          <div className="mb-4">
            <div className="flex space-x-2">
              {/* Back to Parent Folder */}
              <button 
                onClick={() => handleBackToParent()}
                className={`flex-1 flex items-center justify-center space-x-2 p-3 text-sm ${theme.backText} ${theme.backHoverText} ${theme.backHoverBg} rounded-lg transition-colors border ${theme.backBorder}`}
              >
                <FaArrowLeft className="w-3 h-3" />
                <span className="truncate">Back to {getParentFolderName()}</span>
              </button>
              
              {/* Direct to Root Button */}
              <button 
                onClick={() => onFolderSelect(null)} // Pass null to indicate root
                className={`flex items-center justify-center p-3 text-sm text-gray-600 ${theme.chevronHoverText} hover:bg-gray-50 rounded-lg transition-colors border border-gray-200`}
                title="Go to Root"
              >
                <FaArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Folder Tree */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className={`animate-spin rounded-full h-6 w-6 border-b-2 ${theme.spinnerBorder}`}></div>
            </div>
          ) : filteredFolders.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <div className="text-center">
                <FaFolder className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No folders found</p>
                <p className="text-xs text-gray-400">Folders count: {folders ? folders.length : 0}</p>
                <p className="text-xs text-gray-400">Current path: {getCurrentPathDisplay()}</p>
              </div>
            </div>
          ) : (
            renderFolderTree(filteredFolders)
          )}
        </div>
      </div>

      {/* Sidebar Footer - Empty for now */}
      <div className={`p-4 border-t ${theme.headerBorder}`}>
        {/* Footer content can be added here if needed */}
      </div>

      {/* Context Menu - For all folders (SuperAdmin) */}
      <AnimatePresence>
        {contextMenu.show && contextMenu.folder && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed z-60 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-48"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button 
              onClick={() => handleContextAction('rename')}
              className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
            >
              <FaEdit className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">Rename</span>
            </button>
            <button 
              onClick={() => handleContextAction('move')}
              className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
            >
              <FaFolderOpen className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">Move</span>
            </button>
            <div className="border-t border-gray-200 my-1"></div>
            <button 
              onClick={() => handleContextAction('delete')}
              className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-red-50 text-red-600 transition-colors"
            >
              <FaTrash className="w-4 h-4" />
              <span className="text-sm">Delete</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Click outside to close context menu */}
      {contextMenu.show && (
                        <div className="fixed inset-0 z-50" onClick={closeContextMenu} />
      )}
    </motion.div>
  );
};

export default FolderSidebar; 