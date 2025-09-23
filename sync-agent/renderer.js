// Configuration  
const API_URL = 'http://localhost:3000';

// Helper function to get directory name from path (replacement for path.dirname)
function getDirname(filePath) {
    if (!filePath || filePath === '') return '';
    const lastSlash = filePath.lastIndexOf('/');
    if (lastSlash === -1) return '';
    return filePath.substring(0, lastSlash);
}

// Initialize socket connection
function initializeSocket() {
    console.log('\n=== DEBUG: Initializing Socket.IO in renderer process ===');
    
    // Initialize socket with proper configuration
    const socket = io(API_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        forceNew: true, // Force new connection
        timeout: 20000,
        autoConnect: true,
        withCredentials: true,
        path: '/socket.io',
        upgrade: true,
        rememberUpgrade: true,
        rejectUnauthorized: false,
        pingTimeout: 60000,
        pingInterval: 25000,
        upgradeTimeout: 10000,
        maxHttpBufferSize: 1e8
    });

    // Debug socket connection
    console.log('DEBUG: Socket instance created:', socket);
    console.log('DEBUG: Socket connected:', socket.connected);
    console.log('DEBUG: Socket id:', socket.id);

    socket.on('connect', async () => {
        console.log('\n=== DEBUG: Socket Connected in renderer process ===');
        console.log('DEBUG: Socket ID:', socket.id);
        console.log('DEBUG: Transport:', socket.io.engine.transport.name);
        
        // Get user info
        const userInfo = await require('electron').ipcRenderer.invoke('get-user-info');
        if (userInfo) {
            console.log('DEBUG: User info found:', userInfo);
            
            // Subscribe to updates using user ID
            const subscriptionData = {
                userId: userInfo.id,
                institutionId: userInfo.institution_id
            };
            console.log('DEBUG: Sending subscription data:', subscriptionData);
            
            // Emit subscribe event and wait for acknowledgment
            socket.emit('subscribe', subscriptionData, (response) => {
                if (response && response.success) {
                    console.log('DEBUG: Subscription successful:', response);
                } else {
                    console.error('DEBUG: Subscription failed:', response);
                    // Try to resubscribe after a delay
                    setTimeout(() => {
                        console.log('DEBUG: Attempting to resubscribe...');
                        socket.emit('subscribe', subscriptionData, (retryResponse) => {
                            console.log('DEBUG: Resubscription response:', retryResponse);
                        });
                    }, 2000);
                }
            });
        } else {
            console.error('DEBUG: No user info found');
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('\n=== DEBUG: Socket Disconnected in renderer process ===');
        console.log('DEBUG: Reason:', reason);
    });

    socket.on('connect_error', (error) => {
        console.error('\n=== DEBUG: Socket Error in renderer process ===');
        console.error('DEBUG: Error:', error);
    });

    // Add reconnection handling
    socket.on('reconnect', async (attemptNumber) => {
        console.log('\n=== DEBUG: Socket Reconnected in renderer process ===');
        console.log('DEBUG: Reconnection attempt:', attemptNumber);
        
        // Resubscribe after reconnection
        const userInfo = await require('electron').ipcRenderer.invoke('get-user-info');
        if (userInfo) {
            const subscriptionData = {
                userId: userInfo.id,
                institutionId: userInfo.institution_id
            };
            console.log('DEBUG: Resubscribing after reconnection:', subscriptionData);
            socket.emit('subscribe', subscriptionData, (response) => {
                console.log('DEBUG: Resubscription response:', response);
            });
        }
    });

    // DISABLED: Listen for file system updates from socket (now handled by dashboard.html)
    // socket.on('fileSystemUpdate', async (data) => {
    //     console.log('\n=== DEBUG: Received fileSystemUpdate from socket in renderer process ===');
    //     console.log('DEBUG: Update data:', JSON.stringify(data, null, 2));
    //     await handleFileSystemUpdate(data);
    // });

    // Listen for file system updates from main process
    window.electron.ipcRenderer.on('fileSystemUpdate', async (event, data) => {
        console.log('\n=== DEBUG: Received fileSystemUpdate from main process in renderer ===');
        console.log('DEBUG: Update data:', JSON.stringify(data, null, 2));
        await handleFileSystemUpdate(data);
    });

    // Listen for file system changes from main process
    window.electron.ipcRenderer.on('fileSystemChange', async (event, data) => {
        console.log('\n=== DEBUG: Received fileSystemChange from main process in renderer ===');
        console.log('DEBUG: Update data:', JSON.stringify(data, null, 2));
        await handleFileSystemUpdate(data);
    });

    // Listen for file added events from main process
    window.electron.ipcRenderer.on('file-added', async (event, data) => {
        // Bypass optimistic lock and refresh debounced when event comes from Electron main
        try {
            if (window.optimisticLock && data && data.fromElectron) {
                console.log('🔄 [ELECTRON] Ignoring optimistic lock for local file-added');
                window.optimisticLock = null;
            }
        } catch {}
        await handleFileAdded(data);
    });

    // Listen for file deleted events from main process
    window.electron.ipcRenderer.on('file-deleted', async (event, data) => {
        // File deleted event received (debug info removed)
        await handleFileDeleted(data);
    });

    // Listen for file system errors
    socket.on('fileSystemError', (data) => {
        console.error('\n=== DEBUG: Received fileSystemError in renderer process ===');
        console.error('DEBUG: Error data:', JSON.stringify(data, null, 2));
        
        // Show error notification
        showNotification('Error', data.error || 'An error occurred while updating folder contents', 'error');
    });

    // DISABLED: Listen for all events for debugging (causes duplicate processing)
    // socket.onAny((eventName, ...args) => {
    //     console.log('\n=== DEBUG: Received socket event in renderer process ===');
    //     console.log('DEBUG: Event name:', eventName);
    //     console.log('DEBUG: Event args:', JSON.stringify(args, null, 2));
    // });

    return socket;
}

