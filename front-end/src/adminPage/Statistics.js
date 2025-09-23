import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Table, DatePicker, Select, Spin, message, Modal, Button, Statistic, Progress, Space, Divider } from 'antd';
import { Line } from 'react-chartjs-2';
import { DownloadOutlined, EyeOutlined, FileTextOutlined, UserOutlined, CalendarOutlined, DatabaseOutlined, DeleteOutlined } from '@ant-design/icons';
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
    const [statisticsType, setStatisticsType] = useState('downloads');
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

    // Add statistics type options
    const statisticsTypes = [
        { value: 'downloads', label: 'Downloads' },
        { value: 'popular', label: 'Most Popular Documents' },
        { value: 'types', label: 'Document Types' }
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

    useEffect(() => {
        // Set up SSE connection for real-time updates
        console.log('Setting up SSE connection');
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 3;
        let reconnectTimeout;

        const setupEventSource = () => {
            const eventSource = new EventSource(`${backend}/api/statistics/realtime`, {
                withCredentials: true
            });

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'stats') {
                        const formattedStats = {
                            totals: {
                                total_downloads: parseInt(data.stats.totals?.downloads) || 0,
                                total_views: parseInt(data.stats.totals?.views) || 0
                            },
                            topDownloads: Array.isArray(data.stats.topDownloads) ? data.stats.topDownloads.map(doc => ({
                                nom_document: doc.nom_document,
                                download_count: parseInt(doc.download_count) || 0
                            })) : [],
                            activeUsers: Array.isArray(data.stats.activeUsers) ? data.stats.activeUsers.map(user => ({
                                nom: user.nom,
                                prenom: user.prenom,
                                action_count: parseInt(user.action_count) || 0
                            })) : [],
                            typeDistribution: Object.entries(data.stats.typeDistribution || {}).map(([type, count]) => ({
                                type,
                                count: parseInt(count) || 0
                            })),
                            last24Hours: Array.isArray(data.stats.last24Hours) ? data.stats.last24Hours.map(item => ({
                                document_name: item.document_name,
                                download_count: parseInt(item.download_count) || 0,
                                timestamp: item.timestamp,
                                user_name: item.user_name
                            })) : []
                        };
                        setRealtimeStats(formattedStats);
                    } else if (data.type === 'error') {
                        console.error('Server error:', data.error);
                        setError(data.error);
                        setLoading(false);
                        if (data.error.includes('Unauthorized')) {
                            window.location.href = '/login';
                        }
                    }
                } catch (error) {
                    console.error('Error parsing SSE data:', error);
                    console.error('Raw data that caused error:', event.data);
                    setError('Error parsing server data');
                    setLoading(false);
                }
            };

            eventSource.onerror = (error) => {
                console.error('SSE Error:', error);
                console.error('EventSource readyState:', eventSource.readyState);
                
                if (eventSource.readyState === EventSource.CLOSED) {
                    console.log('Connection closed, checking authentication');
                    if (reconnectAttempts < maxReconnectAttempts) {
                        reconnectAttempts++;
                        console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
                        reconnectTimeout = setTimeout(() => {
                            eventSource.close();
                            setupEventSource();
                        }, 5000);
                    } else {
                        console.log('Max reconnection attempts reached');
                        setError('Unable to establish connection. Please refresh the page manually.');
                        setLoading(false);
                        eventSource.close();
                    }
                } else if (error.status === 401) {
                    setError('Please log in to view statistics');
                    window.location.href = '/login';
                } else {
                    setError('Connection error. Please try again later.');
                    setLoading(false);
                }
            };

            return eventSource;
        };

        const eventSource = setupEventSource();

        return () => {
            console.log('Cleaning up SSE connection');
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }
            eventSource.close();
        };
    }, []);

    useEffect(() => {
        const fetchHistoricalStats = async () => {
            try {
                setLoading(true);
                const [historicalResponse, viewsResponse] = await Promise.all([
                    axios.get(`${backend}/api/statistics/historical`, {
                        params: {
                            startDate: dateRange[0].format('YYYY-MM-DD'),
                            endDate: dateRange[1].format('YYYY-MM-DD'),
                            documentId: selectedDocument
                        },
                        withCredentials: true
                    }),
                    axios.get(`${backend}/api/statistics/views`, {
                        params: {
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
            } catch (error) {
                console.error('Error fetching historical stats:', error);
                setError('Error loading historical statistics');
                setHistoricalStats([]);
            } finally {
                setLoading(false);
            }
        };

        fetchHistoricalStats();
    }, [dateRange, selectedDocument]);

    // Refresh statistics when an update occurs
    useEffect(() => {
        const fetchUpdatedStats = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${backend}/api/statistics/realtime`, {
                    withCredentials: true
                });
                
                if (response.data) {
                    setRealtimeStats(response.data);
                    setDownloadStats(response.data.last24Hours || []);
                    setTableData(response.data.last24Hours || []);
                }
            } catch (error) {
                console.error('Error fetching updated stats:', error);
                message.error('Failed to fetch updated statistics');
            } finally {
                setLoading(false);
            }
        };

        // Listen for update events
        const handleUpdate = () => {
            fetchUpdatedStats();
        };

        // Add event listener for updates
        window.addEventListener('statisticsUpdated', handleUpdate);

        return () => {
            window.removeEventListener('statisticsUpdated', handleUpdate);
        };
    }, []);

    // Add this useEffect to handle immediate filtering
    useEffect(() => {
        if (downloadStats.length > 0) {
            let filteredData = [...downloadStats];
            
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
            
            setTableData(filteredData);
        }
    }, [selectedDocumentIds, downloadStats, statisticsType]);

    // Fetch available users for the user filter
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await axios.get(`${backend}/api/statistics/users`, {
                    withCredentials: true
                });
                const userOptions = response.data.map(user => ({
                    value: user.id_user,
                    label: `${user.nom} ${user.prenom}`
                }));
                setUsers(userOptions);
            } catch (error) {
                console.error('Error fetching users:', error);
                message.error('Failed to fetch users');
            }
        };
        fetchUsers();
    }, []);

    // Add useEffect to fetch last 24 hours stats
    useEffect(() => {
        const fetchLast24HoursStats = async () => {
            try {
                const [downloadsResponse, viewsResponse, uploadSizeResponse] = await Promise.all([
                    axios.get(`${backend}/api/statistics/downloads`, {
                        params: {
                            startDate: moment().subtract(24, 'hours').format('YYYY-MM-DD HH:mm:ss'),
                            endDate: moment().format('YYYY-MM-DD HH:mm:ss')
                        },
                        withCredentials: true
                    }),
                    axios.get(`${backend}/api/statistics/views`, {
                        params: {
                            startDate: moment().subtract(24, 'hours').format('YYYY-MM-DD HH:mm:ss'),
                            endDate: moment().format('YYYY-MM-DD HH:mm:ss')
                        },
                        withCredentials: true
                    }),
                    axios.get(`${backend}/api/statistics/total-upload-size`, {
                        withCredentials: true
                    })
                ]);

                // Calculate total views from the last 24 hours
                const totalViews = viewsResponse.data.reduce((sum, item) => {
                    const viewDate = moment(item.lastViewed);
                    if (viewDate.isAfter(moment().subtract(24, 'hours'))) {
                        return sum + (item.viewCount || 0);
                    }
                    return sum;
                }, 0);

                // Calculate total downloads from the last 24 hours
                const totalDownloads = downloadsResponse.data.reduce((sum, item) => {
                    const downloadDate = moment(item.download_timestamp);
                    if (downloadDate.isAfter(moment().subtract(24, 'hours'))) {
                        return sum + 1;
                    }
                    return sum;
                }, 0);

                console.log('Upload size response:', uploadSizeResponse.data); // Debug log

                setLast24HoursStats({
                    downloads: totalDownloads,
                    views: totalViews,
                    uploadSize: uploadSizeResponse.data.total_size || 0
                });
            } catch (error) {
                console.error('Error fetching last 24 hours stats:', error);
            }
        };

        fetchLast24HoursStats();
        const interval = setInterval(fetchLast24HoursStats, 60000); // Update every minute

        return () => clearInterval(interval);
    }, []);

    // Modify the handleDocumentIdSelect function
    const handleDocumentIdSelect = (selectedIds) => {
        setSelectedDocumentIds(selectedIds);
        // Remove the fetchStats call from here since we'll handle filtering in the useEffect
    };

    // Modify the fetchStats function to not filter by selectedDocumentIds
    const fetchStats = async (startDate, endDate) => {
        try {
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
                    // First get downloads
                    const downloadsResponse = await axios.get(`${backend}/api/statistics/downloads`, {
                        params,
                        withCredentials: true
                    });

                    if (downloadsResponse.data) {
                        // Get unique document IDs and names from downloads
                        const uniqueDocuments = Array.from(new Set(downloadsResponse.data.map(doc => doc.id_document)))
                            .map(id => {
                                const doc = downloadsResponse.data.find(d => d.id_document === id);
                                return {
                                    id: doc.id_document,
                                    name: doc.nom_document
                                };
                            });

                        // Create a map of document IDs to their data
                        const documentMap = new Map();

                        // Process downloads from user_logs
                        downloadsResponse.data.forEach(item => {
                            const key = item.id_document;
                            if (!documentMap.has(key)) {
                                documentMap.set(key, {
                                    id_document: item.id_document,
                                    nom_document: item.nom_document,
                                    download_count: 0,
                                    view_count: 0
                                });
                            }
                            documentMap.get(key).download_count++;
                        });

                        // Get views from document_log
                        const viewsResponse = await axios.get(`${backend}/api/statistics/views`, {
                            params: {
                                startDate: adjustedStartDate.format('YYYY-MM-DD HH:mm:ss'),
                                endDate: adjustedEndDate.format('YYYY-MM-DD HH:mm:ss'),
                                documentIds: uniqueDocuments.map(doc => doc.id).join(',')
                            },
                            withCredentials: true
                        });

                        // Process views from document_log
                        if (viewsResponse.data) {
                            viewsResponse.data.forEach(item => {
                                const document = uniqueDocuments.find(doc => doc.id === item.documentId);
                                if (document && documentMap.has(document.id)) {
                                    documentMap.get(document.id).view_count = item.viewCount || 0;
                                }
                            });
                        }

                        // Convert map to array and filter out documents with no activity
                        const popularData = Array.from(documentMap.values())
                            .filter(item => item.download_count > 0 || item.view_count > 0)
                            .sort((a, b) => (b.download_count + b.view_count) - (a.download_count + a.view_count));

                        setTableData(popularData);
                        setDownloadStats(popularData);
                        setAvailableDocumentIds(uniqueDocuments.map(doc => doc.id));
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
            } else {
                // Use downloads endpoint for regular downloads
                    const response = await axios.get(`${backend}/api/statistics/downloads`, {
                    params,
                    withCredentials: true
                });

                if (response.data) {
                    // Show all download actions without grouping
                    const processedData = response.data.map(item => ({
                        id_document: item.id_document,
                        nom_document: item.nom_document,
                        download_count: 1,
                        download_timestamp: item.download_timestamp || null,
                        nom: item.nom || '',
                        prenom: item.prenom || '',
                        id_user_source: item.id_user_source
                    }));

                    setDownloadStats(processedData);
                    setTableData(processedData);
                    setAvailableDocumentIds([...new Set(processedData.map(item => item.id_document))]);
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
                        render: (id) => <span className="font-bold">{id}</span>
                    },
                    {
                        title: 'Nume Document',
                        dataIndex: 'nom_document',
                        key: 'nom_document',
                        className: 'font-medium',
                        ellipsis: true,
                        width: 300,
                        filterSearch: true,
                        onFilter: (value, record) => record.nom_document?.toLowerCase().includes(value.toLowerCase())
                    },
                    {
                        title: 'Data și Ora',
                        dataIndex: 'download_timestamp',
                        key: 'download_timestamp',
                        render: (date) => {
                            if (!date) return 'N/A';
                            try {
                                return moment(date).format('DD.MM.YYYY HH:mm:ss');
                            } catch (error) {
                                console.error('Error formatting date:', error);
                                return 'N/A';
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
                            if (!record.nom && !record.prenom) return 'N/A';
                            return `${record.nom || ''} ${record.prenom || ''}`.trim() || 'N/A';
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
                        render: (id) => <span className="font-bold">{id}</span>
                    },
                    {
                        title: 'Nume Document',
                        dataIndex: 'nom_document',
                        key: 'nom_document',
                        className: 'font-medium',
                        ellipsis: true,
                        width: 300
                    },
                    {
                        title: 'Număr Downloads',
                        dataIndex: 'download_count',
                        key: 'download_count',
                        className: 'text-center font-medium',
                        width: 150,
                        sorter: (a, b) => (a.download_count || 0) - (b.download_count || 0),
                        render: (count) => (
                            <span className="text-blue-500 font-bold">
                                {count || 0}
                            </span>
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
                            <span className="text-green-500 font-bold">
                                {count || 0}
                            </span>
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
                        render: (id) => <span className="font-bold">{id}</span>
                    },
                    {
                        title: 'Document Type',
                        dataIndex: 'nom_document',
                        key: 'nom_document',
                        className: 'font-medium',
                        ellipsis: true,
                        width: 250
                    },
                    {
                        title: 'Number of Documents',
                        dataIndex: 'document_count',
                        key: 'document_count',
                        className: 'text-center font-medium',
                        width: 150,
                        sorter: (a, b) => (a.document_count || 0) - (b.document_count || 0),
                        render: (count) => (
                            <span className="text-blue-500 font-bold">
                                {count || 0}
                            </span>
                        )
                    },
                    {
                        title: 'Total Views',
                        dataIndex: 'view_count',
                        key: 'view_count',
                        className: 'text-center font-medium',
                        width: 120,
                        sorter: (a, b) => (a.view_count || 0) - (b.view_count || 0),
                        render: (count) => (
                            <span className="text-green-500 font-bold">
                                {count || 0}
                            </span>
                        )
                    }
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
                            Export
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
                        Downloads (24h)
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

    const fetchDocumentTypes = async () => {
        try {
            if (!dateRange || !dateRange[0] || !dateRange[1]) {
                console.log('Date range not set, skipping document types fetch');
                return;
            }

            const response = await axios.get(`${backend}/api/statistics/document-types`, {
                params: {
                    startDate: dateRange[0].format('YYYY-MM-DD'),
                    endDate: dateRange[1].format('YYYY-MM-DD')
                },
                withCredentials: true
            });
            setDocumentTypes(response.data);
        } catch (error) {
            console.error('Error fetching document types:', error);
            toast.error('Failed to fetch document type statistics');
        }
    };

    useEffect(() => {
        if (dateRange && dateRange[0] && dateRange[1]) {
            fetchStats(dateRange[0], dateRange[1]);
            fetchDocumentTypes();
        }
    }, [dateRange]);

    // Add useEffect to fetch document types when statistics type changes
    useEffect(() => {
        if (statisticsType === 'types' && downloadRange && downloadRange[0] && downloadRange[1]) {
            fetchStats(downloadRange[0], downloadRange[1]);
        }
    }, [statisticsType]);

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
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-8">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                    type: "spring",
                    stiffness: 100,
                    damping: 10,
                    duration: 0.5 
                }}
                className="mb-8"
            >
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Statistics Dashboard
                </h1>
                <p className="text-gray-600 mt-2 text-lg">Real-time insights into your document management system</p>
            </motion.div>

            {/* Statistics Cards */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            >
                <motion.div
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-100"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <DownloadOutlined className="text-blue-600 text-2xl" />
                        </div>
                        <span className="text-sm text-blue-600 font-medium">Last 24h</span>
                    </div>
                    <h3 className="text-3xl font-bold text-blue-600 mb-1">{last24HoursStats.downloads}</h3>
                    <p className="text-blue-500 font-medium">Downloads</p>
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-green-100"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <EyeOutlined className="text-green-600 text-2xl" />
                        </div>
                        <span className="text-sm text-green-600 font-medium">Last 24h</span>
                    </div>
                    <h3 className="text-3xl font-bold text-green-600 mb-1">{last24HoursStats.views}</h3>
                    <p className="text-green-500 font-medium">Views</p>
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-purple-100"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <FileTextOutlined className="text-purple-600 text-2xl" />
                        </div>
                        <span className="text-sm text-purple-600 font-medium">Total</span>
                    </div>
                    <h3 className="text-3xl font-bold text-purple-600 mb-1">{documents.length}</h3>
                    <p className="text-purple-500 font-medium">Documents</p>
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-orange-100"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <DatabaseOutlined className="text-orange-600 text-2xl" />
                        </div>
                        <span className="text-sm text-orange-600 font-medium">Last 24h</span>
                    </div>
                    <h3 className="text-3xl font-bold text-orange-600 mb-1">{formatBytes(last24HoursStats.uploadSize)}</h3>
                    <p className="text-orange-500 font-medium">Uploads</p>
                </motion.div>
            </motion.div>

            {/* Table Section with Integrated Filters */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                    type: "spring",
                    stiffness: 100,
                    damping: 10,
                    duration: 0.5,
                    delay: 0.3
                }}
                className="bg-white/90 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
            >
                <div className="flex flex-col space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h2 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Detailed Statistics
                        </h2>
                        <div className="flex items-center space-x-4">
                            <Select
                                value={statisticsType}
                                onChange={setStatisticsType}
                                options={statisticsTypes}
                                className="w-40"
                                placeholder="Stats Type"
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
                                className="w-64"
                            />
                            <Button
                                type="primary"
                                icon={<DownloadOutlined />}
                                className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 border-0"
                                onClick={handleExport}
                            >
                                Export
                            </Button>
                        </div>
                    </div>
                    
                    <div className="w-full">
                        <Select
                            mode="multiple"
                            placeholder="Filter by Document IDs"
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
                    </div>
                </div>

                <div className="mt-6">
                    <Table
                        dataSource={tableData}
                        columns={[
                            {
                                title: 'ID',
                                dataIndex: 'id_document',
                                key: 'id_document',
                                className: 'text-center font-medium',
                                width: 80,
                                sorter: (a, b) => (a.id_document || 0) - (b.id_document || 0),
                                render: (id) => (
                                    <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                        {id}
                                    </span>
                                )
                            },
                            {
                                title: 'Document Name',
                                dataIndex: 'nom_document',
                                key: 'nom_document',
                                className: 'font-medium',
                                ellipsis: true,
                                width: 300,
                                filterSearch: true,
                                onFilter: (value, record) => record.nom_document?.toLowerCase().includes(value.toLowerCase()),
                                render: (text) => (
                                    <span className="text-gray-700 flex items-center">
                                        <FileTextOutlined className="mr-2 text-blue-500" />
                                        {text}
                                    </span>
                                )
                            },
                            {
                                title: 'Downloads',
                                dataIndex: 'download_count',
                                key: 'download_count',
                                className: 'text-center font-medium',
                                width: 150,
                                sorter: (a, b) => (a.download_count || 0) - (b.download_count || 0),
                                render: (count) => (
                                    <div className="flex items-center justify-center">
                                        <DownloadOutlined className="mr-2 text-blue-500" />
                                        <span className="text-blue-500 font-bold bg-blue-50 px-2 py-1 rounded">
                                            {count || 0}
                                        </span>
                                    </div>
                                )
                            },
                            {
                                title: 'Views',
                                dataIndex: 'view_count',
                                key: 'view_count',
                                className: 'text-center font-medium',
                                width: 150,
                                sorter: (a, b) => (a.view_count || 0) - (b.view_count || 0),
                                render: (count) => (
                                    <div className="flex items-center justify-center">
                                        <EyeOutlined className="mr-2 text-green-500" />
                                        <span className="text-green-500 font-bold bg-green-50 px-2 py-1 rounded">
                                            {count || 0}
                                        </span>
                                    </div>
                                )
                            }
                        ]}
                        loading={false}
                        pagination={{ 
                            pageSize: 10,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            className: 'mt-4'
                        }}
                        scroll={{ x: 'max-content' }}
                        rowKey={(record) => `${record.id_document}-${record.download_timestamp}-${record.id_user_source}`}
                        rowClassName="hover:bg-gray-50 transition-colors duration-200"
                        components={{
                            body: {
                                row: ({ children, ...props }) => (
                                    <tr
                                        className="hover:bg-gray-50 border-b border-gray-100"
                                        {...props}
                                    >
                                        {children}
                                    </tr>
                                )
                            }
                        }}
                        className="rounded-lg overflow-hidden"
                    />
                </div>
            </motion.div>
        </div>
    );
};

export default Statistics; 