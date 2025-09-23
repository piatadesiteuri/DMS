const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');

class FileWatcher {
    constructor(io, basePath) {
        this.io = io;
        this.basePath = basePath;
        this.watcher = null;
        this.lastDeletedFile = null;
        this.lastDeletedTime = null;
        this.moveTimeout = null;
        this.fileCache = new Map();
        this.folderCache = new Set();
        console.log('FileWatcher initialized with basePath:', basePath);
    }

    start() {
        const watchPath = this.basePath;
        console.log('Starting file watcher for path:', watchPath);

        // Initialize folder cache
        this.initializeFolderCache(watchPath);

        this.watcher = chokidar.watch(watchPath, {
            persistent: true,
            ignoreInitial: false,
            depth: 99,
            awaitWriteFinish: {
                stabilityThreshold: 2000,
                pollInterval: 100
            }
        });

        // Handle directory creation
        this.watcher.on('addDir', (dirPath) => {
            // Reduce logging in production
            if (process.env.NODE_ENV !== 'production') {
                console.log('=== Directory Created Event ===');
                console.log('Directory path:', dirPath);
                console.log('Full path:', path.resolve(dirPath));
            }
            
            const relativePath = path.relative(this.basePath, dirPath);
            this.folderCache.add(relativePath);

            const eventData = {
                type: 'create_folder',
                folderPath: relativePath,
                timestamp: new Date().toISOString()
            };
            
            if (process.env.NODE_ENV !== 'production') {
                console.log('Emitting create_folder event:', eventData);
            }
            this.io.emit('fileSystemUpdate', eventData);
        });

        // Handle directory removal
        this.watcher.on('unlinkDir', (dirPath) => {
            if (process.env.NODE_ENV !== 'production') {
                console.log('=== Directory Removed Event ===');
                console.log('Directory path:', dirPath);
                console.log('Full path:', path.resolve(dirPath));
            }
            
            const relativePath = path.relative(this.basePath, dirPath);
            this.folderCache.delete(relativePath);

            const eventData = {
                type: 'remove_folder',
                folderPath: relativePath,
                timestamp: new Date().toISOString()
            };
            
            if (process.env.NODE_ENV !== 'production') {
                console.log('Emitting remove_folder event:', eventData);
            }
            this.io.emit('fileSystemUpdate', eventData);
        });

        // Handle file moves
        this.watcher.on('unlink', (filePath) => {
            if (process.env.NODE_ENV !== 'production') {
                console.log('=== File Deleted Event ===');
                console.log('File path:', filePath);
                console.log('Full path:', path.resolve(filePath));
            }
            
            // Verifică dacă fișierul există în cache
            const cachedFile = this.fileCache.get(filePath);
            if (cachedFile) {
                this.lastDeletedFile = {
                    path: filePath,
                    folder: path.dirname(filePath), // Send full folder path instead of just name
                    timestamp: Date.now()
                };
                this.lastDeletedTime = Date.now();
                this.fileCache.delete(filePath);
            }

            // Clear any existing move timeout
            if (this.moveTimeout) {
                clearTimeout(this.moveTimeout);
            }

            // Set a timeout to handle the case where a file is deleted but not moved
            this.moveTimeout = setTimeout(() => {
                if (this.lastDeletedFile && this.lastDeletedFile.path === filePath) {
                    if (process.env.NODE_ENV !== 'production') {
                        console.log('=== File Deleted (Not Moved) ===');
                        console.log('File path:', filePath);
                        const folder = path.basename(path.dirname(filePath));
                        console.log('Folder:', folder);
                    }
                
                const eventData = {
                    type: 'delete',
                    sourcePath: filePath,
                    targetFolder: path.dirname(filePath), // Send full folder path instead of just name
                    timestamp: new Date().toISOString()
                };
                    if (process.env.NODE_ENV !== 'production') {
                        console.log('Emitting delete event:', eventData);
                    }
                    this.io.emit('fileSystemUpdate', eventData);
                    
                    this.lastDeletedFile = null;
                    this.lastDeletedTime = null;
                }
            }, 2000);
        });

        this.watcher.on('add', (filePath, stats) => {
            if (process.env.NODE_ENV !== 'production') {
                console.log('=== File Added Event ===');
                console.log('File path:', filePath);
                console.log('Full path:', path.resolve(filePath));
                console.log('File stats:', stats);
            }
            
            const newFile = {
                path: filePath,
                folder: path.dirname(filePath), // Send full folder path instead of just name
                timestamp: Date.now()
            };

            // Check if this is a move operation
            if (this.lastDeletedFile && 
                (Date.now() - this.lastDeletedTime) < 2000 && // Within 2 seconds
                path.basename(this.lastDeletedFile.path) === path.basename(filePath)) {
                
                // This is a move operation
                const sourceFolder = this.lastDeletedFile.folder;
                const targetFolder = path.dirname(filePath); // Send full folder path instead of just name
                
                if (process.env.NODE_ENV !== 'production') {
                    console.log('=== File Move Detected ===');
                    console.log('From:', this.lastDeletedFile.path);
                    console.log('To:', filePath);
                    console.log('Source Folder:', sourceFolder);
                    console.log('Target Folder:', targetFolder);
                }

                // Clear the move timeout since we've detected a move
                if (this.moveTimeout) {
                    clearTimeout(this.moveTimeout);
                    this.moveTimeout = null;
                }

                const eventData = {
                    type: 'move',
                    sourcePath: this.lastDeletedFile.path,
                    targetPath: filePath,
                    targetFolder: targetFolder,
                    timestamp: new Date().toISOString()
                };
                if (process.env.NODE_ENV !== 'production') {
                    console.log('Emitting move event:', eventData);
                }
                this.io.emit('fileSystemUpdate', eventData);

                // Reset the move tracking
                this.lastDeletedFile = null;
                this.lastDeletedTime = null;
            } else {
                // This is a new file
                if (process.env.NODE_ENV !== 'production') {
                    console.log('=== New File Detected ===');
                    console.log('File path:', filePath);
                    console.log('Folder:', newFile.folder);
                }
                
                const eventData = {
                    type: 'add',
                    sourcePath: filePath,
                    targetFolder: path.dirname(filePath), // Send full folder path instead of just name
                    timestamp: new Date().toISOString()
                };
                if (process.env.NODE_ENV !== 'production') {
                    console.log('Emitting add event:', eventData);
                }
                this.io.emit('fileSystemUpdate', eventData);
            }

            // Update cache
            this.fileCache.set(filePath, newFile);
        });

        this.watcher.on('ready', () => {
            if (process.env.NODE_ENV !== 'production') {
                console.log('=== File System Watcher Ready ===');
                console.log('Watching path:', watchPath);
                console.log('Initial folder cache:', Array.from(this.folderCache));
            }
        });

        this.watcher.on('error', (error) => {
            console.error('=== File System Watcher Error ===');
            console.error('Error details:', error);
        });
    }

    initializeFolderCache(basePath) {
        const scanDirectory = (dirPath) => {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                const relativePath = path.relative(this.basePath, fullPath);
                
                if (entry.isDirectory()) {
                    this.folderCache.add(relativePath);
                    scanDirectory(fullPath);
                }
            }
        };

        try {
            scanDirectory(basePath);
            if (process.env.NODE_ENV !== 'production') {
                console.log('Initialized folder cache with', this.folderCache.size, 'folders');
            } else {
                console.log('FileWatcher initialized and started');
            }
        } catch (error) {
            console.error('Error initializing folder cache:', error);
        }
    }

    stop() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
            this.fileCache.clear();
            this.folderCache.clear();
            console.log('File watcher stopped');
        }
    }
}

module.exports = FileWatcher; 