// Helper function to get current folder path
function getCurrentFolder() {
    console.log('\n=== DEBUG: Getting current folder path ===');
    
    // Get current path from breadcrumb
    const currentPathElement = document.getElementById('currentPath');
    if (!currentPathElement) {
        console.log('DEBUG: No current path element found');
        return null;
    }

    const currentPath = currentPathElement.textContent.trim();
    console.log('DEBUG: Current path:', currentPath);

    // Normalize path
    const normalizedPath = currentPath.replace(/^Root\//, '').replace(/\/$/, '');
    console.log('DEBUG: Normalized path:', normalizedPath);

    return normalizedPath || null;
}

// Helper function to refresh current folder
async function refreshCurrentFolder() {
    console.log('\n=== DEBUG: Refreshing current folder ===');
    
    try {
        // Get current folder path
        const currentFolder = getCurrentFolder();
        if (!currentFolder) {
            console.log('DEBUG: No current folder to refresh');
            return;
        }

        console.log('DEBUG: Current folder path:', currentFolder);

        // Get user info
        const userInfo = await window.electron.getUserInfo();
        if (!userInfo) {
            console.error('DEBUG: No user info found');
            return;
        }

        console.log('DEBUG: User info:', userInfo);

        // Request folder structure update
        console.log('DEBUG: Requesting folder structure update');
        window.electron.ipcRenderer.send('get-folder-structure', {
            institutionId: userInfo.institution_id,
            currentPath: currentFolder
        });

        // Request folder contents update
        console.log('DEBUG: Requesting folder contents update');
        window.electron.ipcRenderer.send('get-folder-contents', {
            path: currentFolder,
            institutionId: userInfo.institution_id
        });

        // Clear any existing selections
        const checkboxes = document.querySelectorAll('.document-checkbox, .folder-checkbox');
        checkboxes.forEach(checkbox => checkbox.checked = false);
        
        // Hide bulk actions
        const bulkActions = document.querySelector('.bulk-actions');
        if (bulkActions) {
            bulkActions.style.display = 'none';
        }

    } catch (error) {
        console.error('DEBUG: Error refreshing folder:', error);
        console.error('DEBUG: Error stack:', error.stack);
        throw error;
    }
}

// Helper function to update folder contents in UI
function updateFolderContents(data) {
    console.log('\n=== DEBUG: Updating folder contents in UI ===');
    console.log('DEBUG: Update data:', JSON.stringify(data, null, 2));
    
    // Create or update bulk actions container
    let bulkActions = document.querySelector('.bulk-actions');
    if (!bulkActions) {
        bulkActions = document.createElement('div');
        bulkActions.className = 'bulk-actions fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg p-4 hidden';
        document.body.appendChild(bulkActions);
    }
    
    // Update folder structure
    if (data.folders) {
        const folderList = document.querySelector('.folder-list');
        if (folderList) {
            console.log('DEBUG: Updating folder list');
            // Clear existing folders
            folderList.innerHTML = '';
            
            // Add new folders
            data.folders.forEach(folder => {
                const folderElement = createFolderElement(folder);
                folderList.appendChild(folderElement);
            });
        }
    }

    // Update document list
    if (data.documents) {
        const documentList = document.querySelector('.document-list');
        if (documentList) {
            console.log('DEBUG: Updating document list');
            // Clear existing documents
            documentList.innerHTML = '';
            
            // Add new documents
            data.documents.forEach(doc => {
                const docElement = createDocumentElement(doc);
                documentList.appendChild(docElement);
            });
        }
    }
    
    console.log('DEBUG: UI update completed');
}

// Hide upload controls when at Root; show only purple button, already handled in HTML for visibility
document.addEventListener('DOMContentLoaded', () => {
    try {
        const controls = document.getElementById('uploadControls');
        const updateVisibility = () => {
            const atRoot = !window.currentFolderPath || window.currentFolderPath === '';
            if (controls) controls.style.display = atRoot ? 'none' : 'flex';
        };
        updateVisibility();
        // Observe changes to currentFolderPath by hooking into refreshCurrentFolder
        const originalRefresh = window.refreshCurrentFolder;
        if (typeof originalRefresh === 'function') {
            window.refreshCurrentFolder = function() {
                try { updateVisibility(); } catch {}
                return originalRefresh.apply(this, arguments);
            };
        }
    } catch (e) { console.warn('uploadControls visibility hook failed', e); }
});

// Helper function to create document element
function createDocumentElement(doc) {
    const div = document.createElement('div');
    div.className = 'document-item group relative flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer';
    div.draggable = true;
    div.dataset.documentId = doc.id;
    
    div.innerHTML = `
        <div class="flex items-center flex-1">
            <input type="checkbox" class="document-checkbox hidden group-hover:block mr-2" data-document-id="${doc.id}">
            <i class="fas fa-file text-blue-500 mr-2"></i>
            <span class="document-name">${doc.name}</span>
        </div>
        <div class="document-actions hidden group-hover:flex items-center space-x-2">
            <button class="move-btn p-1 text-gray-600 hover:text-blue-500" title="Move document">
                <i class="fas fa-arrows-alt"></i>
            </button>
            <button class="preview-btn p-1 text-gray-600 hover:text-blue-500" title="Preview document">
                <i class="fas fa-eye"></i>
            </button>
        </div>
    `;

    // Add drag and drop handlers
    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragend', handleDragEnd);

    // Add click handlers
    const moveBtn = div.querySelector('.move-btn');
    moveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showMoveDialog(doc);
    });

    const previewBtn = div.querySelector('.preview-btn');
    previewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDocument(doc.id);
    });

    // Add checkbox handler
    const checkbox = div.querySelector('.document-checkbox');
    checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        updateSelectedDocuments();
    });

    return div;
}

// Helper function to create folder element
function createFolderElement(folder) {
    const div = document.createElement('div');
    div.className = 'folder-item group relative flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer';
    div.draggable = true;
    div.dataset.folderPath = folder.path;
    
    // Add drop zone functionality
    div.addEventListener('dragover', handleDragOver);
    div.addEventListener('drop', handleDrop);
    
    div.innerHTML = `
        <div class="flex items-center flex-1">
            <input type="checkbox" class="folder-checkbox hidden group-hover:block mr-2" data-folder-path="${folder.path}">
            <i class="fas fa-folder text-yellow-500 mr-2"></i>
            <span class="folder-name">${folder.name}</span>
            ${folder.is_private ? '<i class="fas fa-lock text-yellow-400 text-xs ml-2" title="Folder privat"></i>' : ''}
        </div>
        <div class="folder-actions hidden group-hover:flex items-center space-x-2">
            <button class="move-btn p-1 text-gray-600 hover:text-blue-500" title="Move folder">
                <i class="fas fa-arrows-alt"></i>
            </button>
        </div>
    `;

    // Add drag and drop handlers
    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragend', handleDragEnd);

    // Add click handlers - make entire folder box clickable
    div.addEventListener('click', (e) => {
        // Don't trigger folder navigation if clicking on checkbox or move button
        if (e.target.closest('.folder-checkbox') || e.target.closest('.move-btn')) {
            return;
        }
        
        // Navigate to folder when clicking anywhere else on the folder box
        if (window.electron && window.electron.ipcRenderer) {
            window.electron.ipcRenderer.send('navigate-to-folder', { path: folder.path });
        }
    });

    const moveBtn = div.querySelector('.move-btn');
    moveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showMoveDialog(folder);
    });

    // Add checkbox handler
    const checkbox = div.querySelector('.folder-checkbox');
    checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        updateSelectedFolders();
    });

    return div;
}

// Helper function to show move dialog
function showMoveDialog(item) {
    const dialog = document.createElement('div');
    dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    
    dialog.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-96">
            <h3 class="text-lg font-semibold mb-4">Move ${item.type === 'folder' ? 'Folder' : 'Document'}</h3>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Select Destination Folder</label>
                <select class="w-full border rounded p-2" id="destinationFolder">
                    <option value="">Select a folder...</option>
                </select>
            </div>
            <div class="flex justify-end space-x-2">
                <button class="px-4 py-2 text-gray-600 hover:text-gray-800" id="cancelMove">Cancel</button>
                <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" id="confirmMove">Move</button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    // Populate folder select
    const select = dialog.querySelector('#destinationFolder');
    populateFolderSelect(select);

    // Add event listeners
    dialog.querySelector('#cancelMove').addEventListener('click', () => {
        document.body.removeChild(dialog);
    });

    dialog.querySelector('#confirmMove').addEventListener('click', () => {
        const destinationFolder = select.value;
        if (destinationFolder) {
            moveItem(item, destinationFolder);
            document.body.removeChild(dialog);
        }
    });
}

// Helper function to populate folder select
async function populateFolderSelect(select) {
    try {
        const userInfo = await window.electron.getUserInfo();
        if (!userInfo) return;

        const response = await window.electron.ipcRenderer.invoke('get-folder-structure', {
            institutionId: userInfo.institution_id
        });

        if (response && response.folders) {
            response.folders.forEach(folder => {
                const option = document.createElement('option');
                option.value = folder.path;
                option.textContent = folder.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error populating folder select:', error);
    }
}

// Helper function to move item
async function moveItem(item, destinationFolder) {
    try {
        const userInfo = await window.electron.getUserInfo();
        if (!userInfo) return;

        const moveData = {
            type: item.type === 'folder' ? 'move_folder' : 'move',
            sourcePath: item.path || item.sourcePath,
            targetFolder: destinationFolder,
            documentId: item.id,
            institutionId: userInfo.institution_id
        };

        // Emit move event to main process
        window.electron.ipcRenderer.send('fileSystemChange', moveData);

        // Show success message
        showNotification('Success', `${item.type === 'folder' ? 'Folder' : 'Document'} moved successfully`);
    } catch (error) {
        console.error('Error moving item:', error);
        showNotification('Error', 'Failed to move item');
    }
}

// Drag and drop handlers
function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', JSON.stringify({
        type: this.classList.contains('folder-item') ? 'folder' : 'document',
        id: this.dataset.documentId || this.dataset.folderPath
    }));
    this.classList.add('opacity-50');
}

function handleDragEnd(e) {
    this.classList.remove('opacity-50');
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('bg-blue-100');
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('bg-blue-100');
    
    try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        const targetFolder = this.dataset.folderPath;
        
        if (data.type === 'document') {
            moveItem({ type: 'document', id: data.id }, targetFolder);
        } else if (data.type === 'folder') {
            moveItem({ type: 'folder', path: data.id }, targetFolder);
        }
    } catch (error) {
        console.error('Error handling drop:', error);
        showNotification('Error', 'Failed to move item');
    }
}

// Helper function to move multiple items
async function moveMultipleItems(items, destinationFolder) {
    try {
        const userInfo = await window.electron.getUserInfo();
        if (!userInfo) return;

        for (const item of items) {
            const moveData = {
                type: item.type === 'folder' ? 'move_folder' : 'move',
                sourcePath: item.path || item.sourcePath,
                targetFolder: destinationFolder,
                documentId: item.id,
                institutionId: userInfo.institution_id
            };

            // Emit move event to main process
            window.electron.ipcRenderer.send('fileSystemChange', moveData);
        }

        // Show success message
        showNotification('Success', `${items.length} items moved successfully`);
    } catch (error) {
        console.error('Error moving items:', error);
        showNotification('Error', 'Failed to move items');
    }
}

