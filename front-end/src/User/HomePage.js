import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pdfjs } from 'react-pdf';
import { Document, Page } from 'react-pdf';
import { Card, Progress, Space, Badge, Tooltip, Typography, Modal, Button, Tag, Spin, message } from 'antd';
import { Box, SimpleGrid, Grid, GridItem, Heading, Text as CText, Badge as CBadge, Stat, StatLabel, StatNumber, StatHelpText, StatGroup, useColorModeValue } from '@chakra-ui/react';
import { DatabaseOutlined, FileOutlined, EyeOutlined, DownloadOutlined, PrinterOutlined, CloseOutlined, LeftOutlined, RightOutlined, BarChartOutlined, ClockCircleOutlined, FolderOutlined, UserOutlined, ExclamationCircleOutlined, FileTextOutlined, UploadOutlined, SwapOutlined, DeleteOutlined } from '@ant-design/icons';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import StorageInfo from './StorageInfo';
import { backend } from '../config';

const { Title, Text } = Typography;

// Configure PDF.js worker with proper version and source
const pdfjsVersion = '3.11.174';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;

const HomePage = () => {
  const [docs, setDocs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState(null);
  const [docDetails, setDocDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [memoryStats, setMemoryStats] = useState({
    used: 0,
    total: 0,
    percentage: 0
  });
  const [pdfUrl, setPdfUrl] = useState('');
  const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
  const [selectedComment, setSelectedComment] = useState('');
  const [isLogsModalVisible, setIsLogsModalVisible] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);

  // Memoize the worker configuration to prevent unnecessary reloads
  const pdfOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/standard_fonts/`,
    httpHeaders: {
      'Origin': window.location.origin
    }
  }), []);

  // Add useEffect to fetch memory stats
  useEffect(() => {
    const fetchMemoryStats = async () => {
      try {
        const response = await fetch(`${backend}/post_docs/storage`, {
          credentials: 'include',
          headers: { 'Origin': window.location.origin }
        });
        if (response.ok) {
          const data = await response.json();
          setMemoryStats({
            used: data.totalUsage,
            total: data.storageLimit,
            percentage: (data.totalUsage / data.storageLimit) * 100
          });
        }
      } catch (error) {
        console.error('Error fetching memory stats:', error);
      }
    };

    fetchMemoryStats();
    const interval = setInterval(fetchMemoryStats, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Format storage values that we receive in MB → display MB or GB nicely
  const formatStorage = (mb) => {
    const value = Number(mb) || 0;
    if (value >= 1024) return `${(value / 1024).toFixed(1)} GB`;
    return `${value.toFixed(2)} MB`;
  };

  // Optional: user activity stats
  const [userStats, setUserStats] = useState({
    totalDocuments: 0,
    uploads7d: 0,
    downloads7d: 0,
    deletes7d: 0
  });

  // Try to fetch user statistics (graceful fallback if endpoint not available)
  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const res = await fetch(`${backend}/api/statistics/user_stats`, {
          credentials: 'include',
          headers: { 'Origin': window.location.origin }
        });
        if (!res.ok) return; // keep defaults
        const data = await res.json();
        setUserStats({
          totalDocuments: Number(data.totalDocuments) || 0,
          uploads7d: Number(data.uploads7d) || 0,
          downloads7d: Number(data.downloads7d) || 0,
          deletes7d: Number(data.deletes7d) || 0
        });
      } catch (e) {
        // Silent fallback
      }
    };
    fetchUserStats();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null); 

      try {
        console.log("HomePage.js: Verificăm starea sesiunii...");
        // Verificăm dacă există o sesiune validă
        const roleResponse = await fetch(`${backend}/admin`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Origin': window.location.origin }
        });
        
        if (!roleResponse.ok) {
          console.error("HomePage.js: Session check failed:", await roleResponse.text());
          throw new Error('Session check failed');
        }
        
        const role = await roleResponse.json();
        console.log("HomePage.js: Confirmed user role:", role);
        
        // Acum încercăm să obținem documentele
        console.log("HomePage.js: Fetching frequently used documents...");
        const frequentlyUsedResponse = await fetch(
          `${backend}/FrequentlyUsed`,
          { 
            method: 'GET', 
            credentials: 'include',
            headers: {
              "Origin": window.location.origin
            }
          }
        );

        console.log("HomePage.js: Response status:", frequentlyUsedResponse.status);
        if (!frequentlyUsedResponse.ok) {
          const errorText = await frequentlyUsedResponse.text();
          console.error("HomePage.js: Error response:", errorText);
          throw new Error('Failed to fetch frequently used documents');
        }

        const frequentlyUsedDocs = await frequentlyUsedResponse.json();
        console.log("HomePage.js: Frequently used docs:", frequentlyUsedDocs);
        console.log("HomePage.js: Docs type:", typeof frequentlyUsedDocs);
        console.log("HomePage.js: Is array?", Array.isArray(frequentlyUsedDocs));
        
        if (Array.isArray(frequentlyUsedDocs)) {
          setDocs(frequentlyUsedDocs);
        } else {
          console.error("HomePage.js: Expected array but got:", typeof frequentlyUsedDocs);
          setDocs([]);
        }
      } catch (error) {
        console.error("HomePage.js: Error during fetch:", error);
        setError(error.message || 'An error occurred');
        setDocs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchPdfUrl = async (docPath, docName) => {
    try {
      const normalizedPath = docPath.replace(/^\/+/, '');
      const pathParts = normalizedPath.split('/');
      const directoryName = pathParts[pathParts.length - 2] || '';
      
      // Try the most reliable path first
      const primaryPath = `${backend}/post_docs/download/${docName}`;
      
      try {
        const response = await fetch(primaryPath, {
          credentials: 'include',
          headers: {
            'Accept': 'application/pdf',
            'Origin': window.location.origin
          }
        });

        if (response.ok) {
          const blob = await response.blob();
          if (blob.type === 'application/pdf') {
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            setPageNumber(1);
            return url;
          }
        }
      } catch (error) {
        console.log('Primary path failed, trying alternatives...');
      }

      // If primary path fails, try alternative paths
      const alternativePaths = [
        `${backend}/direct-pdf/${directoryName}/${docName}`,
        `${backend}/pdfs/uploads/${directoryName}/${docName}`,
        `${backend}/find-pdf/${docName}`
      ];

      for (const path of alternativePaths) {
        try {
          const response = await fetch(path, {
            credentials: 'include',
            headers: {
              'Accept': 'application/pdf',
              'Origin': window.location.origin
            }
          });

          if (!response.ok) continue;

          const blob = await response.blob();
          if (blob.type === 'application/pdf') {
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            setPageNumber(1);
            return url;
          }
        } catch (error) {
          console.log(`Error fetching from ${path}:`, error);
        }
      }

      throw new Error(`Failed to fetch PDF for document: ${docName}`);
    } catch (error) {
      console.error('Error in fetchPdfUrl:', error);
      setPdfError(`Failed to load PDF: ${error.message}`);
      return null;
    }
  };

  const handleDocumentClick = async (doc) => {
    setSelectedDoc(doc);
    setIsModalVisible(true);
    setIsLoadingDetails(true);
    
    try {
      // Fetch document details
      const response = await fetch(`${backend}/post_docs/details/${doc.nom_document}`, {
        credentials: 'include',
        headers: { 'Origin': window.location.origin }
      });
      
      if (response.ok) {
        const details = await response.json();
        if (details.success) {
          setDocDetails(details.document);
          
          // After getting details, fetch the PDF
          await fetchPdfUrl(doc.path || '', doc.nom_document);
          
          // Log document view
          await fetch(`${backend}/document_log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nom_doc: doc.nom_document }),
            credentials: 'include'
          });
        } else {
          console.error('Failed to fetch document details:', details.error);
          message.error('Failed to load document details');
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch document details:', errorText);
        message.error('Failed to load document details');
      }
    } catch (error) {
      console.error('Error fetching document details:', error);
      message.error('Failed to load document details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedDoc(null);
    setPageNumber(1);
    setNumPages(null);
    setPdfError(null);
    setDocDetails(null);
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPdfError(null);
  };

  const onDocumentLoadError = useCallback((error) => {
    console.error('Error loading PDF:', error);
    setPdfError('Error loading PDF. Please try again later.');
    message.error('Failed to load PDF document');
    
    // Reset worker if terminated
    if (error.message === 'Worker was terminated') {
      // Reinitialize the worker
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;
      message.info('Attempting to reload PDF viewer...');
      // Force a re-render of the Document component
      setSelectedDoc(prev => ({...prev}));
    }
  }, []);

  // Cleanup function to revoke object URLs when component unmounts or document changes
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleDownload = async () => {
    try {
      if (!selectedDoc) return;

      const response = await fetch(`${backend}/post_docs/download/${selectedDoc.nom_document}`, {
        credentials: 'include',
        headers: { 'Origin': window.location.origin }
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedDoc.originalName || selectedDoc.nom_document;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      message.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      message.error('Failed to download file');
    }
  };

  const handleCommentClick = (comment) => {
    setSelectedComment(comment);
    setIsCommentModalVisible(true);
  };

  const fetchLogs = async (page = 1) => {
    setIsLoadingLogs(true);
    try {
      const response = await fetch(`${backend}/api/statistics/user_logs?page=${page}&limit=20`, {
        credentials: 'include',
        headers: { 'Origin': window.location.origin }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setLogsTotalPages(data.pagination.totalPages);
        setLogsPage(page);
      } else {
        console.error('Failed to fetch logs');
        message.error('Failed to load activity logs');
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      message.error('Failed to load activity logs');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleLogsClick = () => {
    setIsLogsModalVisible(true);
    fetchLogs(1);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-white via-purple-50/10 to-indigo-50/5 relative overflow-hidden"
    >
      {/* Elegant Background Patterns */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Subtle geometric patterns */}
        <div className="absolute top-20 left-20 w-64 h-64 opacity-6">
          <div className="w-full h-full border border-purple-300 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 w-32 h-32 border border-purple-200 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        
        {/* Floating dots pattern */}
        <div className="absolute top-40 right-32 w-96 h-64 opacity-10">
          <div className="w-4 h-4 bg-purple-300 rounded-full absolute top-0 left-0"></div>
          <div className="w-3 h-3 bg-purple-200 rounded-full absolute top-16 left-20"></div>
          <div className="w-2 h-2 bg-purple-100 rounded-full absolute top-32 left-8"></div>
          <div className="w-3 h-3 bg-purple-200 rounded-full absolute top-48 left-32"></div>
          <div className="w-4 h-4 bg-purple-300 rounded-full absolute top-64 left-16"></div>
        </div>
        
        {/* Subtle flow lines */}
        <div className="absolute top-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-200/25 to-transparent"></div>
        <div className="absolute top-2/3 right-0 w-px h-32 bg-gradient-to-b from-transparent via-purple-200/25 to-transparent"></div>
        
        {/* Elegant curved elements */}
        <div className="absolute bottom-20 left-1/4 w-48 h-48 opacity-6">
          <div className="w-full h-full border-2 border-purple-200 rounded-full transform rotate-45"></div>
        </div>
        
        {/* Additional subtle elements */}
        <div className="absolute top-1/2 left-1/3 w-24 h-24 opacity-4">
          <div className="w-full h-full bg-gradient-to-br from-purple-200 to-indigo-200 rounded-full blur-sm"></div>
        </div>
        
        <div className="absolute bottom-1/3 right-1/4 w-32 h-32 opacity-4">
          <div className="w-full h-full bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full blur-sm"></div>
        </div>
      </div>

      <div className="w-full px-8 py-6 relative z-10">
        {/* Modern Welcome Header */}
        <motion.div initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="bg-gradient-to-br from-white via-purple-50/30 to-indigo-50/20 rounded-3xl shadow-2xl border border-purple-100/50 p-8 mb-8 relative overflow-hidden">
            {/* Subtle background pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200/20 to-indigo-200/20 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-200/20 to-purple-200/20 rounded-full blur-xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    RR
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-indigo-600 mb-1">
                      Bine ai revenit, Raul!
                    </h1>
                    <p className="text-gray-600 text-lg">Scoala Dabuleni • {new Date().toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{userStats.totalDocuments}</div>
                    <div className="text-sm text-gray-500">Documente</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">{userStats.uploads7d}</div>
                    <div className="text-sm text-gray-500">Upload-uri săptămâna</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">{Math.round(memoryStats.percentage)}%</div>
                    <div className="text-sm text-gray-500">Spațiu utilizat</div>
                  </div>
                </div>
              </div>
              
              {/* Storage Progress - Modern Design */}
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">Spațiu de stocare</h3>
                    <p className="text-sm text-gray-600">Utilizare curentă a spațiului alocat</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-600">{formatStorage(memoryStats.used)}</div>
                    <div className="text-sm text-gray-500">din {formatStorage(memoryStats.total)}</div>
                  </div>
                </div>
                
                {/* Modern Progress Bar */}
                <div className="relative">
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(memoryStats.percentage, 100)}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className={`h-full rounded-full ${
                        memoryStats.percentage > 90 
                          ? 'bg-gradient-to-r from-red-500 to-red-600' 
                          : memoryStats.percentage > 70 
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                          : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                      } shadow-lg`}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>0%</span>
                    <span className="font-medium">{Math.round(memoryStats.percentage)}% utilizat</span>
                    <span>100%</span>
                  </div>
                </div>
                
                {/* Storage Status */}
                {memoryStats.percentage > 90 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <ExclamationCircleOutlined className="text-red-500" />
                      <span className="text-red-700 text-sm font-medium">Spațiu aproape epuizat! Consideră să eliberezi spațiu.</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid - Chakra */}
        <Grid templateColumns={{ base: '1fr', xl: '2fr 1fr' }} gap={8} mb={8} templateRows="1fr">

          {/* Left Column - User & Institution Profile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          >
          <Box bg="white" rounded="2xl" shadow="xl" borderWidth="1px" borderColor="gray.200" p={{ base: 6, md: 8 }} minH="600px">
              {/* Header with User Avatar & Institution */}
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={8}>
                {/* User Profile Section */}
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    RR
                  </div>
                <div>
                    <Title level={2} className="!mb-1 text-2xl bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-indigo-600">
                      Raul Rusescu
                  </Title>
                    <p className="text-gray-600 mb-2">raulrusescu@gmail.com</p>
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium border border-purple-200">
                        <UserOutlined className="w-3 h-3 mr-1" />
                        Utilizator
                </div>
              </div>
              </div>
                </div>

                {/* Institution Info */}
                <Box>
                  <Box bg="gray.50" rounded="xl" p={6} borderWidth="1px" borderColor="gray.200">
                    <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                      <Box>
                        <CText color="gray.500" fontSize="sm">Email</CText>
                        <CText fontWeight="semibold">scoaladabuleni@gmail.com</CText>
                      </Box>
                      <Box>
                        <CText color="gray.500" fontSize="sm">Membri activi</CText>
                        <CText fontWeight="semibold">4 utilizatori</CText>
                      </Box>
                    </SimpleGrid>
                  </Box>
                </Box>
              </SimpleGrid>

              {/* Activitate recentă */}
              <Box>
                <div className="flex items-center justify-between mb-4">
                  <Heading as="h3" size="md" color="gray.800">Activitate recentă</Heading>
                  <Button 
                    size="sm"
                    onClick={handleLogsClick}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-xs"
                  >
                    Vezi loguri
                  </Button>
                </div>
                <SimpleGrid columns={{ base: 2, lg: 4 }} spacing={4}>
                  {[{
                    label: 'Documente', value: userStats.totalDocuments, icon: <FileOutlined />, tone: 'text-blue-600', bg: 'bg-blue-50'
                  }, {
                    label: 'Upload-uri (7z)', value: userStats.uploads7d, icon: <UploadOutlined />, tone: 'text-emerald-600', bg: 'bg-emerald-50'
                  }, {
                    label: 'Downloads (7z)', value: userStats.downloads7d, icon: <DownloadOutlined />, tone: 'text-indigo-600', bg: 'bg-indigo-50'
                  }, {
                    label: 'Ștergeri (7z)', value: userStats.deletes7d, icon: <DeleteOutlined />, tone: 'text-rose-600', bg: 'bg-rose-50'
                  }].map((k) => (
                    <Box key={k.label} bg="white" rounded="xl" p={4} textAlign="center" borderWidth="1px" borderColor="gray.200" shadow="sm">
                      <Box w={10} h={10} rounded="xl" mx="auto" mb={3} className={`${k.bg} ${k.tone} flex items-center justify-center`}>
                        {k.icon}
                      </Box>
                      <Heading size="md" className={k.tone}>{k.value ?? 0}</Heading>
                      <CText fontSize="sm" color="gray.500" mt={1}>{k.label}</CText>
                    </Box>
                  ))}
                </SimpleGrid>
              </Box>

              {/* Warning for storage overflow */}
              {Math.round(memoryStats.percentage * 10) / 10 > 100 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-red-50 rounded-2xl border border-red-200"
                >
                  <div className="flex items-center">
                    <ExclamationCircleOutlined className="text-red-500 text-xl mr-3" />
                    <Text className="text-red-600 font-medium">
                      Depășire limită de stocare! Vă rugăm să eliberați spațiu pentru a continua încărcarea.
                    </Text>
                  </div>
                </motion.div>
              )}

              {/* Documents Section - Moved to Left Column */}
              <Box mt={8}>
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                      <FolderOutlined className="text-white text-sm" />
                </div>
                    <Heading as="h3" size="md" color="gray.800">Documentele tale</Heading>
                  </div>
                  <Button 
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                  >
                    Vezi toate
                  </Button>
              </div>

              {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array(4).fill(0).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                        <Card className="h-32 bg-gradient-to-br from-gray-50 to-white rounded-xl">
                        <Spin />
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : error ? (
                <Card className="bg-red-50 border border-red-200 rounded-xl">
                  <Text type="danger">{error}</Text>
                </Card>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {docs.slice(0, 4).map((doc, index) => (
                    <motion.div
                      key={index}
                        initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + index * 0.1 }}
                        whileHover={{ y: -2, scale: 1.01 }}
                        className="group"
                    >
                      <Card 
                          className="group hover:shadow-[0_8px_30px_rgba(139,92,246,0.15)] transition-all duration-300 cursor-pointer border border-gray-200/60 hover:border-purple-300/60 rounded-xl shadow-[0_2px_12px_rgba(139,92,246,0.06)]"
                        onClick={() => handleDocumentClick(doc)}
                      >
                        <div className="p-4">
                            {/* Header with icon and badge */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                <FileOutlined className="text-purple-600 text-sm" />
                              </div>
                              <div className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
                                {doc.type || 'PDF'}
                              </div>
                          </div>
                          
                            {/* Document title */}
                          <Tooltip title={doc.originalName || doc.nom_document}>
                              <Title level={5} ellipsis className="!mb-2 text-gray-900 group-hover:text-purple-700 transition-colors">
                              {doc.originalName || doc.nom_document || 'Untitled Document'}
                            </Title>
                          </Tooltip>
                          
                            {/* Stats section */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <div className="flex items-center gap-1">
                                <EyeOutlined className="text-gray-400 text-xs" />
                                <Text className="text-gray-600 text-xs">
                                  {doc.openCount} vizualizări
                              </Text>
                            </div>
                              <Text className="text-xs text-gray-500">
                                {new Date(doc.lastOpened).toLocaleDateString('ro-RO')}
                              </Text>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
              </Box>
            </Box>
          </motion.div>

          {/* Right Column - Storage & Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Box bg="white" rounded="2xl" shadow="xl" borderWidth="1px" borderColor="gray.200" p={6} minH="600px">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <DatabaseOutlined className="text-white text-sm" />
            </div>
                  <Heading as="h3" size="md" color="gray.800">Spațiu utilizat</Heading>
                </div>
                
                {/* Modern Storage Visual */}
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-purple-100">
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-purple-600 mb-1">{formatStorage(memoryStats.used)}</div>
                    <div className="text-sm text-gray-600">din {formatStorage(memoryStats.total)} total</div>
                  </div>
                  
                  {/* Modern Progress Ring */}
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-gray-200"
                      />
                      <motion.circle
                        cx="60"
                        cy="60"
                        r="50"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        className={`${
                          memoryStats.percentage > 90 
                            ? 'text-red-500' 
                            : memoryStats.percentage > 70 
                            ? 'text-yellow-500'
                            : 'text-purple-500'
                        }`}
                        strokeDasharray={`${2 * Math.PI * 50}`}
                        strokeDashoffset={`${2 * Math.PI * 50 * (1 - memoryStats.percentage / 100)}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - memoryStats.percentage / 100) }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-800">{Math.round(memoryStats.percentage)}%</div>
                        <div className="text-xs text-gray-500">utilizat</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Storage Status */}
                  <div className="text-center">
                    {memoryStats.percentage > 90 ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        Spațiu critic
                      </div>
                    ) : memoryStats.percentage > 70 ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        Spațiu moderat
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Spațiu disponibil
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <Box mt={4}>
                  <Heading as="h4" size="sm" color="gray.700" mb={3}>Acțiuni rapide</Heading>
                  
                  <Button className="w-full justify-start" type="text">
                    <FileOutlined className="mr-2" />
                    Vezi toate documentele
                  </Button>
                  
                  <Button className="w-full justify-start" type="text">
                    <UploadOutlined className="mr-2" />
                    Încarcă documente
                  </Button>
                  
                  <Button className="w-full justify-start" type="text">
                    <BarChartOutlined className="mr-2" />
                    Statistici detaliate
                  </Button>
                </Box>

                {/* Institution Summary - Modern Design */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                      <UserOutlined className="text-white text-sm" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800">Instituția mea</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Nume instituție</p>
                          <p className="font-semibold text-gray-800">Scoala Dabuleni</p>
                        </div>
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <FolderOutlined className="text-purple-600" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Membri activi</p>
                          <p className="font-semibold text-gray-800">4 utilizatori</p>
                        </div>
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <UserOutlined className="text-emerald-600" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Rolul meu</p>
                          <p className="font-semibold text-indigo-600">Utilizator</p>
                        </div>
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <UserOutlined className="text-indigo-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </Box>
        </motion.div>
        </Grid>

      </div>

        {/* Comment Modal */}
        <Modal
          open={isCommentModalVisible}
          onCancel={() => setIsCommentModalVisible(false)}
          footer={null}
          width={600}
          centered
          className="comment-modal"
          closable={false}
          maskClosable={true}
          styles={{
            mask: {
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(5px)'
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
              <div className="flex items-center">
                <motion.div
                  whileHover={{ rotate: 5 }}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-full mr-3"
                >
                  <FileTextOutlined className="text-white text-xl" />
                </motion.div>
                <Title level={4} className="!mb-0 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                  Document Comment
                </Title>
              </div>
              <motion.div
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button 
                  icon={<CloseOutlined />} 
                  onClick={() => setIsCommentModalVisible(false)}
                  className="bg-red-500 border-0 text-white shadow-lg"
                />
              </motion.div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl">
              <Text className="text-gray-700 whitespace-pre-wrap">
                {selectedComment}
              </Text>
            </div>
          </motion.div>
        </Modal>

        {/* PDF Viewer Modal */}
        <Modal
          open={isModalVisible}
          onCancel={handleCloseModal}
          footer={null}
          width={1000}
          centered
          className="pdf-viewer-modal"
          closable={false}
          maskClosable={true}
          style={{ maxHeight: '90vh' }}
          styles={{
            body: { padding: '24px' },
            mask: {
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(5px)'
            }
          }}
        >
          {selectedDoc && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col h-full"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                <div className="flex items-center">
                  <motion.div
                    whileHover={{ rotate: 5 }}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-full mr-3"
                  >
                    <FileOutlined className="text-white text-xl" />
                  </motion.div>
                  <Title level={4} className="!mb-0 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                    {selectedDoc.originalName || selectedDoc.nom_document}
                  </Title>
                </div>
                <div className="flex items-center space-x-3">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      icon={<DownloadOutlined />} 
                      onClick={handleDownload}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 border-0 text-white shadow-lg"
                    >
                        Descărcă
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      icon={<PrinterOutlined />}
                      className="bg-gradient-to-r from-gray-500 to-gray-600 border-0 text-white shadow-lg"
                    >
                      Imprimă
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Button 
                      icon={<CloseOutlined />} 
                      onClick={handleCloseModal}
                      className="bg-red-500 border-0 text-white shadow-lg"
                    />
                  </motion.div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-6">
                <div className="col-span-1">
                  {isLoadingDetails ? (
                    <div className="flex justify-center items-center h-full">
                      <Spin size="large" />
                    </div>
                  ) : docDetails ? (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="space-y-6"
                    >
                      <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl shadow-sm">
                        <Text strong className="block mb-2 text-gray-600">Tip:</Text>
                        <Badge 
                          color="blue" 
                          text={selectedDoc.type} 
                          className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full"
                        />
                      </div>

                      {docDetails.tags && docDetails.tags.length > 0 && (
                        <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl shadow-sm">
                          <Text strong className="block mb-2 text-gray-600">Tags:</Text>
                          <div className="flex flex-wrap gap-2">
                            {docDetails.tags.map((tag, index) => (
                              <motion.div
                                key={index}
                                whileHover={{ scale: 1.05 }}
                              >
                                <Tag color="blue" className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
                                  {tag.tag_name}
                                </Tag>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {docDetails.comment && (
                        <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl shadow-sm">
                          <Text strong className="block mb-2 text-gray-600">Comentariu:</Text>
                          <div className="relative">
                            <Text className="text-gray-700 line-clamp-3">
                              {docDetails.comment}
                            </Text>
                            {docDetails.comment.length > 150 && (
                              <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="absolute bottom-0 right-0"
                              >
                                <Button 
                                  type="link" 
                                  onClick={() => handleCommentClick(docDetails.comment)}
                                  className="text-blue-500 hover:text-blue-600"
                                >
                                  Read more
                                </Button>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      )}

                      {docDetails.keywords && docDetails.keywords.length > 0 && (
                        <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl shadow-sm">
                          <Text strong className="block mb-2 text-gray-600">Keywords:</Text>
                          <div className="flex flex-wrap gap-2">
                            {docDetails.keywords.map((keyword, index) => (
                              <motion.div
                                key={index}
                                whileHover={{ scale: 1.05 }}
                              >
                                <Tag color="green" className="bg-green-50 text-green-600 px-3 py-1 rounded-full">
                                  {keyword}
                                </Tag>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl shadow-sm">
                        <Text strong className="block mb-2 text-gray-600">Statistics:</Text>
                        <div className="space-y-3">
                          <div className="flex items-center">
                            <motion.div
                              whileHover={{ scale: 1.2 }}
                              className="bg-blue-50 p-1 rounded-full mr-2"
                            >
                              <EyeOutlined className="text-blue-500" />
                            </motion.div>
                            <Text className="text-gray-700">
                              {selectedDoc.openCount} {selectedDoc.openCount === 1 ? 'view' : 'views'}
                            </Text>
                          </div>
                          <div className="flex items-center">
                            <motion.div
                              whileHover={{ scale: 1.2 }}
                              className="bg-purple-50 p-1 rounded-full mr-2"
                            >
                              <ClockCircleOutlined className="text-purple-500" />
                            </motion.div>
                            <Text className="text-gray-700">
                              Last opened: {new Date(selectedDoc.lastOpened).toLocaleDateString()}
                            </Text>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <Text type="secondary">No additional details available</Text>
                  )}
                </div>

                <div className="col-span-3">
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 shadow-sm">
                    {pdfError ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center p-6"
                      >
                        <div className="bg-red-50 p-4 rounded-xl mb-4">
                          <Text type="danger" className="text-lg">{pdfError}</Text>
                        </div>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button 
                            type="primary" 
                            onClick={() => setPdfError(null)}
                            className="bg-gradient-to-r from-blue-500 to-purple-500 border-0 shadow-lg"
                          >
                            Try Again
                          </Button>
                        </motion.div>
                      </motion.div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Document
                          file={pdfUrl}
                          onLoadSuccess={onDocumentLoadSuccess}
                          onLoadError={onDocumentLoadError}
                          loading={
                            <div className="flex flex-col items-center justify-center h-64">
                              <Spin size="large" />
                              <Text className="mt-4 text-gray-600">Loading PDF...</Text>
                            </div>
                          }
                          options={pdfOptions}
                        >
                          <Page 
                            pageNumber={pageNumber} 
                            width={600}
                            loading={
                              <div className="flex flex-col items-center justify-center h-64">
                                <Spin size="large" />
                                <Text className="mt-4 text-gray-600">Loading page...</Text>
                              </div>
                            }
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                            onRenderError={(error) => {
                              console.error('Error rendering page:', error);
                              message.error('Error rendering PDF page');
                            }}
                          />
                        </Document>
                        
                        {numPages && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-center mt-4 space-x-4"
                          >
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Button 
                                icon={<LeftOutlined />} 
                                disabled={pageNumber <= 1}
                                onClick={() => setPageNumber(pageNumber - 1)}
                                className="bg-gradient-to-r from-blue-500 to-purple-500 border-0 text-white shadow-lg"
                              />
                            </motion.div>
                            <Text className="text-gray-600">
                              Page {pageNumber} of {numPages}
                            </Text>
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Button 
                                icon={<RightOutlined />} 
                                disabled={pageNumber >= numPages}
                                onClick={() => setPageNumber(pageNumber + 1)}
                                className="bg-gradient-to-r from-blue-500 to-purple-500 border-0 text-white shadow-lg"
                              />
                            </motion.div>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </Modal>

        {/* Activity Logs Modal */}
        <Modal
          open={isLogsModalVisible}
          onCancel={() => setIsLogsModalVisible(false)}
          footer={null}
          width={800}
          centered
          className="logs-modal"
          closable={false}
          maskClosable={true}
          styles={{
            mask: {
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(5px)'
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
              <div className="flex items-center">
                <motion.div
                  whileHover={{ rotate: 5 }}
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 p-2 rounded-full mr-3"
                >
                  <BarChartOutlined className="text-white text-xl" />
                </motion.div>
                <Title level={4} className="!mb-0 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
                  Loguri de Activitate
                </Title>
      </div>
              <motion.div
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button 
                  icon={<CloseOutlined />} 
                  onClick={() => setIsLogsModalVisible(false)}
                  className="bg-red-500 border-0 text-white shadow-lg"
                />
              </motion.div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isLoadingLogs ? (
                <div className="flex justify-center items-center h-32">
                  <Spin size="large" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8">
                  <Text type="secondary">Nu există loguri de activitate</Text>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-gradient-to-r from-gray-50 to-white p-4 rounded-xl border border-gray-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-2 h-2 rounded-full ${
                              log.source === 'user_action' ? 'bg-blue-500' : 'bg-purple-500'
                            }`}></div>
                            <Text strong className="text-gray-800">
                              {log.action.replace(/_/g, ' ')}
                            </Text>
                            <Badge 
                              color={log.source === 'user_action' ? 'blue' : 'purple'}
                              text={log.source === 'user_action' ? 'Utilizator' : 'Document'}
                            />
                          </div>
                          <Text className="text-gray-600 text-sm mb-1">
                            {log.details}
                          </Text>
                          <Text className="text-gray-400 text-xs">
                            {new Date(log.created_at).toLocaleString('ro-RO')}
                          </Text>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {logsTotalPages > 1 && (
              <div className="flex justify-center items-center mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <Button 
                    disabled={logsPage === 1}
                    onClick={() => fetchLogs(logsPage - 1)}
                    icon={<LeftOutlined />}
                    size="small"
                  />
                  <Text className="mx-4">
                    Pagina {logsPage} din {logsTotalPages}
                  </Text>
                  <Button 
                    disabled={logsPage === logsTotalPages}
                    onClick={() => fetchLogs(logsPage + 1)}
                    icon={<RightOutlined />}
                    size="small"
                  />
                </div>
              </div>
            )}
          </motion.div>
        </Modal>
    </motion.div>
  );
};

export default HomePage;
