import React, { useState, useEffect } from 'react';
import { DownloadOutlined, EyeOutlined, FileTextOutlined, UserOutlined, CalendarOutlined, ApartmentOutlined, TeamOutlined, SettingOutlined, FilterOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { FileText, Download, Upload, Clock, Users, Activity, ArrowUp, ArrowDown, Building, Crown, Shield, User, UserCheck, Filter, Search, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, ro } from 'date-fns/locale';
import { backend } from '../config';

const Profile = () => {
    const [profileData, setProfileData] = useState(null);
    const [institutionData, setInstitutionData] = useState(null);
    const [institutionMembers, setInstitutionMembers] = useState([]);
    const [userLogs, setUserLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [logsLoading, setLogsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    
    // Filters
    const [logFilters, setLogFilters] = useState({
        action: 'all',
        dateFrom: '',
        dateTo: '',
        search: ''
    });

    const [logsPagination, setLogsPagination] = useState({
        page: 1,
        limit: 20,
        total: 0
    });

    useEffect(() => {
        fetchProfileData();
        fetchInstitutionData();
        fetchUserLogs();
    }, []);

    useEffect(() => {
        applyLogFilters();
    }, [userLogs, logFilters]);

        const fetchProfileData = async () => {
            try {
                const response = await fetch(`${backend}/api/user/profile`, {
                    credentials: 'include',
                    headers: {
                        'Origin': window.location.origin,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch profile data: ${response.status}`);
                }
                
                const data = await response.json();
                setProfileData(data);
            } catch (error) {
                console.error('Error fetching profile data:', error);
        }
    };

    const fetchInstitutionData = async () => {
        try {
            const response = await fetch(`${backend}/api/user/institution`, {
                credentials: 'include',
                headers: {
                    'Origin': window.location.origin,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch institution data: ${response.status}`);
            }
            
            const data = await response.json();
            setInstitutionData(data.institution);
            
            // Fetch institution members
            if (data.institution?.id_institution) {
                fetchInstitutionMembers(data.institution.id_institution);
            }
        } catch (error) {
            console.error('Error fetching institution data:', error);
        }
    };

    const fetchInstitutionMembers = async (institutionId) => {
        try {
            const response = await fetch(`${backend}/post_docs/institutions/${institutionId}/users`, {
                credentials: 'include',
                headers: {
                    'Origin': window.location.origin
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch institution members: ${response.status}`);
            }
            
            const data = await response.json();
            setInstitutionMembers(data);
        } catch (error) {
            console.error('Error fetching institution members:', error);
        }
    };

    const fetchUserLogs = async (page = 1) => {
        try {
            setLogsLoading(true);
            const response = await fetch(`${backend}/api/user/logs?page=${page}&limit=${logsPagination.limit}`, {
                credentials: 'include',
                headers: {
                    'Origin': window.location.origin,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                // If endpoint doesn't exist, create mock data for now
                const mockLogs = generateMockLogs();
                setUserLogs(mockLogs);
                setLogsPagination(prev => ({ ...prev, total: mockLogs.length }));
                setLoading(false);
                setLogsLoading(false);
                return;
            }
            
            const data = await response.json();
            setUserLogs(data.logs || []);
            setLogsPagination(prev => ({
                ...prev,
                page: data.pagination?.page || page,
                total: data.pagination?.total || 0
            }));
        } catch (error) {
            console.error('Error fetching user logs:', error);
            // Create mock data if endpoint fails
            const mockLogs = generateMockLogs();
            setUserLogs(mockLogs);
            setLogsPagination(prev => ({ ...prev, total: mockLogs.length }));
        } finally {
            setLoading(false);
            setLogsLoading(false);
        }
    };

    const generateMockLogs = () => {
        if (!profileData?.userInfo) return [];
        
        const actions = ['UPLOAD_DOCUMENT', 'Download Document', 'LOGIN', 'LOGOUT', 'DELETE_DOCUMENT', 'SHARE_DOCUMENT'];
        const documents = ['rapport_financier.pdf', 'plan_strategique.pdf', 'contract_2024.pdf', 'prezentare_q1.pdf', 'raport_anual.pdf'];
        
        return Array.from({ length: 50 }, (_, index) => {
            const action = actions[Math.floor(Math.random() * actions.length)];
            const doc = documents[Math.floor(Math.random() * documents.length)];
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 30));
            
            return {
                id: index + 1,
                action,
                details: action.includes('Document') ? `${action.replace('_', ' ')}: ${doc}` : action,
                created_at: date.toISOString(),
                user_name: `${profileData.userInfo.prenom} ${profileData.userInfo.nom}`
            };
        });
    };

    const applyLogFilters = () => {
        let filtered = [...userLogs];

        // Filter by action type
        if (logFilters.action !== 'all') {
            filtered = filtered.filter(log => log.action.toLowerCase().includes(logFilters.action.toLowerCase()));
        }

        // Filter by date range
        if (logFilters.dateFrom) {
            const fromDate = new Date(logFilters.dateFrom);
            filtered = filtered.filter(log => new Date(log.created_at) >= fromDate);
        }

        if (logFilters.dateTo) {
            const toDate = new Date(logFilters.dateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(log => new Date(log.created_at) <= toDate);
        }

        // Filter by search term
        if (logFilters.search) {
            const searchTerm = logFilters.search.toLowerCase();
            filtered = filtered.filter(log => 
                log.action.toLowerCase().includes(searchTerm) ||
                log.details.toLowerCase().includes(searchTerm)
            );
        }

        setFilteredLogs(filtered);
    };

    const handleFilterChange = (key, value) => {
        setLogFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const clearFilters = () => {
        setLogFilters({
            action: 'all',
            dateFrom: '',
            dateTo: '',
            search: ''
        });
    };

    const getRoleIcon = (role) => {
        switch (role?.toLowerCase()) {
            case 'superadmin':
                return <Crown className="w-5 h-5 text-yellow-600" />;
            case 'admin':
                return <Shield className="w-5 h-5 text-blue-600" />;
            case 'director':
                return <User className="w-5 h-5 text-purple-600" />;
            case 'responsable':
                return <UserCheck className="w-5 h-5 text-green-600" />;
            default:
                return <UserOutlined className="w-5 h-5 text-gray-600" />;
        }
    };

    const getRoleBadgeColor = (role) => {
        switch (role?.toLowerCase()) {
            case 'superadmin':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'admin':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'director':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'responsable':
                return 'bg-green-100 text-green-800 border-green-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getActionIcon = (action) => {
        if (action.toLowerCase().includes('upload')) {
            return <Upload className="w-4 h-4 text-green-600" />;
        } else if (action.toLowerCase().includes('download')) {
            return <Download className="w-4 h-4 text-blue-600" />;
        } else if (action.toLowerCase().includes('login')) {
            return <ArrowUp className="w-4 h-4 text-green-600" />;
        } else if (action.toLowerCase().includes('logout')) {
            return <ArrowDown className="w-4 h-4 text-red-600" />;
        } else if (action.toLowerCase().includes('delete')) {
            return <FileTextOutlined className="w-4 h-4 text-red-600" />;
        }
        return <Activity className="w-4 h-4 text-gray-600" />;
    };

    const getActionBadgeColor = (action) => {
        if (action.toLowerCase().includes('upload')) {
            return 'bg-green-100 text-green-800';
        } else if (action.toLowerCase().includes('download')) {
            return 'bg-blue-100 text-blue-800';
        } else if (action.toLowerCase().includes('login')) {
            return 'bg-green-100 text-green-800';
        } else if (action.toLowerCase().includes('logout')) {
            return 'bg-red-100 text-red-800';
        } else if (action.toLowerCase().includes('delete')) {
            return 'bg-red-100 text-red-800';
        }
        return 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white rounded-xl shadow-sm h-48"></div>
                                <div className="bg-white rounded-xl shadow-sm h-96"></div>
                            </div>
                            <div className="space-y-6">
                                <div className="bg-white rounded-xl shadow-sm h-64"></div>
                                <div className="bg-white rounded-xl shadow-sm h-48"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-12">
                        <UserOutlined className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Nu s-au găsit date de profil</h3>
                        <p className="text-gray-600">Vă rugăm să vă reconectați sau contactați administratorul.</p>
                    </div>
                </div>
            </div>
        );
    }

    const { userInfo, statistics, recentActivity } = profileData;
    const storageUsed = (statistics.totalStorage / (1024 * 1024)).toFixed(2);
    const storageLimit = 1000;
    const storagePercentage = Math.min((storageUsed / storageLimit) * 100, 100);

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <UserOutlined className="w-6 h-6 text-blue-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Profilul meu</h1>
                    </div>
                    <p className="text-gray-600">Gestionează informațiile tale de profil și activitatea.</p>
                </div>

                {/* Tab Navigation */}
                <div className="mb-6">
                    <nav className="flex space-x-8 border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'overview'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Prezentare generală
                        </button>
                        <button
                            onClick={() => setActiveTab('institution')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'institution'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Instituția mea
                        </button>
                        <button
                            onClick={() => setActiveTab('activity')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'activity'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Activitate detaliată
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Profile Info */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Profile Card */}
                            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                                <div className="flex items-start gap-6">
                                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
                                        {userInfo.prenom?.charAt(0)}{userInfo.nom?.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                            {userInfo.prenom} {userInfo.nom}
                                        </h2>
                                        <p className="text-gray-600 mb-3">{userInfo.email}</p>
                                        <div className="flex items-center gap-3 mb-4">
                                            {getRoleIcon(userInfo.roles)}
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadgeColor(userInfo.roles)}`}>
                                                {userInfo.roles?.charAt(0).toUpperCase() + userInfo.roles?.slice(1)}
                                            </span>
                                        </div>
                                        {institutionData && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <ApartmentOutlined className="w-4 h-4" />
                                                <span>{institutionData.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Statistics Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <FileTextOutlined className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <h3 className="font-medium text-gray-900">Documente totale</h3>
                                    </div>
                                    <div className="text-3xl font-bold text-gray-900 mb-1">{statistics.totalDocuments}</div>
                                    <p className="text-sm text-gray-600">Fișiere încărcate</p>
                                </div>

                                <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <SettingOutlined className="w-5 h-5 text-green-600" />
                                        </div>
                                        <h3 className="font-medium text-gray-900">Spațiu utilizat</h3>
                                    </div>
                                    <div className="text-3xl font-bold text-gray-900 mb-1">{storageUsed} MB</div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                        <div 
                                            className={`h-2 rounded-full ${storagePercentage > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                                            style={{ width: `${storagePercentage}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-sm text-gray-600">din {storageLimit} MB</p>
                                </div>

                                <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-purple-100 rounded-lg">
                                            <CalendarOutlined className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <h3 className="font-medium text-gray-900">Ultima încărcare</h3>
                                    </div>
                                    <div className="text-lg font-semibold text-gray-900 mb-1">
                                        {statistics.lastUpload ? 
                                            formatDistanceToNow(new Date(statistics.lastUpload), { addSuffix: true, locale: ro }) : 
                                            'Niciodată'
                                        }
                                    </div>
                                    <p className="text-sm text-gray-600">Activitate recentă</p>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-orange-100 rounded-lg">
                                        <Activity className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">Activitate recentă</h3>
                                </div>
                                <div className="space-y-4">
                                    {recentActivity && recentActivity.length > 0 ? (
                                        recentActivity.slice(0, 5).map((activity, index) => (
                                            <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                                    {getActionIcon(activity.action)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionBadgeColor(activity.action)}`}>
                                                            {activity.action}
                                                        </span>
                                                        <span className="text-sm text-gray-500">
                                                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ro })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-900">{activity.details}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8">
                                            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                            <p className="text-gray-600">Nu există activitate recentă</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Institution Quick Info */}
                            {institutionData && (
                                <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-indigo-100 rounded-lg">
                                            <ApartmentOutlined className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">Instituția mea</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm text-gray-600">Nume</p>
                                            <p className="font-medium text-gray-900">{institutionData.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Email</p>
                                            <p className="font-medium text-gray-900">{institutionData.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Telefon</p>
                                            <p className="font-medium text-gray-900">{institutionData.phone}</p>
                                        </div>
                                        {institutionMembers.length > 0 && (
                                            <div>
                                                <p className="text-sm text-gray-600">Membri activi</p>
                                                <p className="font-medium text-gray-900">{institutionMembers.length} utilizatori</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}


                        </div>
                    </div>
                )}

                {activeTab === 'institution' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Institution Details */}
                        {institutionData && (
                            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-blue-100 rounded-lg">
                                        <ApartmentOutlined className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900">Detalii instituție</h3>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Nume instituție</label>
                                        <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-lg">{institutionData.name}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Adresă</label>
                                        <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-lg">{institutionData.address || 'Nu este specificată'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Email</label>
                                        <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-lg">{institutionData.email}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Telefon</label>
                                        <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-lg">{institutionData.phone || 'Nu este specificat'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Rolul meu în instituție</label>
                                        <div className="mt-2 flex items-center gap-2">
                                            {getRoleIcon(userInfo.roles)}
                                            <span className={`px-3 py-2 rounded-lg text-sm font-medium border ${getRoleBadgeColor(userInfo.roles)}`}>
                                                {userInfo.roles?.charAt(0).toUpperCase() + userInfo.roles?.slice(1)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Institution Members */}
                        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-green-100 rounded-lg">
                                        <TeamOutlined className="w-6 h-6 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900">Membri instituție</h3>
                                </div>
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                    {institutionMembers.length} membri
                                </span>
                            </div>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {institutionMembers.length > 0 ? (
                                    institutionMembers.map((member) => (
                                        <div key={member.id_user} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                                {member.prenom?.charAt(0)}{member.nom?.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900">{member.prenom} {member.nom}</p>
                                                <p className="text-sm text-gray-600 truncate">{member.email}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getRoleIcon(member.roles)}
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(member.roles)}`}>
                                                    {member.roles}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <TeamOutlined className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                        <p className="text-gray-600">Nu s-au găsit membri ai instituției</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'activity' && (
                    <div className="space-y-6">
                        {/* Filters */}
                        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <FilterOutlined className="w-5 h-5 text-indigo-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Filtrare activitate</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tip acțiune</label>
                                    <select
                                        value={logFilters.action}
                                        onChange={(e) => handleFilterChange('action', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="all">Toate acțiunile</option>
                                        <option value="upload">Încărcare documente</option>
                                        <option value="download">Descărcare documente</option>
                                        <option value="login">Conectare</option>
                                        <option value="logout">Deconectare</option>
                                        <option value="delete">Ștergere documente</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Data de la</label>
                                    <input
                                        type="date"
                                        value={logFilters.dateFrom}
                                        onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Data până la</label>
                                    <input
                                        type="date"
                                        value={logFilters.dateTo}
                                        onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Căutare</label>
                                    <div className="relative">
                                        <SearchOutlined className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Caută în activitate..."
                                            value={logFilters.search}
                                            onChange={(e) => handleFilterChange('search', e.target.value)}
                                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-4">
                                <button
                                    onClick={clearFilters}
                                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Resetează filtrele
                                </button>
                                <button
                                    onClick={() => fetchUserLogs(1)}
                                    disabled={logsLoading}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    <ReloadOutlined className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
                                    Reîmprospătează
                                </button>
                            </div>
                        </div>

                        {/* Activity Logs */}
                        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 rounded-lg">
                                        <Activity className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">Activitate detaliată</h3>
                                </div>
                                <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                                    {filteredLogs.length} {filteredLogs.length === 1 ? 'înregistrare' : 'înregistrări'}
                                </span>
                            </div>
                            
                            {logsLoading ? (
                                <div className="space-y-4">
                                    {[...Array(5)].map((_, index) => (
                                        <div key={index} className="animate-pulse flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                                            <div className="w-10 h-10 bg-gray-300 rounded-lg"></div>
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                                                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                                            </div>
                                            <div className="h-4 bg-gray-200 rounded w-20"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredLogs.length > 0 ? (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {filteredLogs.map((log, index) => (
                                        <div key={log.id || index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                                {getActionIcon(log.action)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionBadgeColor(log.action)}`}>
                                                        {log.action}
                                                    </span>
                                                    <span className="text-sm text-gray-500">
                                                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ro })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-900">{log.details}</p>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(log.created_at).toLocaleDateString('ro-RO')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nu s-au găsit înregistrări</h3>
                                    <p className="text-gray-600">Încearcă să ajustezi filtrele pentru a găsi activitatea dorită.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile; 