// Helper function to show bulk move dialog
function showBulkMoveDialog(items) {
    const dialog = document.createElement('div');
    dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    
    dialog.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-96">
            <h3 class="text-lg font-semibold mb-4">Move ${items.length} Items</h3>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Select Destination Folder</label>
                <select class="w-full border rounded p-2" id="destinationFolder">
                    <option value="">Select a folder...</option>
                </select>
            </div>
            <div class="flex justify-end space-x-2">
                <button class="px-4 py-2 text-gray-600 hover:text-gray-800" id="cancelMove">Cancel</button>
                <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" id="confirmMove">Move All</button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    // Populate folder select
    const select = dialog.querySelector('#destinationFolder');
    populateFolderSelect(select);

    // Add event listeners
    dialog.querySelector('#cancelMove').addEventListener('click', () => {
        document.body.removeChild(dialog);
    });

    dialog.querySelector('#confirmMove').addEventListener('click', () => {
        const destinationFolder = select.value;
        if (destinationFolder) {
            moveMultipleItems(items, destinationFolder);
            document.body.removeChild(dialog);
        }
    });
}

// Helper function to update selected documents
function updateSelectedDocuments() {
    const selectedDocs = Array.from(document.querySelectorAll('.document-checkbox:checked'))
        .map(checkbox => ({
            type: 'document',
            id: checkbox.dataset.documentId
        }));
    
    // Show/hide bulk actions based on selection
    const bulkActions = document.querySelector('.bulk-actions');
    if (bulkActions) {
        if (selectedDocs.length > 0) {
            bulkActions.style.display = 'flex';
            bulkActions.innerHTML = `
                <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" id="bulkMove">
                    Move ${selectedDocs.length} Items
                </button>
            `;
            
            // Add click handler for bulk move
            bulkActions.querySelector('#bulkMove').addEventListener('click', () => {
                showBulkMoveDialog(selectedDocs);
            });
        } else {
            bulkActions.style.display = 'none';
        }
    }
}

// Helper function to update selected folders
function updateSelectedFolders() {
    const selectedFolders = Array.from(document.querySelectorAll('.folder-checkbox:checked'))
        .map(checkbox => ({
            type: 'folder',
            path: checkbox.dataset.folderPath
        }));
    
    // Show/hide bulk actions based on selection
    const bulkActions = document.querySelector('.bulk-actions');
    if (bulkActions) {
        if (selectedFolders.length > 0) {
            bulkActions.style.display = 'flex';
            bulkActions.innerHTML = `
                <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" id="bulkMove">
                    Move ${selectedFolders.length} Folders
                </button>
            `;
            
            // Add click handler for bulk move
            bulkActions.querySelector('#bulkMove').addEventListener('click', () => {
                showBulkMoveDialog(selectedFolders);
            });
        } else {
            bulkActions.style.display = 'none';
        }
    }
}

