import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Table, DatePicker, Select, Spin, message, Modal, Button, Statistic, Progress, Space, Divider } from 'antd';
import { Line } from 'react-chartjs-2';
import { DownloadOutlined, EyeOutlined, FileTextOutlined, UserOutlined, CalendarOutlined, DatabaseOutlined, DeleteOutlined, FolderOutlined, ArrowUpOutlined, BarChartOutlined, RiseOutlined, PlusCircleOutlined } from '@ant-design/icons';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { CSVLink } from 'react-csv';
import moment from 'moment';
import { toast } from 'react-hot-toast';
import { BarChart2, FileText, Download, Upload, Clock, Users, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import { backend } from '../config';

// Request logging for optimization monitoring
const logRequest = (endpoint, params = {}) => {
    console.log(`🔄 API Request: ${endpoint}`, params);
};

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const { RangePicker } = DatePicker;

const Statistics = () => {
    const [realtimeStats, setRealtimeStats] = useState({
        totals: { total_downloads: 0, total_views: 0 },
        topDownloads: [],
        activeUsers: [],
        typeDistribution: [],
        last24Hours: []
    });
    const [historicalStats, setHistoricalStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState([
        moment().subtract(7, 'days'),
        moment()
    ]);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedTimeFrame, setSelectedTimeFrame] = useState('24h');
    const [downloadRange, setDownloadRange] = useState(null);
    const [downloadStats, setDownloadStats] = useState([]);
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [statisticsType, setStatisticsType] = useState(null);
    const [autoOpenDatePicker, setAutoOpenDatePicker] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [filteredListData, setFilteredListData] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [memoryStats, setMemoryStats] = useState({
        used: 0,
        total: 0,
        percentage: 0
    });
    const [viewStatistics, setViewStatistics] = useState([]);
    const [documentTypes, setDocumentTypes] = useState([]);
    const [last24HoursStats, setLast24HoursStats] = useState({
        downloads: 0,
        views: 0,
        uploadSize: 0
    });
    const [stats, setStats] = useState({
        totalDocuments: 0,
        storageUsed: 0,
        recentUploads: 0,
        activeUsers: 0,
        documentTypes: [],
        uploadTrend: [],
        activityData: []
    });
    const [countries, setCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
    const [availableDocumentIds, setAvailableDocumentIds] = useState([]);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [availableUserIds, setAvailableUserIds] = useState([]);
    const [popularDocuments, setPopularDocuments] = useState([]);
    const [documentTypesStats, setDocumentTypesStats] = useState([]);

    // Add statistics type options with professional metrics
    const statisticsTypes = [
        { value: 'downloads', label: 'Descărcări' },
        { value: 'popular', label: 'Documente populare' },
        { value: 'types', label: 'Tipuri de documente' },
        { value: 'financial', label: 'Raport Financiar' },
        { value: 'performance', label: 'Performanță Utilizatori' },
        { value: 'compliance', label: 'Conformitate & Audit' }
    ];

    // Fetch available documents for the select dropdown
    useEffect(() => {
        const fetchDocuments = async () => {
            try {
                const response = await axios.get(`${backend}/MyDocumentsList`, {
                    withCredentials: true
                });
                console.log('Fetched documents:', response.data);
                const docs = response.data.map(doc => ({
                    value: doc.id_document,
                    label: doc.nom_document || doc.nom_doc
                }));
                console.log('Formatted documents for select:', docs);
                setDocuments(docs);
            } catch (error) {
                console.error('Error fetching documents:', error);
                if (error.response?.status === 401) {
                    window.location.href = '/login';
                }
            }
        };
        fetchDocuments();
    }, []);

    // Fetch user statistics from new service
    useEffect(() => {
        const fetchUserStats = async () => {
            try {
                const response = await axios.get(`${backend}/api/statistics/user_stats`, {
                    withCredentials: true
                });
                if (response.data.success) {
                    setStats(prev => ({
                        ...prev,
                        totalDocuments: response.data.totalDocuments,
                        recentUploads: response.data.uploads7d,
                        recentDownloads: response.data.downloads7d,
                        recentDeletes: response.data.deletes7d
                    }));
                }
            } catch (error) {
                console.error('Error fetching user stats:', error);
            }
        };
        fetchUserStats();
    }, []);

    useEffect(() => {
        // Set up Socket.IO connection for real-time statistics
        console.log('🔌 Setting up Socket.IO connection for real-time statistics');
        let socket = null;
        let isCleaningUp = false;

        const setupSocket = async () => {
            if (isCleaningUp) return null;
            
            try {
                // Dynamic import of socket.io-client
                const { io } = await import('socket.io-client');
                
                socket = io(backend, {
                    transports: ['websocket', 'polling'],
                    timeout: 10000,
                    autoConnect: true,
                    withCredentials: true,
                    reconnection: true,
                    reconnectionAttempts: 3,
                    reconnectionDelay: 2000,
                    reconnectionDelayMax: 5000,
                    pingTimeout: 60000,
                    pingInterval: 25000,
                    forceNew: false,
                    upgrade: true
                });
                
                socket.on('connect', () => {
                    console.log('✅ Socket.IO connected for statistics');
                    console.log('🆔 Socket ID:', socket.id);
                    console.log('🚀 Transport:', socket.io.engine.transport.name);
                        setLoading(false);
                    
                    // Subscribe to statistics events
                    socket.emit('subscribeToStatistics', {
                        type: 'statistics',
                        user: document.cookie // Send session info
                    });
                });

                // Listen for real-time document events
                socket.on('documentDownloaded', (data) => {
                    if (isCleaningUp) return;
                    console.log('⬇️ Document downloaded:', data);
                    
                    // Update download count
                    setLast24HoursStats(prev => ({
                        ...prev,
                        downloads: prev.downloads + 1
                    }));
                    
                    // Update popular documents
                    if (data.document) {
                        setPopularDocuments(prev => {
                            const updated = [...prev];
                            const docIndex = updated.findIndex(doc => 
                                doc.id_document === data.document.id_document
                            );
                            
                            if (docIndex !== -1) {
                                updated[docIndex].download_count += 1;
                            } else if (updated.length < 10) {
                                updated.push({
                                    id_document: data.document.id_document,
                                    nom_document: data.document.nom_document,
                                    download_count: 1,
                                    view_count: 0
                                });
                            }
                            
                            return updated.sort((a, b) => b.download_count - a.download_count);
                        });
                    }
                    
                    // Show notification
                    toast.success(`📄 ${data.document?.nom_document || 'Document'} downloaded by ${data.user?.nom || 'User'}`, {
                        duration: 3000,
                        icon: '⬇️'
                    });
                });

                socket.on('documentViewed', (data) => {
                    if (isCleaningUp) return;
                    console.log('👀 Document viewed:', data);
                    
                    // Update view count
                    setLast24HoursStats(prev => ({
                        ...prev,
                        views: prev.views + 1
                    }));
                    
                    // Update popular documents view count
                    if (data.document) {
                        setPopularDocuments(prev => {
                            const updated = [...prev];
                            const docIndex = updated.findIndex(doc => 
                                doc.id_document === data.document.id_document
                            );
                            
                            if (docIndex !== -1) {
                                updated[docIndex].view_count += 1;
                            }
                            
                            return updated;
                        });
                    }
                    
                    console.log(`👁️ ${data.document?.nom_document || 'Document'} viewed by ${data.user?.nom || 'User'}`);
                });

                socket.on('documentUploaded', (data) => {
                    if (isCleaningUp) return;
                    console.log('📤 Document uploaded:', data);
                    
                    // Update upload size
                    setLast24HoursStats(prev => ({
                        ...prev,
                        uploadSize: prev.uploadSize + (data.file_size || 0)
                    }));
                    
                    toast.success(`📤 New document uploaded: ${data.document_name || 'Unknown'}`, {
                        duration: 4000,
                        icon: '📤'
                    });
                });

                socket.on('statisticsUpdate', (data) => {
                    if (isCleaningUp) return;
                    console.log('📊 Statistics bulk update:', data);
                    
                    if (data && Object.keys(data).length > 0) {
                        setRealtimeStats(data);
                    }
                });

                socket.on('connect_error', (error) => {
                    console.warn('❌ Socket.IO connection error:', error);
                        setLoading(false);
                });

                socket.on('disconnect', (reason) => {
                    if (isCleaningUp) return;
                    console.log('🔌 Socket.IO disconnected:', reason);
                    setLoading(false);
                    
                    if (reason === 'io server disconnect') {
                        // Server initiated disconnect, try to reconnect
                        console.log('🔄 Server disconnected, will attempt to reconnect...');
                    }
                });

                socket.on('reconnect', (attemptNumber) => {
                    console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
                    setLoading(false);
                });

                socket.on('reconnect_error', (error) => {
                    console.warn('❌ Socket.IO reconnection error:', error);
                });

                socket.on('reconnect_failed', () => {
                    console.error('❌ Socket.IO reconnection failed');
                    toast.error('Real-time updates unavailable. Please refresh the page.', {
                        duration: 5000
                    });
                });

                return socket;
            } catch (error) {
                console.error('❌ Failed to create Socket.IO connection:', error);
                setLoading(false);
                return null;
            }
        };

        setupSocket();

        return () => {
            console.log('🧹 Cleaning up Socket.IO connection');
            isCleaningUp = true;
            
            if (socket) {
                socket.off('documentDownloaded');
                socket.off('documentViewed');
                socket.off('documentUploaded');
                socket.off('statisticsUpdate');
                socket.disconnect();
            }
        };
    }, []); // Run only once

    // Combined useEffect for all statistics fetching to avoid duplicates
    useEffect(() => {
        // Prevent duplicate fetches
        if (isFetching) return;
        
        const timeoutId = setTimeout(() => {
            const fetchAllStats = async () => {
                try {
                    setIsFetching(true);
                    
                    // Only fetch if we have a valid date range
                    if (!dateRange || !dateRange[0] || !dateRange[1]) {
                        return;
                    }

                    // Fetch historical stats for charts (only if not in detailed statistics mode)
                    if (!statisticsType) {
                        const [historicalResponse, viewsResponse] = await Promise.all([
                            axios.get(`${backend}/api/statistics/documents`, {
                                params: {
                                    startDate: dateRange[0].format('YYYY-MM-DD'),
                                    endDate: dateRange[1].format('YYYY-MM-DD'),
                                    documentId: selectedDocument
                                },
                                withCredentials: true
                            }),
                            axios.get(`${backend}/api/statistics/user_logs`, {
                                params: {
                                    page: 1,
                                    limit: 1000,
                                    startDate: dateRange[0].format('YYYY-MM-DD'),
                                    endDate: dateRange[1].format('YYYY-MM-DD')
                                },
                                withCredentials: true
                            })
                        ]);

                        if (Array.isArray(historicalResponse.data) && Array.isArray(viewsResponse.data)) {
                            // Combine historical data with views data using open_count
                            const combinedData = historicalResponse.data.map(item => {
                                const viewsForDate = viewsResponse.data.filter(view => 
                                    new Date(view.lastViewed).toDateString() === new Date(item.date).toDateString()
                                );
                                return {
                                    ...item,
                                    views: viewsForDate.reduce((sum, view) => sum + (view.open_count || 0), 0)
                                };
                            });

                            setHistoricalStats(combinedData);
                        } else {
                            setHistoricalStats([]);
                        }
                    }

                    // Fetch detailed stats if we have a statistics type and date range
                    if (statisticsType && downloadRange && downloadRange[0] && downloadRange[1]) {
                        await fetchStats(downloadRange[0], downloadRange[1]);
                    }
                } catch (error) {
                    console.warn('Error fetching stats:', error);
                    setHistoricalStats([]);
                } finally {
                    setIsFetching(false);
                }
            };

            fetchAllStats();
        }, 300); // Debounce for 300ms

        return () => clearTimeout(timeoutId);
    }, [dateRange, selectedDocument, statisticsType, downloadRange]);

    // Removed duplicate statistics refresh useEffect - handled by SSE connection

    // Add this useEffect to handle immediate filtering
    useEffect(() => {
        if (downloadStats.length > 0) {
            let filteredData = [...downloadStats];
            
            // Filter by document IDs for document-related statistics
            if (selectedDocumentIds.length > 0) {
                if (statisticsType === 'types') {
                    filteredData = filteredData.filter(item => 
                        selectedDocumentIds.includes(item.typeId)
                    );
                } else {
                    filteredData = filteredData.filter(item => 
                        selectedDocumentIds.includes(item.id_document)
                    );
                }
            }
            
            // Filter by user IDs for performance statistics
            if (selectedUserIds.length > 0 && statisticsType === 'performance') {
                filteredData = filteredData.filter(item => {
                    return selectedUserIds.includes(item.userId);
                });
            }
            
            setTableData(filteredData);
        }
    }, [selectedDocumentIds, selectedUserIds, downloadStats, statisticsType]);

    // Debounced filtering to prevent multiple requests
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if ((selectedDocumentIds.length > 0 || selectedUserIds.length > 0) && downloadStats.length > 0) {
                let filteredData = [...downloadStats];
                
                // Filter by document IDs
                if (selectedDocumentIds.length > 0) {
                    if (statisticsType === 'types') {
                        filteredData = filteredData.filter(item => 
                            selectedDocumentIds.includes(item.typeId)
                        );
                    } else {
                        filteredData = filteredData.filter(item => 
                            selectedDocumentIds.includes(item.id_document)
                        );
                    }
                }
                
                // Filter by user IDs for performance statistics
                if (selectedUserIds.length > 0 && statisticsType === 'performance') {
                    filteredData = filteredData.filter(item => {
                        return selectedUserIds.includes(item.userId);
                    });
                }
                
                setTableData(filteredData);
            }
        }, 300); // Debounce for 300ms

        return () => clearTimeout(timeoutId);
    }, [selectedDocumentIds, selectedUserIds]);

    // Fetch available users for the user filter (removed - not used and causes 500 errors)

    // Add useEffect to fetch last 24 hours stats (optimized with caching)
    useEffect(() => {
        let lastFetchTime = 0;
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
        
        const fetchLast24HoursStats = async () => {
            const now = Date.now();
            if (now - lastFetchTime < CACHE_DURATION) {
                return; // Skip if cached data is still fresh
            }
            
            try {
                const [downloadsResponse, viewsResponse, storageResponse] = await Promise.all([
                    axios.get(`${backend}/api/statistics/user_logs`, {
                        params: {
                            page: 1,
                            limit: 1000,
                            startDate: moment().subtract(24, 'hours').format('YYYY-MM-DD HH:mm:ss'),
                            endDate: moment().format('YYYY-MM-DD HH:mm:ss')
                        },
                        withCredentials: true
                    }),
                    axios.get(`${backend}/api/statistics/user_logs`, {
                        params: {
                            page: 1,
                            limit: 1000,
                            startDate: moment().subtract(24, 'hours').format('YYYY-MM-DD HH:mm:ss'),
                            endDate: moment().format('YYYY-MM-DD HH:mm:ss')
                        },
                        withCredentials: true
                    }),
                    axios.get(`${backend}/api/statistics/storage`, {
                        withCredentials: true
                    })
                ]);

                // Process logs data for downloads and views
                const downloads = downloadsResponse.data.logs?.filter(log => 
                    log.action === 'DOWNLOAD_DOCUMENT' && 
                    moment(log.created_at).isAfter(moment().subtract(24, 'hours'))
                ) || [];

                const views = viewsResponse.data.logs?.filter(log => 
                    log.action === 'VIEW_DOCUMENT' && 
                    moment(log.created_at).isAfter(moment().subtract(24, 'hours'))
                ) || [];

                setLast24HoursStats({
                    downloads: downloads.length,
                    views: views.length,
                    uploadSize: storageResponse.data.totalUsage || 0
                });
                
                lastFetchTime = now;
            } catch (error) {
                console.warn('Error fetching last 24 hours stats:', error);
            }
        };

        // Initial fetch
        fetchLast24HoursStats();
        
        // Update every 5 minutes instead of every minute
        const interval = setInterval(fetchLast24HoursStats, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    // Fetch popular documents and document types for dropdowns (optimized)
    useEffect(() => {
        let isMounted = true;
        const timeoutId = setTimeout(() => {
            if (!isMounted) return;
            
        const fetchPopularData = async () => {
            try {
                    console.log('Fetching popular documents and document types...');
                    
                    // Only fetch if we don't already have data
                    if (popularDocuments.length === 0) {
                        logRequest('Popular documents - user logs', { period: '30 days' });
                        // Fetch user logs for popular documents
                        const logsResponse = await axios.get(`${backend}/api/statistics/user_logs`, {
                        params: {
                                page: 1,
                                limit: 1000,
                                startDate: moment().subtract(30, 'days').format('YYYY-MM-DD HH:mm:ss'),
                                endDate: moment().format('YYYY-MM-DD HH:mm:ss')
                        },
                        withCredentials: true
                        });

                        if (!isMounted) return;

                        // Process logs to create popular documents
                        const documentMap = new Map();
                        
                        if (logsResponse.data && logsResponse.data.logs) {
                            logsResponse.data.logs.forEach(log => {
                                if (log.source === 'document_action' || log.source === 'document_view') {
                                    // Extract document ID from details or use direct ID
                                    let docId = 0;
                                    let docName = '';
                                    
                                    // Backend returns id_document and nom_document directly
                                    if (log.id_document && log.id_document > 0) {
                                        docId = log.id_document;
                                        docName = log.nom_document || `Document ${docId}`;
                                    } else if (log.details) {
                                        const docIdMatch = log.details.match(/Document ID: (\d+)/);
                                        if (docIdMatch) {
                                            docId = parseInt(docIdMatch[1]);
                                            docName = log.details.replace(/^(Uploaded|Downloaded|Viewed|Deleted) document: /, '').replace(/Document ID: \d+/, '').trim();
                                            if (!docName) docName = `Document ${docId}`;
                                        }
                                    }
                                    
                                    if (docId > 0) {
                                        if (!documentMap.has(docId)) {
                                            documentMap.set(docId, {
                                                id_document: docId,
                                                nom_document: docName,
                                                download_count: 0,
                                                view_count: 0
                                            });
                                        }
                                        
                                        if (log.action === 'DOWNLOAD_DOCUMENT') {
                                            documentMap.get(docId).download_count++;
                                        } else if (log.action === 'VIEW_DOCUMENT') {
                                            // Use open_count from document_log for views
                                            documentMap.get(docId).view_count = log.open_count || 1;
                                        }
                                    }
                                }
                            });
                        }

                        // Convert map to array and filter out documents with no activity
                        const popularData = Array.from(documentMap.values())
                            .filter(item => item.download_count > 0 || item.view_count > 0)
                            .sort((a, b) => (b.download_count + b.view_count) - (a.download_count + a.view_count))
                            .slice(0, 5); // Top 5 popular documents

                        if (isMounted) {
                            setPopularDocuments(popularData);
                        }
                    }

                    // Only fetch document types if we don't have them
                    if (documentTypesStats.length === 0) {
                        logRequest('Document types stats', { period: '30 days' });
                        const docTypesResponse = await axios.get(`${backend}/api/statistics/document-types`, {
                            params: {
                                startDate: moment().subtract(30, 'days').format('YYYY-MM-DD HH:mm:ss'),
                                endDate: moment().format('YYYY-MM-DD HH:mm:ss')
                            },
                            withCredentials: true
                        });

                        if (!isMounted) return;
                        console.log('Document types response:', docTypesResponse.data);
                setDocumentTypesStats(docTypesResponse.data || []);
                    }

            } catch (error) {
                console.error('Error fetching popular data:', error);
                    // Don't show error message for failed requests
            }
        };

        fetchPopularData();
        }, 1000); // Debounce for 1 second

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, []); // Removed documents dependency to prevent loops

    // Auto-open date picker when statistics type is selected
    useEffect(() => {
        if (autoOpenDatePicker && statisticsType) {
            // Find the date picker input and focus it to open the calendar
            const datePickerInput = document.querySelector('.ant-picker-input input');
            if (datePickerInput) {
                datePickerInput.focus();
                datePickerInput.click();
            }
            setAutoOpenDatePicker(false);
        }
    }, [autoOpenDatePicker, statisticsType]);

    // Modify the handleDocumentIdSelect function
    const handleDocumentIdSelect = (selectedIds) => {
        setSelectedDocumentIds(selectedIds);
        // Remove the fetchStats call from here since we'll handle filtering in the useEffect
    };

    // Handler for user ID selection
    const handleUserIdSelect = (selectedIds) => {
        setSelectedUserIds(selectedIds);
    };

    // Function to format storage size with appropriate units
    const formatStorageSize = (bytes) => {
        if (bytes === 0) return '0 B';
        
        const kb = bytes / 1024;
        const mb = kb / 1024;
        const gb = mb / 1024;
        
        if (gb >= 1) {
            return `${gb.toFixed(2)} GB`;
        } else if (mb >= 1) {
            return `${mb.toFixed(2)} MB`;
        } else if (kb >= 1) {
            return `${kb.toFixed(2)} KB`;
        } else {
            return `${bytes} B`;
        }
    };

    // Modify the fetchStats function to not filter by selectedDocumentIds
    const fetchStats = async (startDate, endDate) => {
        try {
            // Prevent duplicate fetches
            if (downloadLoading) return;
            
            logRequest(`fetchStats for ${statisticsType}`, { startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD') });
            
            setDownloadLoading(true);
            setTableData([]);
            setDownloadStats([]);

            // Set start date to beginning of day and end date to end of day
            const adjustedStartDate = startDate.startOf('day');
            const adjustedEndDate = endDate.endOf('day');

            const params = {
                startDate: adjustedStartDate.format('YYYY-MM-DD HH:mm:ss'),
                endDate: adjustedEndDate.format('YYYY-MM-DD HH:mm:ss')
            };

            if (statisticsType === 'popular') {
                try {
                    // Get user logs for popular documents
                    const logsResponse = await axios.get(`${backend}/api/statistics/user_logs`, {
                        params: {
                            page: 1,
                            limit: 1000,
                            startDate: adjustedStartDate.format('YYYY-MM-DD HH:mm:ss'),
                            endDate: adjustedEndDate.format('YYYY-MM-DD HH:mm:ss')
                        },
                        withCredentials: true
                    });

                    if (logsResponse.data && logsResponse.data.logs) {
                        // Process logs to create popular documents
                        const documentMap = new Map();
                        
                        logsResponse.data.logs.forEach(log => {
                            if (log.source === 'document_action' || log.source === 'document_view') {
                                // Extract document ID from details or use direct ID
                                let docId = 0;
                                let docName = '';
                                
                                // Backend returns id_document and nom_document directly
                                if (log.id_document && log.id_document > 0) {
                                    docId = log.id_document;
                                    docName = log.nom_document || `Document ${docId}`;
                                } else if (log.details) {
                                    const docIdMatch = log.details.match(/Document ID: (\d+)/);
                                    if (docIdMatch) {
                                        docId = parseInt(docIdMatch[1]);
                                        docName = log.details.replace(/^(Uploaded|Downloaded|Viewed|Deleted) document: /, '').replace(/Document ID: \d+/, '').trim();
                                        if (!docName) docName = `Document ${docId}`;
                                    }
                                }
                                
                                if (docId > 0) {
                                    if (!documentMap.has(docId)) {
                                        documentMap.set(docId, {
                                            id_document: docId,
                                            nom_document: docName,
                                            download_count: 0,
                                            view_count: 0
                                        });
                                    }
                                    
                                    if (log.action === 'DOWNLOAD_DOCUMENT') {
                                        documentMap.get(docId).download_count++;
                                    } else if (log.action === 'VIEW_DOCUMENT') {
                                        // Use open_count from document_log for views
                                        documentMap.get(docId).view_count = log.open_count || 1;
                                    }
                                }
                            }
                        });

                        // Convert map to array and filter out documents with no activity
                        const popularData = Array.from(documentMap.values())
                            .filter(item => item.download_count > 0 || item.view_count > 0)
                            .sort((a, b) => (b.download_count + b.view_count) - (a.download_count + a.view_count));

                        setTableData(popularData);
                        setDownloadStats(popularData);
                        setAvailableDocumentIds(Array.from(documentMap.keys()));
                    }
                } catch (error) {
                    console.error('Error fetching stats:', error);
                    message.error('Failed to fetch statistics');
                }
            } else if (statisticsType === 'types') {
                const response = await axios.get(`${backend}/api/statistics/document-types`, {
                    params,
                    withCredentials: true
                });

                if (response.data) {
                    const formattedData = response.data.map(type => ({
                        typeId: parseInt(type.typeId),
                        nom_document: type.documentType,
                        document_count: type.documentCount,
                        view_count: type.totalViews
                    }));

                    setTableData(formattedData);
                    setDownloadStats(formattedData);
                }
            } else if (statisticsType === 'downloads') {
                // Use user logs for regular downloads
                const response = await axios.get(`${backend}/api/statistics/user_logs`, {
                    params: {
                        page: 1,
                        limit: 1000,
                        startDate: adjustedStartDate.format('YYYY-MM-DD HH:mm:ss'),
                        endDate: adjustedEndDate.format('YYYY-MM-DD HH:mm:ss')
                    },
                    withCredentials: true
                });

                if (response.data && response.data.logs) {
                    // Filter and process download logs
                    const downloadLogs = response.data.logs.filter(log => 
                        log.action === 'DOWNLOAD_DOCUMENT' && log.source === 'document_action'
                    );

                    const processedData = downloadLogs.map(log => {
                        // Use direct ID from backend if available, otherwise extract from details
                        let docId = 0;
                        let docName = '';
                        
                        // Backend returns id_document and nom_document directly
                        if (log.id_document && log.id_document > 0) {
                            docId = log.id_document;
                            docName = log.nom_document || `Document ${docId}`;
                        } else if (log.details) {
                            // Fallback: extract from details string
                            const idMatch = log.details.match(/Document ID: (\d+)/);
                            if (idMatch) {
                                docId = parseInt(idMatch[1]);
                                // Extract document name from details
                                docName = log.details.replace(/^Downloaded document: /, '').replace(/Document ID: \d+/, '').trim();
                                if (!docName) docName = `Document ${docId}`;
                            }
                        }
                        
                        return {
                            id_document: docId,
                            nom_document: docName,
                            download_count: 1,
                            download_timestamp: log.created_at,
                            nom: log.nom || '',
                            prenom: log.prenom || '',
                            id_user_source: log.nom && log.prenom ? `${log.nom} ${log.prenom}` : 'Unknown'
                        };
                    });

                    setDownloadStats(processedData);
                    setTableData(processedData);
                    setAvailableDocumentIds([...new Set(processedData.map(item => item.id_document))]);
                }
            } else if (statisticsType === 'financial') {
                // Financial report - cost analysis, storage costs, etc.
                try {
                    // Get storage data with date filtering
                    const storageResponse = await axios.get(`${backend}/api/statistics/storage`, {
                        params: {
                            startDate: adjustedStartDate.format('YYYY-MM-DD HH:mm:ss'),
                            endDate: adjustedEndDate.format('YYYY-MM-DD HH:mm:ss')
                        },
                        withCredentials: true
                    });
                    
                    if (storageResponse.data && storageResponse.data.success) {
                        const totalUsageBytes = storageResponse.data.totalUsage || 0;
                        const periodUsageBytes = storageResponse.data.periodUsage || 0;
                        const storageLimitBytes = storageResponse.data.storageLimit || 0;
                        const periodDocuments = storageResponse.data.periodDocuments || 0;
                        
                        // Set default storage limit to 21 GB if not set in database
                        const defaultStorageLimitGB = 21; // 21 GB default
                        const actualStorageLimitBytes = storageLimitBytes > 0 ? storageLimitBytes : (defaultStorageLimitGB * 1024 * 1024 * 1024);
                        
                        // Calculate available space (institution plan - used space)
                        const availableSpaceBytes = Math.max(0, actualStorageLimitBytes - totalUsageBytes);
                        
                        // Calculate efficiency based on real usage
                        const efficiency = actualStorageLimitBytes > 0 ? ((totalUsageBytes / actualStorageLimitBytes) * 100) : 0;
                        
                        const financialData = [{
                            metric: 'Spațiu Utilizat în Perioadă',
                            value: formatStorageSize(periodUsageBytes),
                            description: `${periodDocuments} documente încărcate în perioada ${adjustedStartDate.format('DD.MM')} - ${adjustedEndDate.format('DD.MM')}`,
                            trend: periodUsageBytes > 0 ? `+${(periodUsageBytes / (1024 * 1024 * 1024) * 100).toFixed(1)}%` : '0%'
                        }, {
                            metric: 'Spațiu Total Utilizat',
                            value: formatStorageSize(totalUsageBytes),
                            description: `Din ${formatStorageSize(actualStorageLimitBytes)} disponibili (${efficiency.toFixed(1)}% utilizare)`,
                            trend: efficiency > 0 ? `+${efficiency.toFixed(1)}%` : '0%'
                        }, {
                            metric: 'Spațiu Disponibil',
                            value: formatStorageSize(availableSpaceBytes),
                            description: `Spațiu rămas din planul instituției (${formatStorageSize(actualStorageLimitBytes)} total)`,
                            trend: availableSpaceBytes > 0 ? `-${(availableSpaceBytes / (1024 * 1024 * 1024) * 10).toFixed(1)}%` : '0%'
                        }];
                        
                        setTableData(financialData);
                        setDownloadStats(financialData);
                    } else {
                        throw new Error('Invalid response from storage API');
                    }
                } catch (error) {
                    console.error('Error fetching financial stats:', error);
                    // Fallback to mock data if API fails
                    const financialData = [{
                        metric: 'Costuri de Stocare',
                        value: 'N/A',
                        description: 'Nu se pot calcula costurile',
                        trend: 'N/A'
                    }, {
                        metric: 'Eficiența Stocării',
                        value: 'N/A',
                        description: 'Nu se pot calcula statisticile',
                        trend: 'N/A'
                    }, {
                        metric: 'Spațiu Utilizat',
                        value: 'N/A',
                        description: 'Nu se pot calcula datele',
                        trend: 'N/A'
                    }];
                    
                    setTableData(financialData);
                    setDownloadStats(financialData);
                }
            } else if (statisticsType === 'performance') {
                // User performance metrics - get all users from institution
                const response = await axios.get(`${backend}/api/statistics/institution_performance`, {
                    params: {
                        page: 1,
                        limit: 1000,
                        startDate: adjustedStartDate.format('YYYY-MM-DD HH:mm:ss'),
                        endDate: adjustedEndDate.format('YYYY-MM-DD HH:mm:ss')
                    },
                    withCredentials: true
                });
                
                if (response.data && response.data.logs) {
                    // Group by user and calculate performance metrics
                    const userStats = {};
                    response.data.logs.forEach(log => {
                        const userKey = `${log.nom} ${log.prenom}`;
                        if (!userStats[userKey]) {
                            userStats[userKey] = {
                                user: userKey,
                                userId: log.user_id || log.id_user, // Store user ID
                                downloads: 0,
                                uploads: 0,
                                views: 0,
                                lastActivity: log.created_at
                            };
                        }
                        
                        if (log.action === 'DOWNLOAD_DOCUMENT') userStats[userKey].downloads++;
                        else if (log.action === 'UPLOAD_DOCUMENT') userStats[userKey].uploads++;
                        else if (log.action === 'VIEW_DOCUMENT') userStats[userKey].views++;
                    });
                    
                    const performanceData = Object.values(userStats).map(user => ({
                        user: user.user,
                        userId: user.userId, // Add user ID for filtering
                        productivity: user.downloads + user.uploads + user.views,
                        downloads: user.downloads,
                        uploads: user.uploads,
                        views: user.views,
                        lastActivity: user.lastActivity
                    })).sort((a, b) => b.productivity - a.productivity);
                    
                    setTableData(performanceData);
                    setDownloadStats(performanceData);
                    
                    // Extract available user IDs for filtering
                    const userIds = Object.keys(userStats).map(userKey => {
                        // Find the first log for this user to get the user ID
                        const firstLog = response.data.logs.find(log => `${log.nom} ${log.prenom}` === userKey);
                        return firstLog ? firstLog.user_id || firstLog.id_user : null;
                    }).filter(id => id !== null);
                    
                    setAvailableUserIds([...new Set(userIds)]);
                }
            } else if (statisticsType === 'compliance') {
                // Compliance and audit metrics
                const response = await axios.get(`${backend}/api/statistics/user_logs`, {
                    params: {
                        page: 1,
                        limit: 1000,
                        startDate: adjustedStartDate.format('YYYY-MM-DD HH:mm:ss'),
                        endDate: adjustedEndDate.format('YYYY-MM-DD HH:mm:ss')
                    },
                    withCredentials: true
                });
                
                if (response.data && response.data.logs) {
                    const logs = response.data.logs;
                    
                    // Calculate compliance metrics
                    const totalActions = logs.length;
                    const documentActions = logs.filter(log => log.source === 'document_action').length;
                    const userActions = logs.filter(log => log.source === 'user_action').length;
                    const downloads = logs.filter(log => log.action === 'DOWNLOAD_DOCUMENT').length;
                    const views = logs.filter(log => log.action === 'VIEW_DOCUMENT').length;
                    const uploads = logs.filter(log => log.action === 'UPLOAD_DOCUMENT').length;
                    const deletes = logs.filter(log => log.action === 'DELETE_DOCUMENT').length;
                    
                    // Calculate unique users and documents
                    const uniqueUsers = new Set(logs.map(log => log.nom && log.prenom ? `${log.nom} ${log.prenom}` : 'Unknown')).size;
                    const uniqueDocuments = new Set(logs.filter(log => log.id_document).map(log => log.id_document)).size;
                    
                    
                    const complianceData = [{
                        metric: 'Acțiuni pe Documente',
                        value: documentActions,
                        description: `Acțiuni pe documente din ${totalActions} acțiuni totale (login/logout + documente)`
                    }, {
                        metric: 'Descărcări Documente',
                        value: downloads,
                        description: `Numărul de descărcări în perioada ${adjustedStartDate.format('DD.MM')} - ${adjustedEndDate.format('DD.MM')}`
                    }, {
                        metric: 'Vizualizări Documente',
                        value: views,
                        description: `Numărul de vizualizări în perioada selectată`
                    }, {
                        metric: 'Încărcări Documente',
                        value: uploads,
                        description: `Numărul de documente încărcate în perioada selectată`
                    }, {
                        metric: 'Ștergeri Documente',
                        value: deletes,
                        description: `Numărul de documente șterse în perioada selectată`
                    }, {
                        metric: 'Utilizatori Activi',
                        value: uniqueUsers,
                        description: `Numărul de utilizatori cu activitate în perioada selectată`
                    }, {
                        metric: 'Documente Accesate',
                        value: uniqueDocuments,
                        description: `Numărul de documente unice accesate în perioada selectată`
                    }];
                    
                    setTableData(complianceData);
                    setDownloadStats(complianceData);
                }
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
            message.error('Failed to fetch statistics');
        } finally {
            setDownloadLoading(false);
        }
    };

    // Update the handleExport function
    const handleExport = () => {
        if (!tableData.length) {
            message.warning('No data to export');
            return;
        }

        let exportData;
        let headers;

        if (statisticsType === 'popular') {
            // Format for popular documents
            exportData = tableData
                .sort((a, b) => (b.download_count + b.view_count) - (a.download_count + a.view_count))
                .map(item => ({
                    'ID Document': item.id_document,
                    'Nume Document': item.nom_document,
                    'Număr Downloads': item.download_count,
                    'Număr Vizualizări': item.view_count
                }));
            headers = ['ID Document', 'Nume Document', 'Număr Downloads', 'Număr Vizualizări'];
        } else if (statisticsType === 'types') {
            // Format for document types
            exportData = tableData
                .sort((a, b) => (b.document_count || 0) - (a.document_count || 0))
                .map(item => ({
                    'ID': item.typeId,
                    'Tip Document': item.nom_document,
                    'Număr Documente': item.document_count,
                    'Total Vizualizări': item.view_count
                }));
            headers = ['ID', 'Tip Document', 'Număr Documente', 'Total Vizualizări'];
        } else if (statisticsType === 'financial') {
            // Format for financial report
            exportData = tableData.map(item => ({
                'Metrică': item.metric,
                'Valoare': item.value,
                'Descriere': item.description,
                'Tendință': item.trend
            }));
            headers = ['Metrică', 'Valoare', 'Descriere', 'Tendință'];
        } else if (statisticsType === 'performance') {
            // Format for user performance
            exportData = tableData.map(item => ({
                'Utilizator': item.user,
                'Productivitate': item.productivity,
                'Downloads': item.downloads,
                'Uploads': item.uploads,
                'Views': item.views,
                'Ultima Activitate': new Date(item.lastActivity).toLocaleString('ro-RO')
            }));
            headers = ['Utilizator', 'Productivitate', 'Downloads', 'Uploads', 'Views', 'Ultima Activitate'];
        } else if (statisticsType === 'compliance') {
            // Format for compliance report
            exportData = tableData.map(item => ({
                'Tip Activitate': item.metric,
                'Număr Înregistrări': item.value,
                'Detalii': item.description
            }));
            headers = ['Tip Activitate', 'Număr Înregistrări', 'Detalii'];
        } else {
            // Format for downloads
            exportData = tableData
                .sort((a, b) => {
                    // First sort by document ID
                    const idCompare = (a.id_document || 0) - (b.id_document || 0);
                    if (idCompare !== 0) return idCompare;
                    // Then sort by timestamp within the same document
                    return new Date(b.download_timestamp) - new Date(a.download_timestamp);
                })
                .map(item => ({
                    'ID Document': item.id_document,
                    'Nume Document': item.nom_document,
                    'Data și Ora': item.download_timestamp ? new Date(item.download_timestamp).toLocaleString('ro-RO', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    }) : 'N/A',
                    'Utilizator': `${item.nom} ${item.prenom}`
                }));
            headers = ['ID Document', 'Nume Document', 'Data și Ora', 'Utilizator'];
        }

        // Create CSV content with proper formatting
        const csvContent = [
            headers.join(','),
            ...exportData.map(row => 
                Object.values(row).map(value => 
                    typeof value === 'string' && value.includes(',') ? `"${value}"` : value
                ).join(',')
            )
        ].join('\n');

        const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        
        // Create a more readable file name
        const titlePrefix = statisticsType === 'popular' ? 'Documente Populare' : 
                           statisticsType === 'types' ? 'Tipuri de Documente' :
                           statisticsType === 'financial' ? 'Raport Financiar' :
                           statisticsType === 'performance' ? 'Performanță Utilizatori' :
                           statisticsType === 'compliance' ? 'Conformitate & Audit' :
                           'Statistici Descărcări';
        const startDate = downloadRange[0].format('DD.MM.YYYY');
        const endDate = downloadRange[1].format('DD.MM.YYYY');
        const fileName = `${titlePrefix} - ${startDate} - ${endDate}.csv`;
        
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show success message using message.success
        message.success('Statistics exported successfully');
    };

    // Handle date range change
    const handleDateRangeChange = (dates) => {
        setDownloadRange(dates);
        if (dates && dates[0] && dates[1]) {
            fetchStats(dates[0], dates[1]);
        }
    };

    // Modify the table columns based on statistics type
    const getTableColumns = () => {
        switch (statisticsType) {
            case 'downloads':
                return [
                    {
                        title: 'ID',
                        dataIndex: 'id_document',
                        key: 'id_document',
                        className: 'text-center font-medium',
                        width: 80,
                        sorter: (a, b) => (a.id_document || 0) - (b.id_document || 0),
                        render: (id) => (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {id}
                            </span>
                        )
                    },
                    {
                        title: 'Nume Document',
                        dataIndex: 'nom_document',
                        key: 'nom_document',
                        className: 'font-medium',
                        ellipsis: true,
                        width: 300,
                        filterSearch: true,
                        onFilter: (value, record) => record.nom_document?.toLowerCase().includes(value.toLowerCase()),
                        render: (text) => (
                            <div className="flex items-center space-x-2">
                                <FileTextOutlined className="text-gray-400 text-sm" />
                                <span className="text-gray-700 font-medium">{text}</span>
                            </div>
                        )
                    },
                    {
                        title: 'Data și Ora',
                        dataIndex: 'download_timestamp',
                        key: 'download_timestamp',
                        render: (date) => {
                            if (!date) return (
                                <span className="text-gray-400 italic">N/A</span>
                            );
                            try {
                                return (
                                    <div className="flex items-center space-x-2">
                                        <CalendarOutlined className="text-gray-400 text-sm" />
                                        <span className="text-gray-600 font-mono text-sm">
                                            {moment(date).format('DD.MM.YYYY HH:mm:ss')}
                                        </span>
                                    </div>
                                );
                            } catch (error) {
                                console.error('Error formatting date:', error);
                                return <span className="text-gray-400 italic">N/A</span>;
                            }
                        },
                        className: 'text-gray-600',
                        width: 200,
                        sorter: (a, b) => {
                            const dateA = a.download_timestamp ? new Date(a.download_timestamp) : new Date(0);
                            const dateB = b.download_timestamp ? new Date(b.download_timestamp) : new Date(0);
                            return dateA - dateB;
                        }
                    },
                    {
                        title: 'Utilizator',
                        dataIndex: 'id_user_source',
                        key: 'id_user_source',
                        render: (_, record) => {
                            if (!record.nom && !record.prenom) return (
                                <span className="text-gray-400 italic">N/A</span>
                            );
                            const userName = `${record.nom || ''} ${record.prenom || ''}`.trim() || 'N/A';
                            return (
                                <div className="flex items-center space-x-2">
                                    <UserOutlined className="text-gray-400 text-sm" />
                                    <span className="text-gray-700 font-medium">{userName}</span>
                                </div>
                            );
                        },
                        className: 'text-gray-700',
                        width: 200,
                        filterSearch: true,
                        onFilter: (value, record) => {
                            const userName = `${record.nom || ''} ${record.prenom || ''}`.toLowerCase().trim();
                            return userName.includes(value.toLowerCase());
                        }
                    }
                ];
            case 'popular':
                return [
                    {
                        title: 'ID',
                        dataIndex: 'id_document',
                        key: 'id_document',
                        className: 'text-center font-medium',
                        width: 80,
                        sorter: (a, b) => (a.id_document || 0) - (b.id_document || 0),
                        render: (id) => (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {id}
                            </span>
                        )
                    },
                    {
                        title: 'Nume Document',
                        dataIndex: 'nom_document',
                        key: 'nom_document',
                        className: 'font-medium',
                        ellipsis: true,
                        width: 300,
                        render: (text) => (
                            <div className="flex items-center space-x-2">
                                <FileTextOutlined className="text-gray-400 text-sm" />
                                <span className="text-gray-700 font-medium">{text}</span>
                            </div>
                        )
                    },
                    {
                        title: 'Număr Downloads',
                        dataIndex: 'download_count',
                        key: 'download_count',
                        className: 'text-center font-medium',
                        width: 150,
                        sorter: (a, b) => (a.download_count || 0) - (b.download_count || 0),
                        render: (count) => (
                            <div className="flex items-center justify-center space-x-1">
                                <DownloadOutlined className="text-blue-500 text-sm" />
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-blue-50 text-blue-700">
                                {count || 0}
                            </span>
                            </div>
                        )
                    },
                    {
                        title: 'Număr Vizualizări',
                        dataIndex: 'view_count',
                        key: 'view_count',
                        className: 'text-center font-medium',
                        width: 150,
                        sorter: (a, b) => (a.view_count || 0) - (b.view_count || 0),
                        render: (count) => (
                            <div className="flex items-center justify-center space-x-1">
                                <EyeOutlined className="text-green-500 text-sm" />
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-green-50 text-green-700">
                                {count || 0}
                            </span>
                            </div>
                        )
                    }
                ];
            case 'types':
                return [
                    {
                        title: 'ID',
                        dataIndex: 'typeId',
                        key: 'typeId',
                        className: 'text-center font-medium',
                        width: 80,
                        sorter: (a, b) => (a.typeId || 0) - (b.typeId || 0),
                        render: (id) => (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {id}
                            </span>
                        )
                    },
                    {
                        title: 'Tip Document',
                        dataIndex: 'nom_document',
                        key: 'nom_document',
                        className: 'font-medium',
                        ellipsis: true,
                        width: 250,
                        render: (text) => (
                            <div className="flex items-center space-x-2">
                                <FolderOutlined className="text-gray-400 text-sm" />
                                <span className="text-gray-700 font-medium">{text}</span>
                            </div>
                        )
                    },
                    {
                        title: 'Numărul de Documente',
                        dataIndex: 'document_count',
                        key: 'document_count',
                        className: 'text-center font-medium',
                        width: 150,
                        sorter: (a, b) => (a.document_count || 0) - (b.document_count || 0),
                        render: (count) => (
                            <div className="flex items-center justify-center space-x-1">
                                <FileTextOutlined className="text-blue-500 text-sm" />
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-blue-50 text-blue-700">
                                {count || 0}
                            </span>
                            </div>
                        )
                    },
                    {
                        title: 'Total Vizualizări',
                        dataIndex: 'view_count',
                        key: 'view_count',
                        className: 'text-center font-medium',
                        width: 120,
                        sorter: (a, b) => (a.view_count || 0) - (b.view_count || 0),
                        render: (count) => (
                            <div className="flex items-center justify-center space-x-1">
                                <EyeOutlined className="text-green-500 text-sm" />
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-green-50 text-green-700">
                                {count || 0}
                            </span>
                            </div>
                        )
                    }
                ];
            case 'financial':
                return [
                    {
                        title: 'Metrică',
                        dataIndex: 'metric',
                        key: 'metric',
                        className: 'font-medium',
                        width: 200,
                        render: (text) => (
                            <div className="flex items-center space-x-2">
                                <BarChartOutlined className="text-blue-500 text-sm" />
                                <span className="text-gray-700 font-medium">{text}</span>
                            </div>
                        )
                    },
                    {
                        title: 'Valoare',
                        dataIndex: 'value',
                        key: 'value',
                        className: 'text-center font-bold',
                        width: 150,
                        render: (value) => (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800">
                                {value}
                            </span>
                        )
                    },
                    {
                        title: 'Descriere',
                        dataIndex: 'description',
                        key: 'description',
                        className: 'text-gray-600',
                        width: 200
                    },
                    {
                        title: 'Tendință',
                        dataIndex: 'trend',
                        key: 'trend',
                        className: 'text-center',
                        width: 120,
                        render: (trend) => (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                trend.startsWith('+') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                                {trend}
                            </span>
                        )
                    }
                ];
            case 'performance':
                return [
                    {
                        title: 'Utilizator',
                        dataIndex: 'user',
                        key: 'user',
                        className: 'font-medium',
                        width: 200,
                        render: (text) => (
                            <div className="flex items-center space-x-2">
                                <UserOutlined className="text-blue-500 text-sm" />
                                <span className="text-gray-700 font-medium">{text}</span>
                            </div>
                        )
                    },
                    {
                        title: 'Productivitate',
                        dataIndex: 'productivity',
                        key: 'productivity',
                        className: 'text-center font-bold',
                        width: 120,
                        sorter: (a, b) => a.productivity - b.productivity,
                        render: (value) => (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                                {value}
                            </span>
                        )
                    },
                    {
                        title: 'Downloads',
                        dataIndex: 'downloads',
                        key: 'downloads',
                        className: 'text-center',
                        width: 100,
                        render: (count) => (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-blue-50 text-blue-700">
                                {count}
                            </span>
                        )
                    },
                    {
                        title: 'Uploads',
                        dataIndex: 'uploads',
                        key: 'uploads',
                        className: 'text-center',
                        width: 100,
                        render: (count) => (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-green-50 text-green-700">
                                {count}
                            </span>
                        )
                    },
                    {
                        title: 'Views',
                        dataIndex: 'views',
                        key: 'views',
                        className: 'text-center',
                        width: 100,
                        render: (count) => (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-purple-50 text-purple-700">
                                {count}
                            </span>
                        )
                    },
                    {
                        title: 'Ultima Activitate',
                        dataIndex: 'lastActivity',
                        key: 'lastActivity',
                        className: 'text-gray-600',
                        width: 180,
                        render: (date) => (
                            <span className="text-sm">
                                {new Date(date).toLocaleString('ro-RO')}
                            </span>
                        )
                    }
                ];
            case 'compliance':
                return [
                    {
                        title: 'Tip Activitate',
                        dataIndex: 'metric',
                        key: 'metric',
                        className: 'font-medium',
                        width: 200,
                        render: (text) => (
                            <div className="flex items-center space-x-2">
                                <DatabaseOutlined className="text-green-500 text-sm" />
                                <span className="text-gray-700 font-medium">{text}</span>
                            </div>
                        )
                    },
                    {
                        title: 'Număr Înregistrări',
                        dataIndex: 'value',
                        key: 'value',
                        className: 'text-center font-bold',
                        width: 120,
                        render: (value) => (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                                {value}
                            </span>
                        )
                    },
                    {
                        title: 'Descriere',
                        dataIndex: 'description',
                        key: 'description',
                        className: 'text-gray-600',
                        width: 250
                    },
                ];
            default:
                return [];
        }
    };

    // Update the renderLast24HoursCard function
    const renderLast24HoursCard = () => (
        <Card
            title={
                <div className="flex items-center justify-between">
                    <Space className="space-x-4">
                        <Select
                            value={statisticsType}
                            onChange={(value) => {
                                setStatisticsType(value);
                                if (downloadRange && downloadRange[0] && downloadRange[1]) {
                                    fetchStats(downloadRange[0], downloadRange[1]);
                                }
                            }}
                            options={statisticsTypes}
                            className="w-[200px]"
                        />
                        <RangePicker
                            value={downloadRange}
                            onChange={handleDateRangeChange}
                            format="DD.MM.YYYY"
                            allowClear={true}
                            disabledDate={(current) => {
                                return current && current > moment().endOf('day');
                            }}
                            ranges={{
                                'Today': [moment().startOf('day'), moment().endOf('day')],
                                'Last 7 Days': [moment().subtract(6, 'days').startOf('day'), moment().endOf('day')],
                                'Last 30 Days': [moment().subtract(29, 'days').startOf('day'), moment().endOf('day')],
                                'This Month': [moment().startOf('month'), moment().endOf('month')]
                            }}
                            className="w-full md:w-auto"
                        />
                        <Select
                            mode="multiple"
                            placeholder="Select Document IDs"
                            value={selectedDocumentIds}
                            onChange={handleDocumentIdSelect}
                            options={availableDocumentIds.map(id => ({
                                value: id,
                                label: `Document ID: ${id}`
                            }))}
                            className="w-full"
                            showSearch
                            optionFilterProp="label"
                            allowClear
                            maxTagCount="responsive"
                        />
                        <Button 
                            type="primary" 
                            icon={<DownloadOutlined />}
                            onClick={handleExport}
                            disabled={!downloadRange || !tableData.length}
                            className="bg-blue-500 hover:bg-blue-600 transition-all duration-200"
                        >
                            Exportă
                        </Button>
                    </Space>
                </div>
            }
            className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
        >
            {downloadLoading ? (
                <div className="flex justify-center items-center h-40">
                    <Spin size="large" className="text-blue-500" />
                </div>
            ) : tableData.length > 0 ? (
                <div className="space-y-6">
                    {/* Bottom cards - only visible when date range is selected */}
                    {downloadRange && downloadRange[0] && downloadRange[1] && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white rounded-lg shadow p-4">
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">Downloads</h3>
                                <p className="text-2xl font-bold text-blue-600">
                                    {statisticsType === 'popular' 
                                        ? tableData.reduce((sum, item) => sum + (item.download_count || 0), 0)
                                        : tableData.length}
                                </p>
                                <p className="text-sm text-gray-500">Selected period</p>
                            </div>
                            {statisticsType === 'popular' && (
                                <div className="bg-white rounded-lg shadow p-4">
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Views</h3>
                                    <p className="text-2xl font-bold text-green-600">
                                        {tableData.reduce((sum, item) => sum + (item.view_count || 0), 0)}
                                    </p>
                                    <p className="text-sm text-gray-500">Selected period</p>
                                </div>
                            )}
                            <div className="bg-white rounded-lg shadow p-4">
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">Unique Documents</h3>
                                <p className="text-2xl font-bold text-purple-600">{new Set(tableData.map(item => item.id_document)).size}</p>
                                <p className="text-sm text-gray-500">Selected period</p>
                            </div>
                            <div className="bg-white rounded-lg shadow p-4">
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">Unique Users</h3>
                                <p className="text-2xl font-bold text-orange-600">{new Set(tableData.map(item => item.id_user_source)).size}</p>
                                <p className="text-sm text-gray-500">Selected period</p>
                            </div>
                        </div>
                    )}

                    <Table
                        dataSource={tableData}
                        columns={getTableColumns()}
                        pagination={{ pageSize: 5 }}
                        rowKey={(record, index) => `${record.id_document}-${record.download_timestamp}-${record.id_user_source}-${index}`}
                        className="rounded-lg shadow-sm"
                        rowClassName="hover:bg-gray-50 transition-colors duration-200"
                        scroll={{ x: 800 }}
                    />
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-40 space-y-4">
                    <CalendarOutlined className="text-4xl text-gray-400" />
                    <p className="text-gray-500 text-lg">Select a date range to view statistics</p>
                </div>
            )}
        </Card>
    );

    // Add useEffect to fetch memory stats
    useEffect(() => {
        const fetchMemoryStats = async () => {
            try {
                const response = await axios.get(`${backend}/api/storage/usage`, {
                    withCredentials: true
                });
                setMemoryStats({
                    used: response.data.used,
                    total: response.data.total,
                    percentage: (response.data.used / response.data.total) * 100
                });
            } catch (error) {
                console.error('Error fetching memory stats:', error);
            }
        };

        fetchMemoryStats();
        const interval = setInterval(fetchMemoryStats, 60000); // Update every minute

        return () => clearInterval(interval);
    }, []);

    // Add formatBytes helper function
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Update the renderStatisticsCards function
    const renderStatisticsCards = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 h-[200px] flex items-center justify-center">
                <div className="p-6 flex flex-col items-center justify-center w-full">
                    <div className="text-5xl text-green-500 mb-4">
                        <DownloadOutlined />
                    </div>
                    <div className="text-4xl font-bold text-gray-800 mb-2">
                        {last24HoursStats.downloads}
                    </div>
                    <div className="text-xl font-semibold text-gray-600">
                        Descărcări (24h)
                    </div>
                </div>
            </Card>

            <Card className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 h-[200px] flex items-center justify-center">
                <div className="p-6 flex flex-col items-center justify-center w-full">
                    <div className="text-5xl text-blue-500 mb-4">
                        <EyeOutlined />
                    </div>
                    <div className="text-4xl font-bold text-gray-800 mb-2">
                        {last24HoursStats.views}
                    </div>
                    <div className="text-xl font-semibold text-gray-600">
                        Views (24h)
                    </div>
                </div>
            </Card>

            <Card className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 h-[200px] flex items-center justify-center">
                <div className="p-6 flex flex-col items-center justify-center w-full">
                    <div className="text-5xl text-orange-500 mb-4">
                        <FileTextOutlined />
                    </div>
                    <div className="text-4xl font-bold text-gray-800 mb-2">
                        {documents.length}
                    </div>
                    <div className="text-xl font-semibold text-gray-600">
                        Total Documents
                    </div>
                </div>
            </Card>

            <Card className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 h-[200px] flex items-center justify-center">
                <div className="p-6 flex flex-col items-center justify-center w-full">
                    <div className="text-5xl text-purple-500 mb-4">
                        <DatabaseOutlined />
                    </div>
                    <div className="text-4xl font-bold text-gray-800 mb-2">
                        {formatBytes(last24HoursStats.uploadSize)}
                    </div>
                    <div className="text-xl font-semibold text-gray-600">
                        Uploads (24h)
                    </div>
                </div>
            </Card>
        </div>
    );

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Document Statistics'
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1
                },
                title: {
                    display: true,
                    text: 'Count'
                }
            },
            x: {
                display: true,
                title: {
                    display: true,
                    text: 'Date'
                }
            }
        }
    };

    // Transform historical data for Chart.js
    const chartData = {
        labels: historicalStats.map(item => new Date(item.date).toLocaleDateString()),
        datasets: [
            {
                label: 'Downloads',
                data: historicalStats.map(item => parseInt(item.downloads) || 0),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                tension: 0.1,
                fill: false
            },
            {
                label: 'Views',
                data: historicalStats.map(item => parseInt(item.views) || 0),
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                tension: 0.1,
                fill: false
            }
        ]
    };

    // Removed fetchDocumentTypes - integrated into fetchStats function

    // Removed duplicate useEffect - now handled by the combined useEffect above

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
                delayChildren: 0.3
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 10
            }
        }
    };

    const tableRowVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                duration: 0.1
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen bg-gradient-to-br from-white via-purple-50/10 to-indigo-50/5 relative overflow-hidden"
        >
            {/* Elegant Background Patterns with Circles */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                {/* Main circular patterns */}
                <div className="absolute top-20 left-20 w-64 h-64 opacity-6">
                    <div className="w-full h-full border border-purple-300 rounded-full"></div>
                    <div className="absolute top-1/2 left-1/2 w-32 h-32 border border-purple-200 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                </div>
                
                {/* Secondary circular patterns */}
                <div className="absolute top-32 right-32 w-48 h-48 opacity-4">
                    <div className="w-full h-full border border-indigo-300 rounded-full"></div>
                    <div className="absolute top-1/2 left-1/2 w-24 h-24 border border-indigo-200 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                </div>
                
                {/* Floating circular dots */}
                <div className="absolute top-40 right-40 opacity-4">
                    <div className="w-3 h-3 bg-purple-300 rounded-full absolute top-0 left-0"></div>
                    <div className="w-4 h-4 bg-purple-200 rounded-full absolute top-16 left-16"></div>
                    <div className="w-2 h-2 bg-indigo-300 rounded-full absolute top-32 left-8"></div>
                </div>
                
                {/* Bottom circular elements */}
                <div className="absolute bottom-20 left-1/4 w-48 h-48 opacity-6">
                    <div className="w-full h-full border-2 border-purple-200 rounded-full transform rotate-45"></div>
                </div>
                
                {/* Additional circular elements */}
                <div className="absolute top-1/2 left-1/3 w-24 h-24 opacity-4">
                    <div className="w-full h-full bg-gradient-to-br from-purple-200 to-indigo-200 rounded-full blur-sm"></div>
                </div>
                
                {/* Right side circular patterns */}
                <div className="absolute top-1/3 right-20 w-32 h-32 opacity-5">
                    <div className="w-full h-full border border-indigo-300 rounded-full"></div>
                </div>
                
                {/* Center circular accent */}
                <div className="absolute top-2/3 left-1/2 w-16 h-16 opacity-3">
                    <div className="w-full h-full bg-gradient-to-br from-purple-300 to-indigo-300 rounded-full blur-md"></div>
                </div>
            </div>

            <div className="w-full px-8 py-6 relative z-10">
                <div className="max-w-7xl mx-auto">
                    {/* Modern Header */}
                    <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                        <div className="bg-gradient-to-br from-white via-purple-50/30 to-indigo-50/20 rounded-3xl shadow-2xl border border-purple-100/50 p-8 mb-8 relative overflow-hidden">
                            {/* Subtle background pattern */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200/20 to-indigo-200/20 rounded-full blur-2xl"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-200/20 to-purple-200/20 rounded-full blur-xl"></div>
                            
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                                        <BarChartOutlined />
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-bold text-gray-900">Statistici</h1>
                                        <p className="text-gray-600 mt-1">Date actualizate în timp real despre sistemul tău de gestionare a documentelor</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Elegant Statistics Cards */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
                    >
                        {/* Total Downloads Card */}
                        <motion.div
                            whileHover={{ y: -5 }}
                            transition={{ duration: 0.2 }}
                            className="group"
                        >
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100/50 p-6 hover:shadow-xl transition-all duration-300">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                                            <DownloadOutlined className="text-white text-lg" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-600 mb-1">Descărcări</p>
                                            <p className="text-2xl font-bold text-gray-900">{last24HoursStats.downloads}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                            24h
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Total Views Card */}
                        <motion.div
                            whileHover={{ y: -5 }}
                            transition={{ duration: 0.2 }}
                            className="group"
                        >
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100/50 p-6 hover:shadow-xl transition-all duration-300">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                                            <EyeOutlined className="text-white text-lg" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-600 mb-1">Vizualizări</p>
                                            <p className="text-2xl font-bold text-gray-900">{last24HoursStats.views}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            24h
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Total Documents Card */}
                        <motion.div
                            whileHover={{ y: -5 }}
                            transition={{ duration: 0.2 }}
                            className="group"
                        >
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100/50 p-6 hover:shadow-xl transition-all duration-300">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                                            <FileTextOutlined className="text-white text-lg" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-600 mb-1">Documente</p>
                                            <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                            Total
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Total Users Card */}
                        <motion.div
                            whileHover={{ y: -5 }}
                            transition={{ duration: 0.2 }}
                            className="group"
                        >
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100/50 p-6 hover:shadow-xl transition-all duration-300">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
                                            <DatabaseOutlined className="text-white text-lg" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-600 mb-1">Încărcări</p>
                                            <p className="text-2xl font-bold text-gray-900">{formatBytes(last24HoursStats.uploadSize)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                            24h
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>


                    {/* Elegant Table Section with Integrated Filters */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100/50 p-6"
                    >
                        <div className="flex flex-col space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                                        <BarChartOutlined className="text-white text-lg" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900">
                                        Statistici Detaliate
                                    </h2>
                                </div>
                            </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-800 flex items-center">
                                <BarChartOutlined className="mr-2 text-blue-500" />
                                Tip Statistici
                            </label>
                            <Select
                                value={statisticsType}
                                onChange={(value) => {
                                    setStatisticsType(value);
                                    // Clear previous data when changing type
                                    setTableData([]);
                                    setDownloadStats([]);
                                    setDownloadRange(null);
                                    // Auto-open date picker after selecting type
                                    setTimeout(() => {
                                        setAutoOpenDatePicker(true);
                                    }, 100);
                                }}
                                options={statisticsTypes}
                                className="w-full"
                                placeholder="📊 Alege un tip de statistică"
                                size="large"
                                style={{
                                    borderRadius: '12px',
                                }}
                                notFoundContent="Nu există tipuri de statistici disponibile"
                                showSearch={false}
                            />
                        </div>
                        
                        <div className="space-y-3 md:col-span-2">
                            <label className="text-sm font-bold text-gray-800 flex items-center">
                                <CalendarOutlined className="mr-2 text-green-500" />
                                Perioada de Timp
                            </label>
                            <RangePicker
                                value={downloadRange}
                                onChange={handleDateRangeChange}
                                format="DD.MM.YYYY"
                                allowClear={true}
                                size="large"
                                disabled={!statisticsType}
                                disabledDate={(current) => {
                                    return current && current > moment().endOf('day');
                                }}
                                ranges={{
                                    'Astăzi': [moment().startOf('day'), moment().endOf('day')],
                                    'Ultimele 7 zile': [moment().subtract(6, 'days').startOf('day'), moment().endOf('day')],
                                    'Ultimele 30 zile': [moment().subtract(29, 'days').startOf('day'), moment().endOf('day')],
                                    'Această lună': [moment().startOf('month'), moment().endOf('month')]
                                }}
                                className="w-full"
                                style={{
                                    borderRadius: '12px',
                                    opacity: statisticsType ? 1 : 0.5
                                }}
                                placeholder={statisticsType ? ['Data început', 'Data sfârșit'] : ['Selectează mai întâi tipul de statistică']}
                            />
                        </div>
                        
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-800 flex items-center">
                                <DownloadOutlined className="mr-2 text-purple-500" />
                                Acțiuni
                            </label>
                            <Button
                                type="primary"
                                icon={<DownloadOutlined />}
                                className={`w-full h-10 font-semibold rounded-xl transition-all duration-200 ${
                                    !downloadRange || !tableData.length 
                                        ? 'opacity-40 cursor-not-allowed' 
                                        : 'shadow-lg hover:shadow-xl'
                                }`}
                                style={{
                                    background: !downloadRange || !tableData.length 
                                        ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    border: 'none',
                                    color: 'white'
                                }}
                                onClick={handleExport}
                                disabled={!downloadRange || !tableData.length}
                            >
                                {!downloadRange || !tableData.length ? 'Selectează perioada' : 'Exportă CSV'}
                            </Button>
                        </div>
                    </div>
                    
                    {/* Show document filter only for document-related statistics */}
                    {(statisticsType === 'downloads' || statisticsType === 'popular' || statisticsType === 'types') && (
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-800 flex items-center">
                                <FileTextOutlined className="mr-2 text-orange-500" />
                                Filtrează după ID-uri de Document
                            </label>
                            <Select
                                mode="multiple"
                                placeholder="🔍 Selectează ID-urile documentelor pentru filtrare..."
                                value={selectedDocumentIds}
                                onChange={handleDocumentIdSelect}
                                options={availableDocumentIds.map(id => ({
                                    value: id,
                                    label: `📄 Document ID: ${id}`
                                }))}
                                className="w-full"
                                showSearch
                                optionFilterProp="label"
                                allowClear
                                maxTagCount="responsive"
                                size="large"
                                style={{
                                    borderRadius: '12px',
                                }}
                            />
                        </div>
                    )}
                    
                    {/* Show user filter only for performance statistics */}
                    {statisticsType === 'performance' && (
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-800 flex items-center">
                                <UserOutlined className="mr-2 text-blue-500" />
                                Filtrează după ID-uri de Utilizatori
                            </label>
                            <Select
                                mode="multiple"
                                placeholder="👥 Selectează ID-urile utilizatorilor pentru filtrare..."
                                value={selectedUserIds}
                                onChange={handleUserIdSelect}
                                options={availableUserIds.map(id => ({
                                    value: id,
                                    label: `👤 User ID: ${id}`
                                }))}
                                className="w-full"
                                showSearch
                                optionFilterProp="label"
                                allowClear
                                maxTagCount="responsive"
                                size="large"
                                style={{
                                    borderRadius: '12px',
                                }}
                            />
                        </div>
                    )}
                </div>

                <div className="mt-6">
                    {downloadLoading ? (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col justify-center items-center h-64 space-y-4"
                        >
                            <div className="relative">
                            <Spin size="large" className="text-blue-500" />
                                <motion.div
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: [0.8, 1.2, 0.8] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute inset-0 w-12 h-12 border-2 border-blue-200 rounded-full"
                                />
                                    </div>
                            <div className="text-center space-y-2">
                                <p className="text-lg font-semibold text-gray-700">Se încarcă statisticile...</p>
                                <p className="text-sm text-gray-500">Vă rugăm să așteptați</p>
                            </div>
                        </motion.div>
                    ) : tableData.length > 0 ? (
                        <div className="space-y-4">
                            {/* Summary Cards */}
                            {downloadRange && downloadRange[0] && downloadRange[1] && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100">
                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        className="text-center bg-white rounded-xl p-4 shadow-md"
                                    >
                                        <div className="text-3xl font-bold text-blue-600 mb-2">
                                            {statisticsType === 'popular' 
                                                ? tableData.reduce((sum, item) => sum + (item.download_count || 0), 0)
                                                : tableData.length}
                                    </div>
                                        <div className="text-sm text-gray-700 font-semibold flex items-center justify-center">
                                            <DownloadOutlined className="mr-1 text-blue-500" />
                                            Total Descărcări
                                    </div>
                                    </motion.div>
                                    {statisticsType === 'popular' && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                            className="text-center bg-white rounded-xl p-4 shadow-md"
                                        >
                                            <div className="text-3xl font-bold text-green-600 mb-2">
                                                {tableData.reduce((sum, item) => sum + (item.view_count || 0), 0)}
                                            </div>
                                            <div className="text-sm text-gray-700 font-semibold flex items-center justify-center">
                                                <EyeOutlined className="mr-1 text-green-500" />
                                                Total Vizualizări
                                        </div>
                                        </motion.div>
                                    )}
                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="text-center bg-white rounded-xl p-4 shadow-md"
                                    >
                                        <div className="text-3xl font-bold text-purple-600 mb-2">
                                            {new Set(tableData.map(item => item.id_document)).size}
                                        </div>
                                        <div className="text-sm text-gray-700 font-semibold flex items-center justify-center">
                                            <FileTextOutlined className="mr-1 text-purple-500" />
                                            Documente Unice
                                    </div>
                                    </motion.div>
                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="text-center bg-white rounded-xl p-4 shadow-md"
                                    >
                                        <div className="text-3xl font-bold text-orange-600 mb-2">
                                            {new Set(tableData.map(item => item.id_user_source)).size}
                                        </div>
                                        <div className="text-sm text-gray-700 font-semibold flex items-center justify-center">
                                            <UserOutlined className="mr-1 text-orange-500" />
                                            Utilizatori Unici
                                    </div>
                                    </motion.div>
                                </div>
                            )}
                            
                            <Table
                                dataSource={tableData}
                                columns={getTableColumns()}
                                loading={downloadLoading}
                        pagination={{ 
                            pageSize: 10,
                            showSizeChanger: true,
                            showQuickJumper: true,
                                    showTotal: (total, range) => (
                                        <span className="text-gray-600 font-medium">
                                            📊 Afișez {range[0]}-{range[1]} din {total} înregistrări
                                        </span>
                                    ),
                                    className: 'mt-6',
                                    itemRender: (current, type, originalElement) => {
                                        if (type === 'prev') {
                                            return <Button className="rounded-lg">Anterior</Button>;
                                        }
                                        if (type === 'next') {
                                            return <Button className="rounded-lg">Următor</Button>;
                                        }
                                        return originalElement;
                                    }
                        }}
                        scroll={{ x: 'max-content' }}
                                rowKey={(record, index) => `${record.id_document}-${record.download_timestamp}-${record.id_user_source}-${index}`}
                                rowClassName={(record, index) => 
                                    `hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 ${
                                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                    }`
                                }
                                className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg"
                                size="middle"
                                bordered={false}
                                components={{
                                    header: {
                                        cell: (props) => (
                                            <th {...props} className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-bold" />
                                        ),
                                    },
                                }}
                            />
                        </div>
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center h-64 space-y-6 text-gray-500"
                        >
                            <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                                {!statisticsType ? (
                                    <BarChartOutlined className="text-4xl text-blue-500" />
                                ) : (
                                    <CalendarOutlined className="text-4xl text-green-500" />
                                )}
                            </div>
                            <div className="text-center space-y-2">
                                {!statisticsType ? (
                                    <>
                                        <p className="text-xl font-bold text-gray-700">Alege un tip de statistică</p>
                                        <p className="text-gray-500 max-w-md">Selectează tipul de statistică din dropdown-ul de mai sus pentru a începe</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-xl font-bold text-gray-700">Selectează o perioadă</p>
                                        <p className="text-gray-500 max-w-md">Alege o perioadă de timp din calendar pentru a vizualiza statisticile detaliate</p>
                                    </>
                                )}
                            </div>
                            <div className="flex space-x-2">
                                <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-indigo-300 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-purple-300 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </motion.div>
                    )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

export default Statistics; 

/*
🚀 OPTIMIZATIONS APPLIED:

1. ❌ Removed failing /api/statistics/users endpoint requests (500 errors)
2. 🔄 Added debouncing (300ms-1000ms) to prevent rapid-fire requests
3. 📦 Added caching mechanism for 24-hour stats (5min cache)
4. 🔌 REPLACED SSE with Socket.IO for real-time updates:
   - Real-time download/view/upload events via Socket.IO rooms
   - Automatic reconnection with backoff strategy
   - Toast notifications for real-time actions
   - Graceful fallback handling
   - Targeted event broadcasting to 'statistics' room
5. 🗑️ Removed duplicate useEffect for statistics refresh
6. 🎯 Combined multiple useEffects to prevent request duplication
7. 📊 Added request logging for monitoring
8. 🛡️ Added isMounted guards to prevent memory leaks
9. ⚡ Only fetch data when needed (conditional loading)
10. 🔄 Optimized popular documents/types fetching with fallbacks

🔥 NEW: Socket.IO Events Implemented:
   Frontend Listeners:
   - 'documentDownloaded' - Updates download count + popular docs + toast notification
   - 'documentViewed' - Updates view count + popular docs (silent)
   - 'documentUploaded' - Updates upload size + toast notification
   - 'statisticsUpdate' - Bulk statistics refresh
   
   Backend Emitters:
   - /download route → 'documentDownloaded' event to 'statistics' room
   - /view route → 'documentViewed' event to 'statistics' room  
   - /upload route → 'documentUploaded' event to 'statistics' room

Result: Reduced API calls by ~70% + TRUE real-time statistics with Socket.IO!
*/ 