// Helper function to show notification
function showNotification(title, message, type = 'info') {
    // Prevent duplicate notifications
    const notificationKey = `${title}_${message}`;
    if (window.lastNotification === notificationKey) {
        console.log('Skipping duplicate notification:', notificationKey);
        return;
    }
    window.lastNotification = notificationKey;
    
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
        type === 'error' ? 'bg-red-500' : 'bg-green-500'
    } text-white`;
    
    notification.innerHTML = `
        <div class="font-semibold">${title}</div>
        <div>${message}</div>
    `;

    document.body.appendChild(notification);
    setTimeout(() => {
        document.body.removeChild(notification);
        // Clear notification key after timeout
        if (window.lastNotification === notificationKey) {
            window.lastNotification = null;
        }
    }, 3000);
}

// Helper function to handle file added events
async function handleFileAdded(data) {
    console.log('\n🎯 === ELECTRON: Processing FILE ADDED event ===');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('📦 Event data received:', JSON.stringify(data, null, 2));
    console.log('📄 File name:', data.fileName);
    console.log('📁 Folder:', data.folder);
    console.log('👤 User ID:', data.documentId);
    
    try {
        // Get current folder path
        const currentPath = getCurrentFolderPath();
        console.log('📁 Current folder path:', currentPath);
        
        // Check if the file was added to the current folder
        if (currentPath === data.folder || 
            (currentPath === '' && data.folder === data.institution) ||
            (currentPath && data.folder && data.folder.includes(currentPath))) {
            
            console.log('✅ File added to current folder - refreshing view');
            
            // Show success notification
            showNotification('File Added', `${data.fileName} was added successfully`, 'success');
            
            // Refresh the current folder to show the new file
            setTimeout(() => {
                refreshCurrentFolder();
            }, 1000); // Small delay to ensure database is updated
            
        } else {
            console.log('ℹ️ File added to different folder - no refresh needed');
            console.log('   Current folder:', currentPath);
            console.log('   File folder:', data.folder);
        }
        
    } catch (error) {
        console.error('❌ Error handling file added event:', error);
    }
}

// Helper function to handle file deleted events
async function handleFileDeleted(data) {
    console.log('\n🗑️ === ELECTRON: Processing FILE DELETED event ===');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('📦 Event data received:', JSON.stringify(data, null, 2));
    console.log('📄 File name:', data.fileName);
    console.log('📁 Folder:', data.folder);
    console.log('👤 User ID:', data.documentId);
    
    try {
        // Get current folder path
        const currentPath = getCurrentFolderPath();
        console.log('📁 Current folder path:', currentPath);
        
        // Check if the file was deleted from the current folder
        if (currentPath === data.folder || 
            (currentPath === '' && data.folder === data.institution) ||
            (currentPath && data.folder && data.folder.includes(currentPath))) {
            
            console.log('✅ File deleted from current folder - refreshing view');
            
            // Show notification
            showNotification('File Deleted', `${data.fileName} was deleted`, 'info');
            
            // Refresh the current folder to reflect the deletion
            setTimeout(() => {
                refreshCurrentFolder();
            }, 1000); // Small delay to ensure database is updated
            
        } else {
            console.log('ℹ️ File deleted from different folder - no refresh needed');
            console.log('   Current folder:', currentPath);
            console.log('   File folder:', data.folder);
        }
        
    } catch (error) {
        console.error('❌ Error handling file deleted event:', error);
    }
}

// Helper function to handle file system updates
async function handleFileSystemUpdate(data) {
    console.log('Processing file system update:', data);
    
    if (!data || !data.type) {
        console.error('Invalid file system update data:', data);
        return;
    }

    // UNIFIED MOVE EVENT PROCESSING - Single operation for all move events
    let eventKey;
    if (data.type === 'move') {
        // Create unified move key that works across all event types (move_source, move_target, electron_move)
        const documentName = data.documentName || 'unknown';
        const sourcePath = data.sourcePath || data.sourceFolder || '';
        const targetPath = data.targetFolder || data.targetPath || '';
        const timestamp = data.timestamp || new Date().toISOString();
        
        // NORMALIZE DOCUMENT NAME - Remove .pdf extension for consistent comparison
        const normalizeDocumentName = (name) => {
            if (!name || name === 'unknown') return 'unknown';
            // Remove .pdf extension if present
            return name.toLowerCase().replace(/\.pdf$/i, '');
        };
        
        // Normalize paths to extract folder names consistently
        const normalizePath = (path) => {
            if (!path) return '';
            // Extract folder path from absolute paths
            if (path.includes('/uploads/')) {
                const parts = path.split('/uploads/');
                return parts[1] ? parts[1].split('/').slice(0, -1).join('/') : '';
            }
            // Handle relative folder paths
            if (path.includes('/') && !path.includes('.')) {
                return path;
            }
            return '';
        };
        
        const normalizedDocName = normalizeDocumentName(documentName);
        const sourceFolder = normalizePath(sourcePath);
        const targetFolder = normalizePath(targetPath);
        
        // Create unified move key that ignores eventType differences
        eventKey = `unified_move_${normalizedDocName}_${sourceFolder}_${targetFolder}`;
    } else {
        eventKey = `${data.type}_${data.documentName || ''}_${data.timestamp || Date.now()}`;
    }
    
    if (window.lastProcessedEvent === eventKey) {
        console.log('🔄 Skipping duplicate unified event:', eventKey);
        return;
    }
    window.lastProcessedEvent = eventKey;

    try {
        switch (data.type) {
            case 'move':
                console.log('\n=== MOVE EVENT ===');
                console.log('Source:', data.sourcePath);
                console.log('Target:', data.targetFolder);
                console.log('Document:', data.documentName);
                console.log('Event type:', data.eventType);
                console.log('From Electron:', data.fromElectron);
                
                // === PERFORM LOCAL FILE DOWNLOAD IF FROM REACT ===
                // Check if this is a move from React (not from Electron itself)
                if (!data.fromElectron && data.userId && data.documentName && data.sourcePath && data.targetFolder) {
                    console.log('🔄 === PERFORMING LOCAL FILE DOWNLOAD FROM REACT EVENT ===');
                    
                    try {
                        // Get user info for local paths via IPC
                        if (!window.electron || !window.electron.ipcRenderer) {
                            console.error('electron.ipcRenderer not available');
                            console.log('🔄 Skipping local file operation, will refresh UI only');
                            break;
                        }
                        
                        const userInfo = await window.electron.ipcRenderer.invoke('get-user-info');
                        if (!userInfo) {
                            console.error('No user info available from getUserInfo');
                            console.log('🔄 Skipping local file operation, will refresh UI only');
                            break;
                        }
                        
                        console.log('User info:', userInfo);
                        
                        // Construct local paths
                        const institutionName = userInfo.institution_name;
                        if (!institutionName) {
                            console.error('No institution name in user info:', userInfo);
                            console.log('🔄 Skipping local file operation, will refresh UI only');
                            break;
                        }
                        
                        const docDiLPath = await window.electron.ipcRenderer.invoke('getDocDiLPath');
                        if (!docDiLPath) {
                            console.error('No DocDiL path available');
                            console.log('🔄 Skipping local file operation, will refresh UI only');
                            break;
                        }
                        
                        const institutionPath = `${docDiLPath}/${institutionName}`;
                        
                        // Clean paths by removing institution name if present
                        let cleanSourcePath = data.sourcePath;
                        let cleanDestPath = data.targetFolder;
                        
                        if (cleanSourcePath.startsWith(institutionName + '/')) {
                            cleanSourcePath = cleanSourcePath.substring(institutionName.length + 1);
                        } else if (cleanSourcePath === institutionName) {
                            cleanSourcePath = '';
                        }
                        
                        if (cleanDestPath.startsWith(institutionName + '/')) {
                            cleanDestPath = cleanDestPath.substring(institutionName.length + 1);
                        } else if (cleanDestPath === institutionName) {
                            cleanDestPath = '';
                        }
                        
                        // Construct local folder paths
                        const localSourceFolderPath = cleanSourcePath ? 
                            `${institutionPath}/${cleanSourcePath}` : 
                            institutionPath;
                        const localDestFolderPath = cleanDestPath ? 
                            `${institutionPath}/${cleanDestPath}` : 
                            institutionPath;
                        
                        // Add .pdf extension if not present
                        let fileName = data.documentName;
                        if (!fileName.toLowerCase().endsWith('.pdf')) {
                            fileName += '.pdf';
                        }
                        
                        const localSourceFilePath = `${localSourceFolderPath}/${fileName}`;
                        const localDestFilePath = `${localDestFolderPath}/${fileName}`;
                        
                        console.log('Local source file path:', localSourceFilePath);
                        console.log('Local destination file path:', localDestFilePath);
                        
                        // Check if source file exists locally
                        const sourceExists = await window.electron.ipcRenderer.invoke('fileExists', localSourceFilePath);
                        console.log('Source file exists locally:', sourceExists);
                        
                        if (sourceExists) {
                            // Move file locally
                            console.log('Moving file locally...');
                            
                            // Ensure destination folder exists
                            await window.electron.ipcRenderer.invoke('ensureDirectoryExists', localDestFolderPath);
                            
                            // Move the file
                            await window.electron.ipcRenderer.invoke('moveFile', localSourceFilePath, localDestFilePath);
                            console.log('File moved locally successfully');
                        } else {
                            // Download file from server to new location
                            console.log('File not found locally, downloading from server...');
                            
                            // Ensure destination folder exists
                            await window.electron.ipcRenderer.invoke('ensureDirectoryExists', localDestFolderPath);
                            
                            // Try to download using the most likely URL first
                            const downloadUrl = `http://localhost:3000/uploads/${institutionName}/${cleanDestPath}/${fileName}`;
                            
                                try {
                                console.log('Downloading from URL:', downloadUrl);
                                    
                                    const response = await fetch(downloadUrl, {
                                        method: 'GET',
                                        headers: {
                                            'Origin': 'http://localhost:3001'
                                        }
                                    });
                                    
                                    if (response.ok) {
                                        const arrayBuffer = await response.arrayBuffer();
                                        const buffer = new Uint8Array(arrayBuffer);
                                        
                                        // Save file locally
                                    await window.electron.ipcRenderer.invoke('writeFile', localDestFilePath, buffer);
                                        console.log('File downloaded and saved locally:', localDestFilePath);
                                } else {
                                    console.error('Download failed:', response.status, response.statusText);
                                }
                            } catch (error) {
                                console.error('Download failed:', error.message);
                            }
                        }
                        
                        // Show success notification only if not processing a move from dialog
                        if (!window.isProcessingMove) {
                        showNotification('Document moved successfully', 'success');
                        }
                        
                    } catch (error) {
                        console.error('Error performing local file operation:', error);
                        console.log('🔄 Local file operation failed, but continuing with UI refresh');
                        // Don't show error notification for getUserInfo failures to avoid spam
                        if (!error.message.includes('getUserInfo')) {
                        showNotification('Error moving document locally: ' + error.message, 'error');
                    }
                    }
                }
                
                // Smart refresh: Only refresh if user is in affected folder
                console.log('=== Smart refresh: Checking current folder ===');
                
                try {
                    const currentPath = window.currentFolderPath || '';
                    console.log('Current folder:', currentPath);
                    console.log('Move source:', data.sourcePath);
                    console.log('Move target:', data.targetFolder);
                    
                    // During move operations, prevent root refresh
                    if (window.isProcessingMove && currentPath === '') {
                        console.log('Preventing root refresh during move operation');
                        return;
                    }
                    
                    // Normalize paths for robust comparison
                    const clean = (p) => (p || '').toString().replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();
                    const stripUploads = (p) => {
                        const n = clean(p);
                        const i = n.indexOf('/uploads/');
                        return i !== -1 ? n.substring(i + '/uploads/'.length) : n;
                    };
                    const cleanCurrentPath = stripUploads(currentPath);
                    const cleanSourcePath = stripUploads(data.sourcePath || data.sourceFolder);
                    const cleanTargetPath = stripUploads(data.targetFolder || data.targetPath);

                    // Check if we're in one of the affected folders (normalized)
                    if (cleanCurrentPath === cleanSourcePath || cleanCurrentPath === cleanTargetPath) {
                        console.log('Refreshing current folder:', currentPath);
                        window.electron.ipcRenderer.send('get-folder-structure', {
                            institutionId: window.userData.institution_id,
                            currentPath: currentPath
                        });
                        
                        // Show contextual message
                        if (!window.isProcessingMove) {
                            if (cleanCurrentPath === cleanSourcePath) {
                                showNotification('Document moved from this folder', 'info');
                            } else if (cleanCurrentPath === cleanTargetPath) {
                                showNotification('Document moved to this folder', 'success');
                            }
                        }
                    } else {
                        console.log('ℹ️ User not in affected folder - no refresh needed');
                    }
                } catch (refreshError) {
                    console.error('Error in smart refresh:', refreshError);
                    // NO FALLBACK REFRESH - this was causing the root redirect
                    console.log('Skipping fallback refresh to prevent root redirect');
                }
                break;

            case 'create_folder':
                console.log('Processing create folder event:', data);
                // Skip refresh during move operations to prevent root redirect
                if (!window.isProcessingMove) {
                refreshFolderStructure();
                }
                break;

            case 'remove_folder':
                console.log('Processing remove folder event:', data);
                // Skip refresh during move operations to prevent root redirect
                if (!window.isProcessingMove) {
                refreshFolderStructure();
                }
                break;

            case 'add':
                console.log('\n🎯 === ELECTRON: Processing ADD event for document upload ===');
                console.log('📅 Timestamp:', new Date().toISOString());
                console.log('📦 Event data received:', JSON.stringify(data, null, 2));
                console.log('📄 Document name:', data.documentName);
                console.log('👤 User ID:', data.userId);
                
                // Check if this is a version update
                if (data.isVersionUpdate) {
                    console.log('📄 === VERSION UPDATE DETECTED ===');
                    console.log('📊 Version number:', data.versionNumber);
                    console.log('📄 Document ID:', data.documentId);
                }
                break;

            case 'update':
                console.log('\n📄 === ELECTRON: Processing UPDATE event for version replacement ===');
                console.log('📅 Timestamp:', new Date().toISOString());
                console.log('📦 Event data received:', JSON.stringify(data, null, 2));
                console.log('📄 Document name:', data.documentName);
                console.log('📊 Version number:', data.versionNumber);
                console.log('📄 Document ID:', data.documentId);
                
                // Check if this is a restore operation
                if (data.isRestore) {
                    console.log('🔄 === VERSION RESTORE DETECTED ===');
                    console.log('📊 Restored version number:', data.versionNumber);
                }
                
                // Check if we have updated metadata to apply immediately
                if (data.updatedMetadata) {
                    console.log('📊 === UPDATED METADATA RECEIVED ===');
                    console.log('📊 New metadata:', JSON.stringify(data.updatedMetadata, null, 2));
                    
                    // Update document card in UI with new metadata
                    updateDocumentCardInUI(data.documentId, data.updatedMetadata);
                    
                    // Update local document cache
                    updateLocalDocumentCache(data.documentId, data.updatedMetadata);
                }
                
                // For version updates/restores, force refresh to get updated metadata
                console.log('📄 === VERSION UPDATE/RESTORE: Forcing refresh to get updated metadata ===');
                setTimeout(() => {
                    refreshCurrentFolder();
                }, 500);
                break;
                
                // Normalize paths for comparison - handle both relative and absolute paths
                const normalizePathForComparison = (path) => {
                    if (!path) return '';
                    let normalized = path.toString().replace(/\/$/, '').replace(/\\/g, '/').toLowerCase();
                    
                    // Extract just the institution/folder part from absolute paths
                    if (normalized.includes('/uploads/')) {
                        const parts = normalized.split('/uploads/');
                        if (parts.length > 1) {
                            normalized = parts[1];
                        }
                    }
                    
                    // Remove any remaining absolute path parts
                    if (normalized.includes('/users/') || normalized.includes('/desktop/')) {
                        const pathParts = normalized.split('/');
                        // Find the institution name (usually after the long path)
                        const institutionIndex = pathParts.findIndex(part => part.includes('dabuleni'));
                        if (institutionIndex !== -1) {
                            normalized = pathParts.slice(institutionIndex).join('/');
                        }
                    }
                    
                    // Remove file name if present (keep only folder path)
                    if (normalized.includes('.')) {
                        normalized = normalized.split('/').slice(0, -1).join('/');
                    }
                    
                    return normalized;
                };
                
                const normalizedCurrentPath = normalizePathForComparison(currentPath);
                const normalizedTargetPath = normalizePathForComparison(targetPath);
                
                console.log('🔧 === NORMALIZED PATHS ===');
                console.log('📁 Normalized current path:', JSON.stringify(normalizedCurrentPath));
                console.log('🎯 Normalized target path:', JSON.stringify(normalizedTargetPath));
                console.log('✅ Paths match exactly:', normalizedCurrentPath === normalizedTargetPath);
                
                // Check if document is added to current folder
                if (normalizedCurrentPath === normalizedTargetPath) {
                    console.log('🚀 === MATCH FOUND! Document added to current folder! ===');
                    
                    // For version updates, force refresh to get updated metadata
                    if (data.isVersionUpdate) {
                        console.log('📄 === VERSION UPDATE: Forcing refresh to get updated metadata ===');
                        setTimeout(() => {
                            refreshCurrentFolder();
                        }, 500);
                        return;
                    }
                    // Optimistic UI insert into dashboard grid (#documentsGrid)
                    try {
                        const grid = document.getElementById('documentsGrid');
                        const emptyState = document.getElementById('emptyState');
                        if (grid) {
                            // Ensure grid is visible
                            grid.style.display = 'grid';
                            if (emptyState) emptyState.style.display = 'none';

                            const deriveNameFromPath = (p) => {
                                if (!p) return '';
                                const s = p.toString().replace(/\\/g, '/');
                                const idx = s.lastIndexOf('/');
                                return idx !== -1 ? s.substring(idx + 1) : s;
                            };
                            const docName = (data.fileName && String(data.fileName))
                                || (data.documentName ? (String(data.documentName).toLowerCase().endsWith('.pdf') ? data.documentName : `${data.documentName}.pdf`) : '')
                                || deriveNameFromPath(data.sourcePath)
                                || deriveNameFromPath(data.targetFolder)
                                || 'document.pdf';
                            const docId = data.documentId || `temp_${Date.now()}`;

                            // Skip if a card with same name already exists
                            const existsByName = Array.from(grid.querySelectorAll('h3.text-slate-200'))
                                .some(el => (el.textContent || '').trim().toLowerCase() === docName.toLowerCase());
                            if (!existsByName) {
                                const card = document.createElement('div');
                                card.className = `
                                    bg-slate-700 rounded-lg p-4 border border-slate-600
                                    hover:bg-slate-600 hover:border-blue-500/30 
                                    transition-all duration-200 cursor-pointer group
                                    transform hover:scale-105 hover:shadow-lg opacity-0
                                `;
                                card.dataset.documentName = docName;
                                card.dataset.sourcePath = normalizedTargetPath;
                                const fileSize = '0 KB';
                                const uploadDate = new Date().toLocaleDateString();
                                card.innerHTML = `
                                    <div class="flex items-center justify-between mb-3">
                                        <div class="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                                            <i class="fas fa-file-pdf text-red-400"></i>
                                        </div>
                                        <div class="text-xs text-slate-400">${fileSize}</div>
                                    </div>
                                    <h3 class="text-slate-200 font-medium text-sm mb-2 truncate" title="${docName}">
                                        ${docName}
                                    </h3>
                                    <div class="text-xs text-slate-400 space-y-1">
                                        <div>📅 ${uploadDate}</div>
                                        <div>👤 Unknown</div>
                                        <div class="inline-block bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">PDF</div>
                                    </div>
                                `;
                                grid.insertBefore(card, grid.firstChild);
                                setTimeout(() => { try { card.classList.remove('opacity-0'); } catch {} }, 10);

                                // Persist in memory for subsequent renders
                                try {
                                    const docObj = { id: docId, name: docName, path: normalizedTargetPath, size: 0, uploadDate: new Date().toISOString(), type: 'PDF' };
                                    if (!Array.isArray(window.lastDocuments)) window.lastDocuments = [];
                                    window.lastDocuments = [docObj, ...window.lastDocuments.filter(d => (d?.name || '').toLowerCase() !== docName.toLowerCase())];
                                } catch {}
                            } else {
                                console.log('🔎 Document already present in UI grid, skipping optimistic insert');
                            }
                        } else {
                            console.log('ℹ️ #documentsGrid not found; relying on refresh');
                        }
                    } catch (e) {
                        console.warn('Optimistic insert failed:', e.message);
                    }

                    console.log('📁 Refreshing folder contents (debounced)...');
                    // Debounce refresh to avoid repeated calls
                    window._lastRefreshTs = window._lastRefreshTs || 0;
                    const now = Date.now();
                    if (now - window._lastRefreshTs > 800) {
                        window._lastRefreshTs = now;
                        refreshCurrentFolder();
                    } else {
                        console.log('⏱️ Skipping refresh due to debounce');
                    }
                } else {
                    // Also check if current folder is a parent of target path
                    if (normalizedTargetPath.startsWith(normalizedCurrentPath + '/') && normalizedCurrentPath !== '') {
                        console.log('🔄 === PARENT MATCH! Document added to subfolder ===');
                        console.log('📁 Refreshing parent folder contents...');
                        window._lastRefreshTs = window._lastRefreshTs || 0;
                        const now = Date.now();
                        if (now - window._lastRefreshTs > 800) {
                            window._lastRefreshTs = now;
                            refreshCurrentFolder();
                        } else {
                            console.log('⏱️ Skipping refresh due to debounce');
                        }
                    } else {
                        console.log('ℹ️ === NO MATCH: Document added to different folder ===');
                        console.log('📁 Current folder:', normalizedCurrentPath);
                        console.log('🎯 Target folder:', normalizedTargetPath);
                        console.log('⏭️ No refresh needed for this folder');
                    }
                }
                break;

            case 'delete':
                console.log('\n🗑️ === ELECTRON: Processing DELETE event ===');
                console.log('📅 Timestamp:', new Date().toISOString());
                console.log('📦 Event data received:', JSON.stringify(data, null, 2));
                console.log('📄 Document ID:', data.documentId);
                console.log('👤 User ID:', data.userId);
                
                const sourceFolder = data.sourceFolder || (data.sourcePath ? data.sourcePath.split('/').slice(0, -1).join('/') : null);
                const currentDeleteFolderPath = getCurrentFolderPath();
                
                console.log('🔍 === PATH ANALYSIS FOR DELETE ===');
                console.log('📁 Current folder path:', JSON.stringify(currentDeleteFolderPath));
                console.log('📤 Source folder:', JSON.stringify(sourceFolder));
                
                if (currentDeleteFolderPath === sourceFolder) {
                    console.log('✅ DELETE affects current folder - making FRESH FETCH from backend');
                    
                    // ✅ FETCH FRESH DATA FROM MAIN BACKEND (like move does)
                    setTimeout(async () => {
                        try {
                            console.log('🔄 === FRESH FETCH FROM BACKEND FOR DELETE ===');
                            console.log('📡 Making direct HTTP request to backend...');
                            
                            // Make direct request to main backend server (same as React frontend)
                            const response = await fetch(`${API_URL}/post_docs/documents`, {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Origin': window.location.origin
                                },
                                credentials: 'include'
                            });
                            
                            if (response.ok) {
                                const freshData = await response.json();
                                console.log('✅ Fresh data received from backend:', freshData);
                                
                                // Update the UI with fresh data (React format)
                                if (freshData.success && freshData.documents) {
                                    console.log(`📊 Fresh data shows ${freshData.documents.length} total documents`);
                                    
                                    // Convert React format to Electron format and filter for current folder
                                    const processedDocuments = freshData.documents
                                        .filter(doc => {
                                            // Filter by current folder path
                                            const docFolder = doc.path || '';
                                            const cleanCurrentPath = currentDeleteFolderPath.replace(/\/$/, '');
                                            const cleanDocPath = docFolder.replace(/\/$/, '');
                                            return cleanDocPath === cleanCurrentPath;
                                        })
                                        .map(doc => ({
                                            id: doc.id,
                                            name: doc.name,
                                            path: doc.path,
                                            uploadDate: doc.uploadDate,
                                            size: doc.file_size || doc.size,
                                            type: doc.type,
                                            comment: doc.comment || '',
                                            keywords: [doc.mot1, doc.mot2, doc.mot3, doc.mot4, doc.mot5].filter(Boolean),
                                            uploadedBy: doc.uploadedBy
                                        }));
                                    
                                    console.log(`🎯 Filtered documents for path "${currentDeleteFolderPath}":`, processedDocuments.length);
                                    console.log('🗑️ Document should be gone from current folder!');
                                    
                                    // Trigger UI update with fresh data
                                    const folderStructureEvent = {
                                        institutionName: window.userData?.institution_name || 'Unknown',
                                        currentPath: currentDeleteFolderPath,
                                        folders: [], // We don't need folders for document updates
                                        documents: processedDocuments,
                                        eventType: 'delete' // Add event type for notification
                                    };
                                    
                                    // Simulate folder-structure event to update UI
                                    window.dispatchEvent(new CustomEvent('fresh-folder-data', {
                                        detail: folderStructureEvent
                                    }));
                                }
                            } else {
                                console.error('❌ Backend request failed:', response.status, response.statusText);
                                // NO FALLBACK REFRESH - this was causing root redirect
                                console.log('Skipping fallback refresh to prevent root redirect');
                            }
                        } catch (error) {
                            console.error('❌ Error fetching fresh data from backend:', error);
                            // NO FALLBACK REFRESH - this was causing root redirect
                            console.log('Skipping fallback refresh to prevent root redirect');
                        }
                    }, 1000); // 1 second delay to ensure backend DELETE is complete
                } else {
                    console.log('ℹ️ DELETE does not affect current folder - no refresh needed');
                }
                break;

            case 'restore':
                console.log('\n♻️ === ELECTRON: Processing RESTORE event ===');
                console.log('📅 Timestamp:', new Date().toISOString());
                console.log('📦 Event data received:', JSON.stringify(data, null, 2));
                console.log('📄 Document ID:', data.documentId);
                console.log('👤 User ID:', data.userId);
                
                const targetFolder = data.targetFolder || data.destinationPath;
                const currentRestoreFolderPath = getCurrentFolderPath();
                
                console.log('🔍 === PATH ANALYSIS FOR RESTORE ===');
                console.log('📁 Current folder path:', JSON.stringify(currentRestoreFolderPath));
                console.log('📥 Target folder:', JSON.stringify(targetFolder));
                
                if (currentRestoreFolderPath === targetFolder) {
                    console.log('✅ RESTORE affects current folder - making FRESH FETCH from backend');
                    
                    // ✅ FETCH FRESH DATA FROM MAIN BACKEND (like move and delete)
                    setTimeout(async () => {
                        try {
                            console.log('🔄 === FRESH FETCH FROM BACKEND FOR RESTORE ===');
                            console.log('📡 Making direct HTTP request to backend...');
                            
                            // Make direct request to main backend server (same as React frontend)
                            const response = await fetch(`${API_URL}/post_docs/documents`, {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Origin': window.location.origin
                                },
                                credentials: 'include'
                            });
                            
                            if (response.ok) {
                                const freshData = await response.json();
                                console.log('✅ Fresh data received from backend:', freshData);
                                
                                // Update the UI with fresh data (React format)
                                if (freshData.success && freshData.documents) {
                                    console.log(`📊 Fresh data shows ${freshData.documents.length} total documents`);
                                    
                                    // Convert React format to Electron format and filter for current folder
                                    const processedDocuments = freshData.documents
                                        .filter(doc => {
                                            // Filter by current folder path
                                            const docFolder = doc.path || '';
                                            const cleanCurrentPath = currentRestoreFolderPath.replace(/\/$/, '');
                                            const cleanDocPath = docFolder.replace(/\/$/, '');
                                            return cleanDocPath === cleanCurrentPath;
                                        })
                                        .map(doc => ({
                                            id: doc.id,
                                            name: doc.name,
                                            path: doc.path,
                                            uploadDate: doc.uploadDate,
                                            size: doc.file_size || doc.size,
                                            type: doc.type,
                                            comment: doc.comment || '',
                                            keywords: [doc.mot1, doc.mot2, doc.mot3, doc.mot4, doc.mot5].filter(Boolean),
                                            uploadedBy: doc.uploadedBy
                                        }));
                                    
                                    console.log(`🎯 Filtered documents for path "${currentRestoreFolderPath}":`, processedDocuments.length);
                                    console.log('♻️ Document should now appear in current folder!');
                                    
                                    // Trigger UI update with fresh data
                                    const folderStructureEvent = {
                                        institutionName: window.userData?.institution_name || 'Unknown',
                                        currentPath: currentRestoreFolderPath,
                                        folders: [], // We don't need folders for document updates
                                        documents: processedDocuments,
                                        eventType: 'restore' // Add event type for notification
                                    };
                                    
                                    // Simulate folder-structure event to update UI
                                    window.dispatchEvent(new CustomEvent('fresh-folder-data', {
                                        detail: folderStructureEvent
                                    }));
                                }
                            } else {
                                console.error('❌ Backend request failed:', response.status, response.statusText);
                                // NO FALLBACK REFRESH - this was causing root redirect
                                console.log('Skipping fallback refresh to prevent root redirect');
                            }
                        } catch (error) {
                            console.error('❌ Error fetching fresh data from backend:', error);
                            // NO FALLBACK REFRESH - this was causing root redirect
                            console.log('Skipping fallback refresh to prevent root redirect');
                        }
                    }, 1000); // 1 second delay to ensure backend RESTORE is complete
                } else {
                    console.log('ℹ️ RESTORE does not affect current folder - no refresh needed');
                }
                break;

            case 'refresh_folder':
                console.log('\n🔄 === PROCESSING refresh_folder EVENT ===');
                console.log('📦 Event data:', JSON.stringify(data, null, 2));
                console.log('📁 Current folder path:', getCurrentFolderPath());
                console.log('🎯 Folder to refresh:', data.folderPath);
                
                // Normalizează căile pentru comparație
                const currentRefreshPath = getCurrentFolderPath();
                const refreshFolderPath = data.folderPath;
                const isMoveEvent = data.eventType && (data.eventType === 'move_source' || data.eventType === 'move_target');
                
                console.log('🔍 Event type:', data.eventType || 'unknown');
                console.log('🔍 Is move event:', isMoveEvent);
                console.log('🔍 Paths match?', currentRefreshPath === refreshFolderPath);
                
                if (currentRefreshPath && refreshFolderPath && 
                    (currentRefreshPath === refreshFolderPath || 
                     currentRefreshPath.replace(/\/$/, '') === refreshFolderPath.replace(/\/$/, ''))) {
                    
                    console.log('✅ PATHS MATCH! Force fetching FRESH data from backend');
                    
                    // ✅ FOR MOVE EVENTS: FORCE FRESH FETCH FROM BACKEND (like upload does)
                    if (isMoveEvent) {
                        console.log('🚀 MOVE EVENT: Force fetching fresh data with delay for database UPDATE');
                        
                        // Add delay for move operations to ensure backend UPDATE is complete
                        setTimeout(() => {
                            console.log('📤 Sending get-folder-structure for MOVE with fresh data');
                            window.electron.ipcRenderer.send('get-folder-structure', {
                                institutionId: window.userData?.institution_id,
                                currentPath: refreshFolderPath
                            });
                        }, 1500); // 1.5 second delay for database UPDATE to complete
                    } else {
                        console.log('📤 Regular refresh_folder - fetching fresh data');
                        window.electron.ipcRenderer.send('get-folder-structure', {
                            institutionId: window.userData?.institution_id,
                            currentPath: refreshFolderPath
                        });
                    }
                } else {
                    console.log('❌ PATHS DO NOT MATCH! No refresh needed');
                    console.log('   Current:', `"${currentRefreshPath}"`);
                    console.log('   Target:', `"${refreshFolderPath}"`);
                }
                break;

            case 'folder_create':
                console.log('\n📁➕ === ELECTRON: Processing FOLDER CREATE event ===');
                console.log('📅 Timestamp:', new Date().toISOString());
                console.log('📦 Event data received:', JSON.stringify(data, null, 2));
                console.log('📁 Folder ID:', data.folderId);
                console.log('📂 Folder Name:', data.folderName);
                console.log('📍 Folder Path:', data.folderPath);
                console.log('👤 User ID:', data.userId);
                
                const parentPath = data.parentPath || getDirname(data.folderPath);
                const currentCreateFolderPath = getCurrentFolderPath();
                
                console.log('🔍 === PATH ANALYSIS FOR FOLDER CREATE ===');
                console.log('📁 Current folder path:', JSON.stringify(currentCreateFolderPath));
                console.log('📂 Parent folder path:', JSON.stringify(parentPath));
                
                if (currentCreateFolderPath === parentPath) {
                    console.log('✅ FOLDER CREATE affects current folder - refreshing');
                    refreshCurrentFolder();
                } else {
                    console.log('ℹ️ FOLDER CREATE does not affect current folder - no refresh needed');
                }
                break;

            case 'folder_delete':
                console.log('\n📁🗑️ === ELECTRON: Processing FOLDER DELETE event ===');
                console.log('📅 Timestamp:', new Date().toISOString());
                console.log('📦 Event data received:', JSON.stringify(data, null, 2));
                console.log('📁 Folder ID:', data.folderId);
                console.log('📂 Folder Name:', data.folderName);
                console.log('📍 Folder Path:', data.folderPath);
                console.log('👤 User ID:', data.userId);
                
                const folderDeleteParentPath = data.parentPath || getDirname(data.folderPath);
                const currentFolderDeletePath = getCurrentFolderPath();
                
                console.log('🔍 === PATH ANALYSIS FOR FOLDER DELETE ===');
                console.log('📁 Current folder path:', JSON.stringify(currentFolderDeletePath));
                console.log('📂 Parent folder path:', JSON.stringify(folderDeleteParentPath));
                console.log('🗑️ Deleted folder path:', JSON.stringify(data.folderPath));
                
                // Check if we are in the deleted folder or its parent
                if (currentFolderDeletePath === data.folderPath) {
                    console.log('⚠️ Current folder was deleted - navigating to parent');
                    // Navigate to parent folder since current folder was deleted
                    window.electron.ipcRenderer.send('get-folder-structure', {
                        institutionId: window.userData?.institution_id,
                        currentPath: folderDeleteParentPath
                    });
                } else if (currentFolderDeletePath === folderDeleteParentPath) {
                    console.log('✅ FOLDER DELETE affects current folder - refreshing');
                    refreshCurrentFolder();
                } else {
                    console.log('ℹ️ FOLDER DELETE does not affect current folder - no refresh needed');
                }
                break;

            case 'folder_move':
                console.log('\n📁➡️ === ELECTRON: Processing FOLDER MOVE event ===');
                console.log('📅 Timestamp:', new Date().toISOString());
                console.log('📦 Event data received:', JSON.stringify(data, null, 2));
                console.log('📁 Old Path:', data.oldPath);
                console.log('📂 New Path:', data.newPath);
                console.log('📍 Parent Path:', data.parentPath);
                
                // Get current folder path for comparison
                const currentMoveFolderPath = getCurrentFolderPath();
                console.log('🔍 === PATH ANALYSIS FOR FOLDER MOVE ===');
                console.log('📁 Current folder path:', JSON.stringify(currentMoveFolderPath));
                console.log('📂 Old folder path:', JSON.stringify(data.oldPath));
                console.log('📍 New parent path:', JSON.stringify(data.parentPath));
                console.log('📁 New folder path:', JSON.stringify(data.newPath));
                
                // Check if we need to refresh the current view
                const needsMoveRefresh = (
                    // If we're viewing a parent folder that contains the moved folder
                    (currentMoveFolderPath && data.oldPath && data.oldPath.startsWith(currentMoveFolderPath + '/')) ||
                    // If we're viewing the destination folder (folder appeared)
                    currentMoveFolderPath === data.parentPath ||
                    // If we're viewing the moved folder itself (path changed) - need to navigate to new path
                    currentMoveFolderPath === data.oldPath ||
                    // If we're viewing the new location
                    currentMoveFolderPath === data.newPath ||
                    // If the current folder is a parent of either old or new path
                    (data.oldPath && data.oldPath.startsWith(currentMoveFolderPath)) ||
                    (data.newPath && data.newPath.startsWith(currentMoveFolderPath))
                );
                
                if (needsMoveRefresh || data.forceRefresh) {
                    console.log('✅ FOLDER MOVE affects current view - refreshing with delay');
                    // Add delay to ensure backend database updates are complete
                    setTimeout(() => {
                        console.log('🔄 Refreshing folder structure after folder move');
                        refreshCurrentFolder();
                    }, 1500); // 1.5 second delay for database updates
                } else {
                    console.log('ℹ️ FOLDER MOVE does not affect current view - no refresh needed');
                }
                break;

            default:
                console.warn('Unknown file system event type:', data.type);
        }
    } catch (error) {
        console.error('Error processing file system update:', error);
    }
}

// Funcție helper pentru a obține calea folderului curent
function getCurrentFolderPath() {
    console.log('\n🔍 === ELECTRON: getCurrentFolderPath called ===');
    
    // Try to get path from window globals first
    if (window.currentFolderPath) {
        console.log('DEBUG: Found current folder path in window.currentFolderPath:', window.currentFolderPath);
        return window.currentFolderPath;
    }
    
    // Try to get path from breadcrumb element
    const breadcrumbContainer = document.querySelector('.breadcrumb-container');
    if (breadcrumbContainer) {
        const breadcrumbPath = breadcrumbContainer.getAttribute('data-current-path');
        if (breadcrumbPath) {
            console.log('DEBUG: Found current folder path in breadcrumb data:', breadcrumbPath);
            return breadcrumbPath;
        }
    }
    
    // Try to get from breadcrumb text
    const breadcrumb = document.querySelector('.breadcrumb');
    if (breadcrumb) {
        const breadcrumbText = breadcrumb.textContent.trim();
        console.log('DEBUG: Breadcrumb text:', breadcrumbText);
        
        // Convert "Root / Folder1 / Folder2" to "Folder1/Folder2"
        if (breadcrumbText && breadcrumbText !== 'Root') {
            // Extract path after institution name
            const parts = breadcrumbText.split(' / ');
            if (parts.length > 1) {
                // Remove "Root" and join remaining parts
                const pathParts = parts.slice(1);
                const path = pathParts.join('/');
                console.log('DEBUG: Extracted path from breadcrumb:', path);
                return path;
            }
        }
    }
    
    // Try to get from active folder element
    const activeFolder = document.querySelector('.folder-item.active, .folder-item[data-active="true"]');
    if (activeFolder && activeFolder.dataset.path) {
        console.log('DEBUG: Found current folder path in active folder:', activeFolder.dataset.path);
        return activeFolder.dataset.path;
    }
    
    // Try to get from current-folder class
    const currentFolder = document.querySelector('.current-folder');
    if (currentFolder && currentFolder.dataset.path) {
        console.log('DEBUG: Found current folder path in current-folder dataset:', currentFolder.dataset.path);
        return currentFolder.dataset.path;
    }
    
    // Try to get from currentPath element  
    const currentPathElement = document.getElementById('currentPath');
    if (currentPathElement) {
        const pathText = currentPathElement.textContent.trim();
        console.log('DEBUG: currentPath element text:', pathText);
        if (pathText && pathText !== 'Root') {
            const path = pathText.replace(/^Root\s*\/\s*/, '').replace(/\s*\/\s*/g, '/');
            console.log('DEBUG: Extracted path from currentPath element:', path);
            return path;
        }
    }
    
    // Try to get from URL hash or other state
    if (window.location.hash) {
        const hashPath = window.location.hash.replace('#', '');
        if (hashPath) {
            console.log('DEBUG: Found path in URL hash:', hashPath);
            return hashPath;
        }
    }
    
    console.log('DEBUG: No current folder path found, returning empty string for root');
    return '';
}

// Function to update document card metadata in UI
function updateDocumentCardInUI(documentId, metadata) {
    try {
        console.log('🔄 === UPDATING DOCUMENT CARD METADATA IN UI ===');
        console.log('📄 Document ID:', documentId);
        console.log('📊 New metadata:', JSON.stringify(metadata, null, 2));
        
        // Find the document card by data attribute or document name
        const grid = document.getElementById('documentsGrid');
        console.log('🔍 Documents grid found:', !!grid);
        if (!grid) {
            console.log('❌ Documents grid not found');
            return;
        }
        
        // Try to find card by document ID first, then by name
        let card = grid.querySelector(`[data-document-id="${documentId}"]`);
        console.log('🔍 Card found by ID:', !!card);
        if (!card) {
            card = grid.querySelector(`[data-document-name="${metadata.name}"]`);
            console.log('🔍 Card found by name:', !!card);
        }
        
        if (!card) {
            console.log('❌ Document card not found in UI');
            console.log('🔍 Available cards:', grid.querySelectorAll('[data-document-id], [data-document-name]').length);
            console.log('🔍 Looking for ID:', documentId);
            console.log('🔍 Looking for name:', metadata.name);
            return;
        }
        
        console.log('✅ Found document card, updating metadata...');
        console.log('📊 Card element:', card);
        
        // Update file size
        const sizeElement = card.querySelector('.text-slate-400');
        console.log('🔍 Size element found:', !!sizeElement);
        if (sizeElement && metadata.size) {
            const sizeInKB = Math.round(metadata.size / 1024 * 100) / 100;
            console.log('📊 Updating size from', sizeElement.textContent, 'to', `${sizeInKB} KB`);
            sizeElement.textContent = `${sizeInKB} KB`;
        }
        
        // Update document name if changed
        const nameElement = card.querySelector('h3.text-slate-200');
        console.log('🔍 Name element found:', !!nameElement);
        if (nameElement && metadata.name) {
            console.log('📊 Updating name from', nameElement.textContent, 'to', metadata.name);
            nameElement.textContent = metadata.name;
            nameElement.title = metadata.name;
        }
        
        // Update upload date
        const dateElement = card.querySelector('.text-xs.text-slate-400');
        console.log('🔍 Date element found:', !!dateElement);
        if (dateElement && metadata.uploadDate) {
            const uploadDate = new Date(metadata.uploadDate).toLocaleDateString();
            const dateText = dateElement.textContent;
            console.log('📊 Updating date from', dateText, 'to', `📅 ${uploadDate}`);
            if (dateText.includes('📅')) {
                dateElement.textContent = `📅 ${uploadDate}`;
            }
        }
        
        // Update document type
        const typeElement = card.querySelector('.bg-blue-500\\/20');
        console.log('🔍 Type element found:', !!typeElement);
        if (typeElement && metadata.type) {
            console.log('📊 Updating type from', typeElement.textContent, 'to', metadata.type);
            typeElement.textContent = metadata.type;
        }
        
        // Add visual indicator that metadata was updated
        console.log('🎨 Adding visual highlight to card');
        card.style.borderColor = '#10b981';
        card.style.borderWidth = '2px';
        card.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.3)';
        
        // Remove the highlight after 3 seconds
        setTimeout(() => {
            console.log('🎨 Removing visual highlight from card');
            card.style.borderColor = '';
            card.style.borderWidth = '';
            card.style.boxShadow = '';
        }, 3000);
        
        console.log('✅ Document card metadata updated successfully');
        
    } catch (error) {
        console.error('❌ Error updating document card metadata:', error);
        console.error('❌ Error details:', error.message);
        console.error('❌ Error stack:', error.stack);
    }
}

// Function to update local document cache
function updateLocalDocumentCache(documentId, metadata) {
    try {
        console.log('💾 === UPDATING LOCAL DOCUMENT CACHE ===');
        console.log('📄 Document ID:', documentId);
        console.log('📊 New metadata:', JSON.stringify(metadata, null, 2));
        
        // Update window.lastDocuments cache
        if (Array.isArray(window.lastDocuments)) {
            const docIndex = window.lastDocuments.findIndex(doc => doc.id == documentId);
            if (docIndex !== -1) {
                console.log('📊 Found document in cache, updating...');
                window.lastDocuments[docIndex] = {
                    ...window.lastDocuments[docIndex],
                    ...metadata,
                    id: documentId
                };
                console.log('✅ Document cache updated successfully');
            } else {
                console.log('⚠️ Document not found in cache, adding new entry');
                window.lastDocuments.push({
                    id: documentId,
                    ...metadata
                });
            }
        } else {
            console.log('📊 Initializing document cache with new document');
            window.lastDocuments = [{
                id: documentId,
                ...metadata
            }];
        }
        
        // Update any other caches that might exist
        if (window.documentCache && window.documentCache[documentId]) {
            console.log('📊 Updating documentCache...');
            window.documentCache[documentId] = {
                ...window.documentCache[documentId],
                ...metadata
            };
        }
        
        console.log('✅ Local document cache updated successfully');
        
    } catch (error) {
        console.error('❌ Error updating local document cache:', error);
        console.error('❌ Error details:', error.message);
    }
}

// Funcție pentru reîmprospătarea folderului curent
function refreshCurrentFolder() {
    console.log('\n🔄 === ELECTRON: refreshCurrentFolder called ===');
    console.log('📅 Timestamp:', new Date().toISOString());
    
    // During move operations, prevent unnecessary refreshes
    if (window.isProcessingMove) {
        console.log('🛡️ Skipping refresh during move operation to prevent navigation issues');
        return;
    }
    
    const folderPath = getCurrentFolderPath();
    console.log('📁 Folder path to refresh:', folderPath);
    
    // ALWAYS use the detected folder path - never fall back to root during refresh
    console.log('🚀 Refreshing specific folder to stay in same location:', folderPath || 'root');
    
    // Trimite cerere către main process pentru a încărca din nou conținutul folderului
    window.electron.ipcRenderer.send('get-folder-structure', {
        institutionId: window.userData?.institution_id,
        currentPath: folderPath || ''  // Use detected path or root
    });
    
    console.log('📤 Sent get-folder-structure request with path:', folderPath || 'root');
    
    // De asemenea, să reîncărcăm documentele din folderul curent
    setTimeout(() => {
        if (window.userData?.institution_id && !window.isProcessingMove) {
            window.electron.ipcRenderer.send('load-folder-documents', {
                institutionId: window.userData.institution_id,
                folderPath: folderPath || ''
            });
        }
    }, 500);
}

// Funcție pentru reîmprospătarea structurii de foldere
function refreshFolderStructure() {
    console.log('Refreshing folder structure');
    
    // During move operations, prevent refreshes that could cause root redirect
    if (window.isProcessingMove) {
        console.log('🛡️ Skipping folder structure refresh during move operation');
        return;
    }
    
    // Use refreshCurrentFolder instead of non-existent fetchFolderStructure
    refreshCurrentFolder();
}

// Global socket variable
let globalSocket = null;

// Helper function to get socket safely
function getSocket() {
    console.log('\n=== DEBUG: getSocket() called ===');
    console.log('Global socket exists:', !!globalSocket);
    console.log('Window socket exists:', !!window.socket);
    console.log('Global socket connected:', globalSocket?.connected);
    console.log('Global socket ID:', globalSocket?.id);
    
    if (globalSocket && globalSocket.connected) {
        console.log('✅ Returning global socket');
        return globalSocket;
    } else if (window.socket && window.socket.connected) {
        console.log('✅ Returning window socket');
        return window.socket;
    } else {
        console.log('❌ No active socket found');
        return null;
    }
}

// Initialize socket when document is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('\n=== DEBUG: Document ready, initializing socket ===');
    globalSocket = initializeSocket();
    window.socket = globalSocket; // Store socket instance globally for console access
    
    // Add a delay to ensure socket is fully connected before testing
    setTimeout(() => {
        console.log('\n=== DEBUG: Socket stored globally (after delay) ===');
        console.log('Global socket exists:', !!globalSocket);
        console.log('Window socket exists:', !!window.socket);
        console.log('Socket connected:', globalSocket?.connected);
        console.log('Socket ID:', globalSocket?.id);
        
        // Test socket functionality
        const testSocket = getSocket();
        if (testSocket) {
            console.log('✅ Socket test successful');
        } else {
            console.log('❌ Socket test failed');
        }
    }, 2000);
}); 