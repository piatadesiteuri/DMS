import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaTrash, FaEye, FaDownload, FaTags, FaCalendarAlt, FaFilter, FaTimes, FaUser, FaFolder } from 'react-icons/fa';
import { DatePicker } from 'antd';
import moment from 'moment';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Input,
  Select,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Flex,
  useColorModeValue,
  Badge,
  IconButton,
  VStack,
  HStack,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Divider,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Tag,
  InputGroup,
  InputLeftElement,
  Collapse,
  SimpleGrid,
  ModalFooter,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, DownloadIcon   } from '@chakra-ui/icons';
import { Modal as AntModal, Button as AntButton, Typography, Space, Spin, Badge as AntBadge } from 'antd';
import { DownloadOutlined, PrinterOutlined, CloseOutlined, LeftOutlined, RightOutlined, EyeOutlined, FileOutlined, ClockCircleOutlined } from '@ant-design/icons';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command"
import { Check, ChevronsUpDown, MessageSquare, History } from "lucide-react"
import { cn } from "../ui/utils"
import { Button as ChakraButton } from "../ui/button"
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel, flexRender } from '@tanstack/react-table';
import axios from 'axios';
import { useToast as useChakraToast } from '@chakra-ui/react';
import config from '../config';
import { backend } from '../config';

const { Title } = Typography;
const { RangePicker } = DatePicker;

// Set the worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;


// Define MotionBox component
const MotionBox = motion(Box);

// Define the addWatermarkToPDF function
const addWatermarkToPDF = async (blob) => {
  // Implementation of watermarking logic
  return blob;
};

const SearchPage = () => {
  const navigate = useNavigate();

  // Add toast hook
  const toast = useChakraToast();

  // Add state for current user info
  const [currentUser, setCurrentUser] = useState(null);

  // Function to fetch current user info
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(`${backend}/api/user/user_info`, {
        credentials: 'include',
        headers: {
          'Origin': window.location.origin
        }
      });
      const data = await response.json();
      setCurrentUser(data);
      console.log('👤 Current user info:', data);
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  // Function to check if current user is the document owner
  const isDocumentOwner = (doc) => {
    if (!currentUser || !doc) return false;
    
    // Check if the document author matches current user
    const currentUserName = `${currentUser.userName || ''}`.trim();
    const documentAuthor = `${doc.prenom || ''} ${doc.nom || ''}`.trim();
    
    return currentUserName === documentAuthor;
  };

  // Add custom CSS for slider and modern date picker
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .slider::-webkit-slider-thumb {
        appearance: none;
        height: 16px;
        width: 16px;
        border-radius: 50%;
        background: #3B82F6;
        cursor: pointer;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        transition: all 0.2s ease;
      }
      
      .slider::-webkit-slider-thumb:hover {
        background: #2563EB;
        transform: scale(1.1);
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      }
      
      .slider::-moz-range-thumb {
        height: 16px;
        width: 16px;
        border-radius: 50%;
        background: #3B82F6;
        cursor: pointer;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        transition: all 0.2s ease;
      }
      
      .slider::-moz-range-thumb:hover {
        background: #2563EB;
        transform: scale(1.1);
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      }
      
      .slider:focus {
        outline: none;
      }
      
      .slider:focus::-webkit-slider-thumb {
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
      }

      /* Modern Date Picker Styles */
      .modern-date-picker .ant-picker {
        border-radius: 8px !important;
        border: 1px solid #E2E8F0 !important;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1) !important;
        transition: all 0.2s ease !important;
      }

      .modern-date-picker .ant-picker:hover {
        border-color: #3B82F6 !important;
        box-shadow: 0 4px 12px 0 rgba(59, 130, 246, 0.15) !important;
      }

      .modern-date-picker .ant-picker-focused {
        border-color: #3B82F6 !important;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
      }

      .modern-date-picker .ant-picker-input input {
        font-size: 14px !important;
        color: #374151 !important;
      }

      .modern-date-picker .ant-picker-input input::placeholder {
        color: #9CA3AF !important;
      }

      .modern-date-picker .ant-picker-suffix {
        color: #6B7280 !important;
      }

      .modern-date-picker .ant-picker-clear {
        background: #F3F4F6 !important;
        border-radius: 50% !important;
      }

      /* Dropdown styles */
      .ant-picker-dropdown {
        border-radius: 12px !important;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
        border: 1px solid #E5E7EB !important;
      }

      .ant-picker-ranges {
        border-bottom: 1px solid #F3F4F6 !important;
      }

      .ant-picker-ranges .ant-picker-preset {
        padding: 8px 12px !important;
        border-radius: 6px !important;
        margin: 4px !important;
        transition: all 0.2s ease !important;
      }

      .ant-picker-ranges .ant-picker-preset:hover {
        background: #EBF8FF !important;
        color: #2563EB !important;
      }

      .ant-picker-cell-selected .ant-picker-cell-inner {
        background: #3B82F6 !important;
        border-radius: 6px !important;
      }

      .ant-picker-cell-in-range .ant-picker-cell-inner {
        background: #EBF8FF !important;
        border-radius: 0 !important;
      }

      .ant-picker-cell:hover .ant-picker-cell-inner {
        background: #DBEAFE !important;
        border-radius: 6px !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // **NO REQUEST MANAGEMENT** - Ultra simple approach

  // **SIMPLIFIED DOCUMENT LOADING** - No complex request management
  const loadAllDocuments = useCallback(async () => {
    try {
      const response = await fetch(`${backend}/search`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          name: '',
          type: '',
          keyword: '',
          author: '',
          startDate: '',
          endDate: ''
        })
      });

      if (!response.ok) return;
      
      const searchData = await response.json();
      const documents = Array.isArray(searchData) ? searchData : (searchData.documents || []);
      
      if (documents && documents.length > 0) {
        const processedDocuments = documents.map(doc => ({
          ...doc,
          tags: doc.tags || [],
          commentaire: doc.comment || '',
          keywords: [doc.mot1, doc.mot2, doc.mot3, doc.mot4, doc.mot5].filter(k => k && k.trim() !== ''),
          type_name: doc.type_name || doc.type || 'Unknown',
          realname: doc.nom_document_original || doc.nom_document,
          viewCount: 0,
          downloadCount: 0
        }));

        console.log('📚 Loaded all documents:', processedDocuments.length);
        setAllDocuments(processedDocuments); // Store all documents for local filtering
        setSearchClicked(true);
        setnofile(false);
      } else {
        setAllDocuments([]);
        setTableData([]);
        setSearchClicked(true);
        setnofile(true);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
      setAllDocuments([]);
      setTableData([]);
      setSearchClicked(true);
      setnofile(true);
    }
  }, []);



  // **SIMPLE INITIALIZATION** - No complex request management
  useEffect(() => {
    let isMounted = true;
    
    const initializeComponent = async () => {
      try {
        const response = await fetch(`${backend}/admin`, {
          credentials: 'include'
        });
        
        if (response.ok && isMounted) {
          setIsAuthenticated(true);
          loadAllDocuments();
        }
      } catch (error) {
        console.error("Error checking session:", error);
      }
    };

    initializeComponent();
    fetchCurrentUser(); // Fetch current user info
    
    return () => {
      isMounted = false;
    };
  }, [loadAllDocuments]);

  // **OPTIMIZED SEARCH FUNCTION** - With proper debouncing
  const performSearch = useCallback(async (searchParams) => {
    try {
      setIsLoading(true);
      
      let searchData;
      
      // Check if we have multiple authors selected - use special endpoint
      if (searchParams.selectedAuthors && searchParams.selectedAuthors.length > 0) {
        const response = await fetch(`${backend}/search/by-authors`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Origin': window.location.origin
          },
          body: JSON.stringify({
            authorIds: searchParams.selectedAuthors,
            name: searchParams.name || '',
            type_id: searchParams.type_id,
            keyword: searchParams.keyword || '',
            startDate: searchParams.startDate || '',
            endDate: searchParams.endDate || ''
          })
        });
        if (!response.ok) return;
        searchData = await response.json();
      }
      // Check if we have tags selected
      else if (searchParams.selectedTags && searchParams.selectedTags.length > 0) {
        const response = await fetch(`${backend}/search/by-tags`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Origin': window.location.origin
          },
          body: JSON.stringify({
            tagIds: searchParams.selectedTags,
            name: searchParams.name || '',
            type_id: searchParams.type_id,
            keyword: searchParams.keyword || '',
            startDate: searchParams.startDate || '',
            endDate: searchParams.endDate || ''
          })
        });
        if (!response.ok) return;
        searchData = await response.json();
      } 
      // Regular search
      else {
        const response = await fetch(`${backend}/search`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Origin': window.location.origin
          },
          body: JSON.stringify({
            name: searchParams.name || '',
            type_id: searchParams.type_id,
            keyword: searchParams.keyword || '',
            startDate: searchParams.startDate || '',
            endDate: searchParams.endDate || ''
          })
        });
        if (!response.ok) return;
        searchData = await response.json();
      }

      const documents = Array.isArray(searchData) ? searchData : (searchData.documents || []);
      
      if (documents && documents.length > 0) {
        const processedDocuments = documents.map(doc => ({
          ...doc,
          tags: doc.tags || [],
          commentaire: doc.comment || '',
          keywords: [doc.mot1, doc.mot2, doc.mot3, doc.mot4, doc.mot5].filter(k => k && k.trim() !== ''),
          type_name: doc.type_name || doc.type || 'Unknown',
          realname: doc.nom_document_original || doc.nom_document,
          viewCount: 0,
          downloadCount: 0
        }));

        setTableData(processedDocuments);
        setSearchClicked(true);
        setnofile(false);
      } else {
        setTableData([]);
        setSearchClicked(true);
        setnofile(true);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Search error:", error);
        setTableData([]);
        setSearchClicked(true);
        setnofile(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Simple search function - no complex debouncing
  const debouncedSearch = useCallback((searchParams) => {
    performSearch(searchParams);
  }, [performSearch]);

  // **LOAD AVAILABLE TAGS** - With proper request management
  const loadAvailableTags = useCallback(async () => {
    try {
      const response = await fetch(`${backend}/post_docs/tags`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        }
      });
      if (!response.ok) return;
      const tagsData = await response.json();
      
      // Ensure we always set an array to tags state
      if (Array.isArray(tagsData)) {
        setTags(tagsData);
      } else if (tagsData && typeof tagsData === 'object') {
        // If the API returns an object with tags inside a property
        if (tagsData.tags && Array.isArray(tagsData.tags)) {
          setTags(tagsData.tags);
        } else if (tagsData.success && Array.isArray(tagsData.data)) {
          setTags(tagsData.data);
        } else {
          // Try to convert the object to an array if possible
          const extractedTags = Object.values(tagsData).filter(item =>
            item && typeof item === 'object' && (item.id || item.id_tag || item.tag_id) && (item.name || item.tag_name)
          );
          setTags(extractedTags.length > 0 ? extractedTags : []);
        }
      } else {
        console.warn('Received non-array tags data:', typeof tagsData, tagsData);
        setTags([]); // Fallback to empty array
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error loading tags:', error);
        setTags([]);
      }
    }
  }, []);

  // State variables
  const [open, setOpen] = React.useState(false);
  const [openTags, setOpenTags] = React.useState(false);
  const [openDocTypes, setOpenDocTypes] = React.useState(false);
  const [openDateRange, setOpenDateRange] = React.useState(false);
  const [tableData, setTableData] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]); // Store all documents for local filtering
  const [searchQuery, setSearchQuery] = useState(''); // Local search query for instant filtering
  const [value, setValue] = React.useState("");
  const [searchClicked, setSearchClicked] = useState(false);
  const [nofile, setnofile] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [viewStatistics, setViewStatistics] = useState([]);

  const docNameRef = useRef(null);
  const keyWordRef = useRef(null);

  const diffuseRef = React.useRef([]);
  const checkRef = React.useRef([]);
  const uploadRef = React.useRef([]);
  const downloadRef = React.useRef([]);
  const printRef = React.useRef([]);
  const commentRef = React.useRef([]);
  const downloadButton = useRef([]);

  const [openUsr, setOpenUsr] = React.useState(false);
  const [usrArr, setUsrArr] = React.useState([]);
  const [users, setUsers] = React.useState([]);

  const [pdfUrl, setPdfUrl] = useState('');
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isOpen, setIsOpen] = useState(false);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  });

  const [sorting, setSorting] = useState([]);
  const [filtering, setFiltering] = useState('');

  // State for comments popup
  const [commentsPopupOpen, setCommentsPopupOpen] = useState(false);
  const [currentComments, setCurrentComments] = useState("");
  const [currentDocumentName, setCurrentDocumentName] = useState("");

  const [documentTypes, setDocumentTypes] = React.useState([]);
  const [isLoadingTypes, setIsLoadingTypes] = React.useState(false);
  const [selectedTypeId, setSelectedTypeId] = React.useState(null);

  const [tags, setTags] = React.useState([]);
  const [selectedTags, setSelectedTags] = React.useState([]);
  const [isTagSearchActive, setIsTagSearchActive] = React.useState(false);
  const [tagSearchTerm, setTagSearchTerm] = React.useState('');

  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [selectedRow, setSelectedRow] = React.useState(null);
  const [showCommentsModal, setShowCommentsModal] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);
  const [results, setResults] = React.useState([]);
  const [keywords, setKeywords] = useState("");

  // Add missing state variables
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 9; // 3x3 grid
  const [author, setAuthor] = React.useState('');
  const [globalSearch, setGlobalSearch] = React.useState('');

  // Add state for selected keywords
  const [selectedKeywords, setSelectedKeywords] = React.useState([]);
  const [availableKeywords, setAvailableKeywords] = React.useState([]);
  const [openKeywords, setOpenKeywords] = React.useState(false);

  // Add state for authors dropdown - similar to tags
  const [availableAuthors, setAvailableAuthors] = React.useState([]);
  const [openAuthors, setOpenAuthors] = React.useState(false);
  const [selectedAuthors, setSelectedAuthors] = React.useState([]);

  // Add new state for caching
  const [privilegesCache, setPrivilegesCache] = useState({});

  // Move useColorModeValue hook to the top level of the component
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardHoverBg = useColorModeValue('gray.50', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.400');

  // Add showAdvancedFilters state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Add loading state for document navigation
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationTimeout, setNavigationTimeout] = useState(null);

  // Close dropdowns on scroll
  useEffect(() => {
    const handleScroll = () => {
      // Close all dropdowns when scrolling
      setOpenDocTypes(false);
      setOpenTags(false);
      setOpenAuthors(false);
      setOpenKeywords(false);
      setOpenDateRange(false);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Cleanup navigation timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeout) {
        clearTimeout(navigationTimeout);
      }
    };
  }, [navigationTimeout]);

  // Debug Info Component
  const renderDebugInfo = (searchResults) => {
    return (
      <div className="bg-gray-100 p-4 mb-4 rounded">
        <h3 className="text-lg font-bold mb-2">Debug Info (SearchPage.js):</h3>
        <div><strong>Search Results Length:</strong> {searchResults ? searchResults.length : 'null'}</div>
        <div><strong>Search Results Content:</strong> <pre>{JSON.stringify(searchResults, null, 2)}</pre></div>
        <div><strong>Search Clicked:</strong> {searchClicked ? 'true' : 'false'}</div>
      </div>
    );
  };

  // Simple Search Results Component
  const SimpleSearchResults = ({ results, onView }) => {
    if (!results || results.length === 0) {
      return <p className="text-center p-4">Nu s-au găsit rezultate.</p>;
    }

    return (
      <div className="overflow-hidden bg-white shadow sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {results.map((doc, index) => (
            <li key={index} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex flex-col">
                    <h3 className="text-lg font-medium">{doc.realname || doc.nom_document_original || doc.nom_doc}</h3>
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Tip: {doc.type}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Data: {new Date(doc.date_ajout).toLocaleDateString()}</p>
                    {doc.commentaire && (
                      <p className="mt-2 text-sm text-gray-600">
                        Comentariu: {doc.commentaire}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onView(doc.path.replace(".", "") + "/" + (doc.nom_doc || doc.nom_document), (doc.nom_doc || doc.nom_document))}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  <FaEye className="w-4 h-4 mr-2" /> Vizualizare
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  async function diffuse(nom_doc, usrArr) {
    const response = await fetch(`${backend}/diffuser`, {
      method: 'POST',
      credentials: "include",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nom_doc: nom_doc,
        target: usrArr
      })
    });
  }

  // Add a cache for document details
  const documentDetailsCache = useRef({});

  // Helper function to fetch document statistics
  const fetchDocumentStatistics = useCallback(async (documents) => {
    try {
      const documentNames = documents.map(doc => doc.nom_document);
      
      // Fetch view counts from document_log
      const viewResponse = await fetch(`${backend}/document_log/batch`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({ documentNames })
      });

      // Fetch download counts from document_statistics
      const downloadResponse = await fetch(`${backend}/document_statistics/batch`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({ documentNames })
      });

      const viewStats = viewResponse.ok ? await viewResponse.json() : {};
      const downloadStats = downloadResponse.ok ? await downloadResponse.json() : {};

      return { viewStats, downloadStats };
    } catch (error) {
      console.error('Error fetching document statistics:', error);
      return { viewStats: {}, downloadStats: {} };
    }
  }, []);

  // Memoized function to fetch document details
  const fetchDocumentDetails = useCallback(async (documentNames) => {
    // Filter out documents we already have in cache
    const uncachedDocuments = documentNames.filter(name => !documentDetailsCache.current[name]);
    
    if (uncachedDocuments.length === 0) {
      return documentDetailsCache.current;
    }

    try {
      const response = await fetch(`${backend}/post_docs/batch-details`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          documentNames: uncachedDocuments
        })
      });
      
      if (response.ok) {
        const detailsData = await response.json();
        if (detailsData.success) {
          // Update cache with new details
          detailsData.documents.forEach(doc => {
            documentDetailsCache.current[doc.nom_document] = {
              ...doc,
              comment: doc.comment || '',
              nom_document_original: doc.nom_document_original || doc.nom_document
            };
          });
        }
      }
    } catch (error) {
      console.error('Error fetching document details:', error);
    }
    
    return documentDetailsCache.current;
  }, []);

  // REMOVED DUPLICATE - Using optimized version above

  // Update search function to use the same caching mechanism
  const search = useCallback(async () => {
    setIsLoading(true);
    try {
      let filteredResults = [];
      
      // Check if we have multiple authors selected - use special endpoint
      if (selectedAuthors && selectedAuthors.length > 0) {
        const response = await fetch(`${backend}/search/by-authors`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Origin': window.location.origin
          },
          body: JSON.stringify({
            authorIds: selectedAuthors,
            name: docNameRef.current?.value || '',
            type_id: selectedTypeId,
            keyword: keywords || '',
            startDate: startDate || '',
            endDate: endDate || ''
          })
        });

        if (!response.ok) {
          throw new Error('Search by authors request failed');
        }

        const results = await response.json();
        if (results.success) {
          filteredResults = results.documents || [];
        }
      }
      // Check if we have tags selected
      else if (selectedTags && selectedTags.length > 0) {
        const response = await fetch(`${backend}/search/by-tags`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Origin': window.location.origin
          },
          body: JSON.stringify({
            tagIds: selectedTags,
            name: docNameRef.current?.value || '',
            type_id: selectedTypeId,
            keyword: keywords || '',
            startDate: startDate || '',
            endDate: endDate || ''
          })
        });

        if (!response.ok) {
          throw new Error('Search by tags request failed');
        }

        const results = await response.json();
        if (results.success) {
          filteredResults = results.documents || [];
        }
      } 
      // Regular search
      else {
        const response = await fetch(`${backend}/search`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Origin': window.location.origin
          },
          body: JSON.stringify({
            name: docNameRef.current?.value || '',
            type_id: selectedTypeId,
            keyword: keywords || '',
            startDate: startDate || '',
            endDate: endDate || ''
          })
        });

        if (!response.ok) {
          throw new Error('Search request failed');
        }

        const results = await response.json();
        filteredResults = Array.isArray(results) ? results : (results.documents || []);
      }

        if (filteredResults.length > 0) {
        // Use the same caching mechanism for search results
        const documentDetails = await fetchDocumentDetails(filteredResults.map(doc => doc.nom_document));

        const processedDocuments = filteredResults.map(doc => {
          const details = documentDetails[doc.nom_document] || {};

          // Process tags
          let tags = [];
          if (doc.tags) {
            if (typeof doc.tags === 'string') {
              try {
                tags = JSON.parse(doc.tags);
              } catch (e) {
                console.error('Error parsing tags:', e);
                tags = [];
              }
            } else {
              tags = doc.tags;
            }
          }

          tags = Array.isArray(tags) ? tags.map(tag => ({
            id_tag: tag.id_tag || tag.id,
            tag_name: tag.tag_name || tag.name,
            is_predefined: tag.is_predefined || false,
            added_by: tag.added_by || null,
            added_date: tag.added_date || null
          })) : [];

          // Extract keywords from document
          const keywords = [
            doc.mot1,
            doc.mot2,
            doc.mot3,
            doc.mot4,
            doc.mot5
          ].filter(k => k && k.trim() !== '');

          // Get comments/description
          const commentaire = details.comment || '';

          return {
            ...doc,
            tags: tags,
            commentaire: commentaire,
            keywords: keywords,
            type_name: details.type_name || doc.type_name || doc.type || 'Unknown',
            realname: details.nom_document_original || doc.nom_document_original || doc.nom_document
          };
        });

        setTableData(processedDocuments);
        setSearchClicked(true);
        setnofile(false);
      } else {
        setTableData([]);
        setSearchClicked(true);
        setnofile(true);
      }
    } catch (error) {
      console.error("Search error:", error);
      setTableData([]);
      setSearchClicked(true);
      setnofile(true);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTags, selectedAuthors, selectedTypeId, keywords, startDate, endDate, fetchDocumentDetails]);

  // REMOVED DUPLICATE - Using optimized version above

  function setupuser(item) {
    return { value: item.id_user, label: item.nom + " " + item.prenom };
  }

  function filterBycheck(item) {
    if (item && item.checked) {
      return item.value;
    }
    return null;
  }

  function handleCheckboxChange(nom_doc) {
    const nA = checkRef.current.filter(filterBycheck);

    const newArray2 = nA.map((element, index) => ({
      id: element.value,
      download: (downloadRef.current.filter(filterBycheck)[index] == null ? false : true),
      upload: (uploadRef.current.filter(filterBycheck)[index] == null ? false : true),
      print: (printRef.current.filter(filterBycheck)[index] == null ? false : true),
      comment: commentRef.current[element.value].value
    }));

    setUsrArr(newArray2);

    diffuse(nom_doc, newArray2);
    setOpenUsr(false);
  }

  const closePopup = useCallback(() => {
    console.log('Closing PDF modal and cleaning up');
    
    // Clean up PDF URL to prevent memory leaks
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    
    // Reset all modal state
    setIsOpen(false);
    setSelectedDocument(null);
    setPageNumber(1);
    setNumPages(null);
    setPdfUrl('');
    
    // Simple cleanup - no complex request management needed
  }, [pdfUrl]);

  // Global function - not used anymore, modal handles its own loading
  const onDocumentLoadSuccess = ({ numPages }) => {
    // Modal handles its own page state now
  };

  const [selectedDocument, setSelectedDocument] = React.useState(null);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = React.useState(false);

  // **SIMPLE PDF FETCH** - One endpoint, no retries
  const fetchPdfUrl = useCallback(async (docName) => {
    try {
      const response = await fetch(`${backend}/download/${docName}?view=true`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/pdf',
          'Origin': window.location.origin
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      if (blob.type !== 'application/pdf') {
        throw new Error('Not a PDF file');
      }
      
      // Clean up any existing PDF URL
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      
      const watermarkedBlob = await addWatermarkToPDF(blob);
      const newPdfUrl = URL.createObjectURL(watermarkedBlob);
      setPdfUrl(newPdfUrl);
      // Don't set page states here - let the modal handle it internally
      
      return newPdfUrl;
    } catch (error) {
      console.error('Error fetching PDF:', error);
      throw error;
    }
  }, [pdfUrl]);

  async function downloaddoc(doc) {
    try {
      
      // First check if backend is accessible
      try {
        const healthCheck = await fetch(`${backend}/health`, {
          method: 'GET',
          credentials: 'include'
        });
        if (!healthCheck.ok) {
          throw new Error('Backend server is not responding properly');
        }
      } catch (error) {
        throw new Error('Cannot connect to backend server. Please ensure the server is running on port 3000.');
      }
      
      // First try to get the document path
      const response = await fetch(`${backend}/download/${doc}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/pdf',
          'Origin': window.location.origin
        }
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Add watermark to the PDF
      const watermarkedBlob = await addWatermarkToPDF(blob);
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(watermarkedBlob);
      
      // Create a temporary link element
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from Content-Disposition header or use the original doc name
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : doc;
      
      a.download = filename;
      
      // Append to body, click, and cleanup
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log("Document downloaded successfully:", filename);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "Failed to download document",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }

  const onPageChange = (newPage, totalPages = null) => {
    setPageNumber(newPage);
    if (totalPages !== null) {
      setNumPages(totalPages);
    }
  };

  // Load users list - integrated into initial load
  const loadUsersList = useCallback(async () => {
    try {
      const response = await fetch(`${backend}/list_user`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        }
      });
      if (!response.ok) return;
      const usersData = await response.json();
      const fetchedUsers = usersData.map(setupuser);
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error loading users list:', error);
      setUsers([]);
    }
  }, []);

  // Load users list when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      loadUsersList();
    }
  }, [isAuthenticated, loadUsersList]);

      // **ULTRA SIMPLE DOCUMENT VIEW** - No debounce, no complex tracking
  const handleDocumentView = useCallback(async (doc) => {
    try {
      // Set the selected document immediately
      setSelectedDocument({
        ...doc,
        type_name: doc.type_name || doc.type || 'Unknown'
      });

      // Simple PDF fetch
      const pdfUrl = await fetchPdfUrl(doc.nom_doc);

      if (pdfUrl) {
        setIsOpen(true);
      }
        
    } catch (error) {
      console.log('PDF load error (ignored):', error);
      setSelectedDocument(null);
      setIsOpen(false);
    }
  }, [fetchPdfUrl]);

  const columns = [
    {
      header: 'Document Name',
      accessorKey: 'nom_doc',
      id: 'nom_doc',
      cell: ({ cell }) => {
        const doc = cell.row.original;
        return <p className="text-sm font-medium">{doc.realname || doc.nom_document_original || doc.nom_doc}</p>;
      }
    },
    {
      header: 'Type',
      accessorKey: 'type',
      id: 'type',
      cell: ({ cell }) => {
        const doc = cell.row.original;
        return <p className="text-sm text-gray-600">{doc.type_name || 'Unknown'}</p>;
      }
    },
    {
      header: 'Author',
      id: 'author',
      cell: ({ cell }) => {
        const doc = cell.row.original;
        return <p className="text-sm text-gray-600">{doc.prenom} {doc.nom}</p>;
      }
    },
    {
      header: 'Created At',
      id: 'created_at',
      cell: ({ cell }) => {
        const doc = cell.row.original;
        const date = new Date(doc.date_upload);
        // Adjust for local timezone
        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        return <p className="text-sm text-gray-600">{localDate.toLocaleDateString()} {localDate.toLocaleTimeString()}</p>;
      }
    },
    {
      header: 'Keywords',
      id: 'keywords',
      cell: ({ cell }) => {
        const doc = cell.row.original;
        const keywords = [doc.mot1, doc.mot2, doc.mot3, doc.mot4, doc.mot5]
          .filter(keyword => keyword && keyword.trim() !== '');

        return (
          <div className="flex flex-wrap gap-1">
            {keywords.length > 0 ? (
              keywords.map((keyword, index) => (
                <span
                  key={index}
                  onClick={() => handleKeywordClick(keyword)}
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-800 cursor-pointer hover:bg-gray-300 transition-colors border border-gray-300"
                >
                  {keyword}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-500">No keywords</span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Comments',
      id: 'comments',
      cell: ({ cell }) => {
        const doc = cell.row.original;
        return (
          <div className="flex justify-center">
            <button
              onClick={() => {
                setCurrentComments(doc.comment || 'No comments available');
                setCurrentDocumentName(doc.realname || doc.nom_document_original || doc.nom_doc);
                setShowCommentsModal(true);
              }}
              className="text-blue-500 hover:text-blue-700"
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          </div>
        );
      }
    },
    {
      header: 'Download',
      accessorKey: 'downloadBtn',
      id: 'downloadBtn',
      cell: ({ cell }) => {
        const doc = cell.row.original;
        return (
          <div className="flex justify-center">
            <button
              onClick={() => downloaddoc(doc.nom_doc)}
              className="disabled:text-gray-400 text-blue-500 hover:text-blue-700"
            >
              <FaDownload className="h-5 w-5" />
            </button>
          </div>
        );
      }
    },
    {
      header: 'Visualize',
      accessorKey: 'visualize',
      id: 'visualize',
      cell: ({ cell }) => (
        <div className="flex justify-center">
          <button
            onClick={() => handleDocumentView(cell.row.original)}
            className="text-blue-500 hover:text-blue-700"
          >
            <FaEye className="h-5 w-5" />
          </button>
        </div>
      )
    },
    {
      header: 'Tags',
      accessorKey: 'tags',
      id: 'tags',
      cell: ({ cell }) => <DocumentTagsCell document={cell.row.original} onTagClick={handleTagClick} />
    }
  ];

  const table = useReactTable({
    data: tableData || [],
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    state: {
      sorting: sorting,
      globalFilter: filtering,
      pagination: pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFiltering,
    globalFilterFn: (row, columnId, filterValue) => {
      // Only search in document name
      const originalName = row.original.realname || row.original.nom_document_original || row.original.nom_doc;

      // Convert both the document name and the search term to lowercase for case-insensitive search
      const documentNameLower = originalName.toLowerCase();
      const searchTerms = filterValue.toLowerCase().split(' ');

      // Return true if all search terms exist in the document name
      return searchTerms.every(term => documentNameLower.includes(term));
    }
  });

  // REMOVED DUPLICATE - Using optimized version above

  // Update handleTagClick function
  const handleTagClick = (tagName) => {
    // Find the tag object from the available tags
    const tag = Array.isArray(tags) ? tags.find(t => t.name === tagName || t.tag_name === tagName) : null;
    if (tag) {
      const tagId = tag.id || tag.id_tag || tag.tag_id;
      // Toggle the tag selection
      setSelectedTags(prev => {
        const newTags = prev.includes(tagId) 
          ? prev.filter(id => id !== tagId)
          : [...prev, tagId];
        
        // Reset to first page when changing tags
        setCurrentPage(1);
        
        // Trigger search automatically with the new tags (debounced)
        debouncedSearch({
          selectedTags: newTags,
          name: docNameRef.current?.value || '',
          type_id: selectedTypeId,
          keyword: keywords || '',
          startDate: startDate || '',
          endDate: endDate || ''
        });
        
        return newTags;
      });
    }
  };

  // Update toggleTagSelection function - now uses local filtering
  const toggleTagSelection = (tagId) => {
    setSelectedTags(prev => {
      const newSelection = prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId];
      
      console.log('🏷️ Tag selection changed:', newSelection);
      // Reset to first page when changing tags
      setCurrentPage(1);
      
      // Local filtering will happen automatically via useEffect
      return newSelection;
    });
  };

  // Add function to toggle author selection - now uses local filtering
  const toggleAuthorSelection = (authorId) => {
    setSelectedAuthors(prev => {
      const newAuthors = prev.includes(authorId)
        ? prev.filter(id => id !== authorId)
        : [...prev, authorId];
      
      console.log('👤 Author selection changed:', newAuthors);
      // Reset to first page when changing authors
      setCurrentPage(1);
      
      // Local filtering will happen automatically via useEffect
      return newAuthors;
    });
  };

  // Search documents by selected tags
  const searchDocumentsByTags = () => {
    if (selectedTags.length === 0) {
      showToast("Please select at least one tag for searching", "error");
      return;
    }

    setIsTagSearchActive(true);
    setIsSearching(true);
    setLoading(true);

    fetch(`${backend}/search/by-tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ tagIds: selectedTags })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTableData(data.documents || []);
          showToast(`Found ${data.documents?.length || 0} documents with the selected tags`, "success");
        } else {
          setTableData([]);
          showToast(data.message || "No documents found with selected tags", "info");
        }
        setLoading(false);
        setIsSearching(false);
      })
      .catch(err => {
        console.error("Error searching by tags:", err);
        setIsSearching(false);
        setLoading(false);
        showToast("Error searching by tags: " + err.message, "error");
      });
  };

  // Clear tag search and reset results
  const clearTagSearch = () => {
    setSelectedTags([]);
    setIsTagSearchActive(false);
  };

  // Add this new component for displaying version history
  const VersionHistoryModal = ({ document, isOpen, onClose }) => {
    const [versions, setVersions] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
      if (isOpen && document && document.id_document) {
        setLoading(true);
        setError(null);

        fetch(`${backend}/post_docs/versions/${document.id_document}`, {
          credentials: 'include'
        })
          .then(res => {
            if (!res.ok) {
              throw new Error(`Server responded with status: ${res.status}`);
            }
            return res.json();
          })
          .then(data => {
            if (data.success && Array.isArray(data.versions)) {
              setVersions(data.versions);
            } else {
              setVersions([]);
            }
            setLoading(false);
          })
          .catch(err => {
            console.error("Error fetching version history:", err);
            setError(err.message);
            setLoading(false);
          });
      }
    }, [isOpen, document]);

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <History className="h-6 w-6 text-blue-500 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Document Version History</h2>
              </div>
              <button
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
                onClick={onClose}
              >
                <span className="sr-only">Close</span>
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4 bg-blue-50 p-3 rounded-md">
              <h3 className="font-medium text-blue-800">Document: {document.nom_document_original || document.nom_doc}</h3>
              <p className="text-sm text-blue-600">Uploaded by: {document.prenom} {document.nom}</p>
            </div>

            {loading ? (
              <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 p-4 rounded-md">
                <p className="text-red-700">Error: {error}</p>
                <p className="text-sm text-red-600 mt-1">Could not load version history.</p>
              </div>
            ) : versions.length === 0 ? (
              <div className="bg-yellow-50 p-4 rounded-md">
                <p className="text-yellow-700">No version history available for this document.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upload Date</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded By</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Changes</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {versions.map(version => (
                      <tr key={version.id_version} className={version.is_current ? "bg-blue-50" : ""}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {version.version_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {version.formatted_date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {version.prenom} {version.nom}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {version.change_summary || "No description provided"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {version.is_current ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Current
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              Previous
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            className="text-blue-600 hover:text-blue-900 mr-2"
                            onClick={() => window.open(`${backend}/download/${document.nom_doc}?version=${version.id_version}`, '_blank')}
                          >
                            Download
                          </button>
                          <button
                            className="text-green-600 hover:text-green-900"
                            onClick={() => {
                              onClose();
                              // Open the PDF viewer with this specific version
                              fetchPdfUrl(version.file_path, document.nom_doc, version.id_version);
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Add this function to check if a document has comments
  const hasComments = (document) => {
    // Check if the document has comment data
    return document && document.comment && document.comment.trim().length > 0;
  };

  // Add this toast notification function
  const showToast = (message, type = 'info') => {
    // Implement toast notification (you can use an existing toast component or state)
    console.log(`[${type}] ${message}`);
    // If you have a toast component, activate it here
  };

  // Update handleKeywordClick function
  const handleKeywordClick = (keyword) => {
    // Add the keyword to selectedKeywords if it's not already there
    setSelectedKeywords(prev => {
      if (!prev.includes(keyword)) {
        return [...prev, keyword];
      }
      return prev;
    });
    // Update the keywords field
    setKeywords(keyword);
    // Update the input field if it exists
    if (keyWordRef.current) {
      keyWordRef.current.value = keyword;
    }
    // Reset to first page when changing keywords
    setCurrentPage(1);
    // Trigger search automatically (debounced)
    debouncedSearch({
      selectedTags: selectedTags,
      name: docNameRef.current?.value || '',
      type_id: selectedTypeId,
      keyword: keyword,
      startDate: startDate || '',
      endDate: endDate || ''
    });
  };

  // Add this function to fetch document types
  const fetchDocumentTypes = async () => {
    setIsLoadingTypes(true);
    try {
      const response = await fetch(`${backend}/post_docs/document-types`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch document types');
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.types)) {
        setDocumentTypes(data.types.map(type => ({
          id_type: type.id_type || type.id,
          nom_type: type.nom_type || type.type_name || 'Unknown Type'
        })));
      } else {
        console.error('Invalid document types data format:', data);
        setDocumentTypes([]);
      }
    } catch (error) {
      console.error('Error fetching document types:', error);
      setDocumentTypes([]);
    } finally {
      setIsLoadingTypes(false);
    }
  };

  // Add this useEffect to fetch document types when component mounts
  React.useEffect(() => {
    fetchDocumentTypes();
  }, []);

  // Add this function to fetch available keywords
  const fetchAvailableKeywords = async () => {
    try {
      const response = await fetch(`${backend}/post_docs/keywords`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch keywords');
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.keywords)) {
        setAvailableKeywords(data.keywords);
      } else {
        console.error('Invalid keywords data format:', data);
        setAvailableKeywords([]);
      }
    } catch (error) {
      console.error('Error fetching keywords:', error);
      setAvailableKeywords([]);
    }
  };

  // Add this function to fetch available authors
  const fetchAvailableAuthors = async () => {
    console.log('🔍 Fetching available authors...');
    try {
      const response = await fetch(`${backend}/post_docs/authors`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        }
      });

      console.log('📡 Authors response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Authors fetch failed:', response.status, errorText);
        throw new Error(`Failed to fetch authors: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Authors data received:', data);
      
      if (data.success && Array.isArray(data.authors)) {
        console.log(`✅ Found ${data.authors.length} authors:`, data.authors);
        setAvailableAuthors(data.authors);
      } else {
        console.error('❌ Invalid authors data format:', data);
        setAvailableAuthors([]);
      }
    } catch (error) {
      console.error('💥 Error fetching authors:', error);
      setAvailableAuthors([]);
    }
  };

  // Add this useEffect to fetch keywords and authors when component mounts
  React.useEffect(() => {
    fetchAvailableKeywords();
    fetchAvailableAuthors();
  }, []);

  // Add toggleKeywordSelection function
  const toggleKeywordSelection = (keyword) => {
    setSelectedKeywords(prev => {
      const newKeywords = prev.includes(keyword)
        ? prev.filter(k => k !== keyword)
        : [...prev, keyword];
      
      // Update the keywords state for search
      setKeywords(newKeywords.join(', '));
      
      // Trigger search automatically with the new keywords
      setIsSearching(true);
      search().finally(() => {
        setIsSearching(false);
      });
      
      return newKeywords;
    });
  };

  // Add useEffect to load documents and tags when component mounts
  React.useEffect(() => {
    // Only load if authenticated - this will be triggered by the first useEffect
    if (isAuthenticated) {
      loadAllDocuments();
      loadAvailableTags();
    }
  }, [isAuthenticated, loadAvailableTags]); // Add loadAvailableTags dependency

  // Enhanced cleanup effect for all request management
  useEffect(() => {
    return () => {
      console.log('SearchPage component unmounting - cleaning up all requests');
      
      // Clean up legacy debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      // Simple cleanup - no complex request management
      
      // Clean up any existing PDF URLs to prevent memory leaks
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const fetchViewStatistics = async () => {
    try {
      const response = await axios.get(`${backend}/document_log`, {
        params: {
          nom_doc: selectedDocument?.nom_doc
        },
        withCredentials: true
      });


      if (response.data && response.data.open_count !== undefined) {
        setViewStatistics([{ open_count: response.data.open_count }]);
      } else {
        console.error('SearchPage.js: Invalid view statistics data format:', response.data);
        setViewStatistics([]);
      }
    } catch (error) {
      console.error('SearchPage.js: Error fetching view statistics:', error);
      setViewStatistics([]);
    }
  };

  // Clear search function
  const handleClear = () => {
    // Clear any pending debounced search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (docNameRef.current) docNameRef.current.value = "";
    if (keyWordRef.current) keyWordRef.current.value = "";
    setValue("");
    setSearchQuery(""); // Reset local search query
    setSelectedTags([]);
    setSelectedKeywords([]);
    setSelectedAuthors([]);
    setStartDate("");
    setEndDate("");
    setDateRange(null); // Reset date range picker
    setFiltering("");
    setKeywords("");
    setSelectedTypeId(null); // Adăugăm resetarea tipului de document
    setCurrentPage(1); // Reset to first page
    
    console.log('🧹 Cleared all filters, resetting to all documents');
    // No need to reload - local filtering will show all documents when filters are cleared
  };

  // Add debounce helper
  const debounceRef = useRef(null);

  // Add handleSearch function inside the component
  const handleSearch = async (e) => {
    e.preventDefault();
    
    console.log('🔍 Manual search triggered via form submit');
    
    // Clear any existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Execute immediate search for manual form submit
      setIsLoading(true);
      try {
      debouncedSearch({
        selectedTags: selectedTags,
        selectedAuthors: selectedAuthors,
        name: docNameRef.current?.value || '',
        type_id: selectedTypeId,
        keyword: keywords || '',
        startDate: startDate || '',
        endDate: endDate || ''
      });
      } catch (error) {
        setErrorMessage(error.message);
      } finally {
        setIsLoading(false);
      }
  };

  // Enhanced PDF Viewer Modal based on HomePage design - Self-contained navigation
  const PDFViewerModal = ({ isOpen, onClose, pdfUrl, selectedDocument }) => {
    const [pdfError, setPdfError] = useState(null);
    const [docDetails, setDocDetails] = useState(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [documentStats, setDocumentStats] = useState({ openCount: 0, lastOpened: null });
    const [localNumPages, setLocalNumPages] = useState(null);
    const [localPageNumber, setLocalPageNumber] = useState(1);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });
    const pdfContainerRef = useRef(null);
    const loggedViewRef = useRef(false);

    // Don't sync with props to avoid re-renders and PDF reloads
    // useEffect(() => {
    //   setLocalNumPages(numPages);
    //   setLocalPageNumber(pageNumber);
    // }, [numPages, pageNumber]);

    // Reset local state when modal closes or opens
    useEffect(() => {
      if (!isOpen) {
        setLocalNumPages(null);
        setLocalPageNumber(1);
        setZoomLevel(1.0);
        setPageInputValue('');
        setIsDragging(false);
        setDragStart({ x: 0, y: 0 });
        setScrollStart({ x: 0, y: 0 });
      } else {
        // Initialize when modal opens
        setLocalPageNumber(1);
        setLocalNumPages(null);
        setZoomLevel(1.0);
        setPageInputValue('1');
        setIsDragging(false);
      }
    }, [isOpen]);

    // Update page input when page changes
    useEffect(() => {
      setPageInputValue(localPageNumber.toString());
    }, [localPageNumber]);

    // Memoize the PDF options
    const pdfOptions = React.useMemo(() => ({
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
      httpHeaders: {
        'Origin': window.location.origin
      }
    }), []);

      useEffect(() => {
    if (!isOpen || !selectedDocument) return;

    // **ULTRA SIMPLE** - No AbortController, no complex logic
    const fetchBasicDetails = async () => {
      setIsLoadingDetails(true);
      
      try {
        // Only fetch document details - no statistics to reduce requests
        const response = await fetch(`${backend}/post_docs/details/${selectedDocument.nom_doc}`, {
          credentials: 'include',
          headers: { 'Origin': window.location.origin }
        });

        if (response.ok) {
          const details = await response.json();
          if (details.success) {
            const doc = details.document;
            setDocDetails({
              ...doc,
              type_name: doc.type_name || doc.type || selectedDocument.type_name || selectedDocument.type || 'Unknown'
            });
          }
        }

        // Set default stats - no fetching to avoid request overload
        setDocumentStats({ openCount: 0, lastOpened: null });

        // Simple view logging - fire and forget
        setTimeout(() => {
          if (!loggedViewRef.current) {
            loggedViewRef.current = true;
            fetch(`${backend}/document_log`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ nom_doc: selectedDocument.nom_doc }),
              credentials: 'include'
            }).catch(() => {}); // Ignore errors
          }
        }, 1000);

      } catch (error) {
        console.log('Modal details error (ignored):', error);
        setDocumentStats({ openCount: 0, lastOpened: null });
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchBasicDetails();
  }, [isOpen, selectedDocument]);

    // Reset loggedViewRef when modal closes
    useEffect(() => {
      if (!isOpen) {
        loggedViewRef.current = false;
        setDocDetails(null);
        setDocumentStats({ openCount: 0, lastOpened: null });
      }
    }, [isOpen]);

    const handleDownload = async () => {
      try {
        if (!selectedDocument) return;

        // Single primary endpoint for downloading
        const downloadUrl = `${backend}/download/${selectedDocument.nom_doc}`;
        
        const response = await fetch(downloadUrl, {
          credentials: 'include',
          headers: { 'Origin': window.location.origin }
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = selectedDocument.realname || selectedDocument.nom_document_original || selectedDocument.nom_doc;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          toast({
            title: "Success",
            description: "Download started",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
        } else {
          throw new Error(`Download failed with status: ${response.status}`);
        }
      } catch (error) {
        console.error('Download error:', error);
        toast({
          title: "Error",
          description: "Failed to download file: " + error.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    };

    const onDocumentLoadSuccess = ({ numPages }) => {
      setLocalNumPages(numPages);
      setLocalPageNumber(1);
      // Don't sync with parent to avoid reloading
      setPdfError(null);
    };

    // Local page navigation functions - ONLY change local state, don't trigger parent
    const handlePrevPage = () => {
      if (localPageNumber > 1) {
        const newPage = localPageNumber - 1;
        setLocalPageNumber(newPage);
        // Don't call onPageChange to avoid reloading the PDF
      }
    };

    const handleNextPage = () => {
      if (localPageNumber < localNumPages) {
        const newPage = localPageNumber + 1;
        setLocalPageNumber(newPage);
        // Don't call onPageChange to avoid reloading the PDF  
      }
    };

    // Zoom functions with better increments
    const handleZoomIn = () => {
      setZoomLevel(prev => {
        const newZoom = prev < 1 ? prev + 0.1 : prev + 0.25;
        return Math.min(newZoom, 3.0);
      });
    };

    const handleZoomOut = () => {
      setZoomLevel(prev => {
        const newZoom = prev <= 1 ? prev - 0.1 : prev - 0.25;
        return Math.max(newZoom, 0.3);
      });
    };

    const handleZoomReset = () => {
      setZoomLevel(1.0);
      // Reset scroll position when resetting zoom
      if (pdfContainerRef.current) {
        pdfContainerRef.current.scrollTo(0, 0);
      }
    };

    // Quick zoom presets
    const handleQuickZoom = () => {
      const currentZoom = Math.round(zoomLevel * 100);
      if (currentZoom === 100) {
        setZoomLevel(1.5); // 150%
      } else if (currentZoom === 150) {
        setZoomLevel(2.0); // 200%
      } else if (currentZoom === 200) {
        setZoomLevel(0.75); // 75%
      } else {
        setZoomLevel(1.0); // Reset to 100%
      }
    };

    // Page input handler with better UX
    const [pageInputValue, setPageInputValue] = useState('');
    
    const handlePageInputChange = (e) => {
      const value = e.target.value;
      setPageInputValue(value);
      
      // Only update page if it's a valid number
      const newPage = parseInt(value);
      if (newPage >= 1 && newPage <= localNumPages) {
        setLocalPageNumber(newPage);
      }
    };

    const handlePageInputBlur = () => {
      // Reset to current page if invalid input
      const newPage = parseInt(pageInputValue);
      if (!newPage || newPage < 1 || newPage > localNumPages) {
        setPageInputValue(localPageNumber.toString());
      }
    };

    const handlePageInputKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.target.blur();
      }
    };

    // Drag navigation functions
    const handleMouseDown = (e) => {
      if (zoomLevel > 1 && pdfContainerRef.current) {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setScrollStart({ 
          x: pdfContainerRef.current.scrollLeft, 
          y: pdfContainerRef.current.scrollTop 
        });
        e.preventDefault();
      }
    };

    const handleMouseMove = (e) => {
      if (isDragging && zoomLevel > 1 && pdfContainerRef.current) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        
        pdfContainerRef.current.scrollLeft = scrollStart.x - deltaX;
        pdfContainerRef.current.scrollTop = scrollStart.y - deltaY;
        e.preventDefault();
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    // Wheel zoom function
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoomLevel(prev => {
          const newZoom = prev + delta;
          return Math.min(Math.max(newZoom, 0.3), 3.0);
        });
      }
    };

    // Keyboard navigation
    useEffect(() => {
      if (!isOpen) return;

      const handleKeyDown = (e) => {
        if (e.target.tagName === 'INPUT') return; // Don't interfere with input fields
        
        switch (e.key) {
          case 'ArrowLeft':
          case 'ArrowUp':
            e.preventDefault();
            handlePrevPage();
            break;
          case 'ArrowRight':
          case 'ArrowDown':
            e.preventDefault();
            handleNextPage();
            break;
          case '+':
          case '=':
            e.preventDefault();
            handleZoomIn();
            break;
          case '-':
            e.preventDefault();
            handleZoomOut();
            break;
          case '0':
            e.preventDefault();
            handleZoomReset();
            break;
          case 'Escape':
            e.preventDefault();
            onClose();
            break;
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isOpen, localPageNumber, localNumPages, zoomLevel, isDragging, dragStart, scrollStart]);

    const onDocumentLoadError = React.useCallback((error) => {
      console.error('Error loading PDF:', error);
      setPdfError('Error loading PDF. Please try again later.');
      toast({
        title: "Error",
        description: "Failed to load PDF document",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }, []);

    const handleCommentClick = (comment) => {
      // Show comment in a simple modal - you can implement this later if needed
      alert(comment);
    };

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="6xl"
        motionPreset="slideInBottom"
      >
        <ModalOverlay 
          bg="blackAlpha.500"
          backdropFilter="blur(5px)"
        />
        <ModalContent 
          borderRadius="xl"
          overflow="hidden"
          maxH="90vh"
          h="90vh"
          bg="white"
          boxShadow="2xl"
        >
          {selectedDocument && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col h-full"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 p-6">
                <div className="flex items-center">
                  <motion.div
                    whileHover={{ rotate: 5 }}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-full mr-3"
                  >
                    <FileOutlined className="text-white text-xl" />
                  </motion.div>
                  <div>
                    <h4 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-0">
                      {selectedDocument.realname || selectedDocument.nom_document_original || selectedDocument.nom_doc}
                    </h4>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      leftIcon={<DownloadIcon />}
                      onClick={handleDownload}
                      colorScheme="blue"
                      variant="solid"
                      size="sm"
                      _hover={{ transform: 'translateY(-1px)', boxShadow: 'md' }}
                      transition="all 0.2s"
                      borderRadius="md"
                    >
                      Descărcă
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      leftIcon={<PrinterOutlined />}
                      onClick={() => window.print()}
                      colorScheme="gray"
                      variant="solid"
                      size="sm"
                      _hover={{ transform: 'translateY(-1px)', boxShadow: 'md' }}
                      transition="all 0.2s"
                      borderRadius="md"
                    >
                      Imprimă
                    </Button>
                  </motion.div>
                  <Tooltip 
                    label="Keyboard shortcuts: ← → (navigate), + - (zoom), 0 (reset zoom), Esc (close)"
                    placement="bottom"
                    hasArrow
                    fontSize="sm"
                    bg="gray.700"
                    color="white"
                  >
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        _hover={{ bg: 'gray.100' }}
                        transition="all 0.2s"
                        borderRadius="md"
                        title="Keyboard Shortcuts"
                      >
                        ⌨️
                      </Button>
                    </motion.div>
                  </Tooltip>
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <IconButton 
                      icon={<CloseIcon />} 
                      onClick={onClose}
                      colorScheme="red"
                      variant="solid"
                      size="sm"
                      _hover={{ transform: 'translateY(-1px)', boxShadow: 'md' }}
                      transition="all 0.2s"
                      borderRadius="md"
                    />
                  </motion.div>
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Sidebar with document info */}
                <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto p-6 flex-shrink-0">
                  {isLoadingDetails ? (
                    <div className="flex justify-center items-center h-full">
                      <Spinner size="lg" />
                    </div>
                  ) : docDetails ? (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="space-y-6"
                    >
                      <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl shadow-sm">
                        <Text fontWeight="bold" className="block mb-2 text-gray-600">Tip:</Text>
                        <Badge 
                          colorScheme="blue"
                          px={3}
                          py={1}
                          borderRadius="full"
                          fontSize="sm"
                        >
                          {docDetails?.type_name || selectedDocument?.type_name || 'Unknown'}
                        </Badge>
                      </div>

                        <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl shadow-sm">
                          <Text fontWeight="bold" className="block mb-2 text-gray-600">Tags:</Text>
                        {docDetails?.tags && docDetails.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {docDetails.tags.map((tag, index) => (
                              <motion.div
                                key={index}
                                whileHover={{ scale: 1.05 }}
                              >
                                <Tag color="blue" className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
                                  {tag.tag_name || tag.name}
                                </Tag>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <Text className="text-gray-500 italic">
                            Nu există taguri pentru acest document
                          </Text>
                      )}
                      </div>

                        <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl shadow-sm">
                        <Text fontWeight="bold" className="block mb-2 text-gray-600">Descriere:</Text>
                        {docDetails?.comment ? (
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
                                  variant="link" 
                                  onClick={() => handleCommentClick(docDetails.comment)}
                                  colorScheme="blue"
                                  size="sm"
                                >
                                  Read more
                                </Button>
                              </motion.div>
                            )}
                          </div>
                        ) : (
                          <Text className="text-gray-500 italic">
                            Nu există descriere pentru acest document
                          </Text>
                      )}
                      </div>

                        <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl shadow-sm">
                          <Text fontWeight="bold" className="block mb-2 text-gray-600">Keywords:</Text>
                        {docDetails?.keywords && docDetails.keywords.length > 0 ? (
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
                        ) : (
                          <Text className="text-gray-500 italic">
                            Nu există keywords pentru acest document
                          </Text>
                      )}
                      </div>


                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                                             <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl shadow-sm">
                        <Text fontWeight="bold" className="block mb-2 text-gray-600">Tip:</Text>
                        <Badge 
                          colorScheme="blue"
                          px={3}
                          py={1}
                          borderRadius="full"
                          fontSize="sm"
                        >
                          {selectedDocument?.type_name || 'Unknown'}
                        </Badge>
                      </div>
                      
                      <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl shadow-sm">
                        <Text fontWeight="bold" className="block mb-2 text-gray-600">Tags:</Text>
                        <Text className="text-gray-500 italic">
                          Nu există taguri pentru acest document
                             </Text>
                           </div>
                      
                      <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl shadow-sm">
                        <Text fontWeight="bold" className="block mb-2 text-gray-600">Descriere:</Text>
                        <Text className="text-gray-500 italic">
                          Nu există descriere pentru acest document
                        </Text>
                      </div>
                      
                      <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl shadow-sm">
                        <Text fontWeight="bold" className="block mb-2 text-gray-600">Keywords:</Text>
                        <Text className="text-gray-500 italic">
                          Nu există keywords pentru acest document
                        </Text>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Control Panel - Fixed at top */}
                  {localNumPages && (
                             <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm"
                    >
                      {/* Page Navigation */}
                      <div className="flex items-center space-x-3">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            onClick={handlePrevPage}
                            disabled={localPageNumber <= 1}
                            size="sm"
                            variant="outline"
                            _hover={{ bg: 'blue.50', borderColor: 'blue.300' }}
                            transition="all 0.2s"
                          >
                            <ChevronLeftIcon boxSize={4} />
                          </Button>
                             </motion.div>
                        
                        <div className="flex items-center space-x-2">
                          <Text fontSize="sm" color="gray.600" fontWeight="medium">Page</Text>
                          <Input
                            type="text"
                            value={pageInputValue}
                            onChange={handlePageInputChange}
                            onBlur={handlePageInputBlur}
                            onKeyDown={handlePageInputKeyDown}
                            size="sm"
                            width="60px"
                            textAlign="center"
                            borderRadius="md"
                            _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px blue.400' }}
                            bg="white"
                          />
                          <Text fontSize="sm" color="gray.600">of {localNumPages}</Text>
                        </div>
                        
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            onClick={handleNextPage}
                            disabled={localPageNumber >= localNumPages}
                            size="sm"
                            variant="outline"
                            _hover={{ bg: 'blue.50', borderColor: 'blue.300' }}
                            transition="all 0.2s"
                          >
                            <ChevronRightIcon boxSize={4} />
                          </Button>
                        </motion.div>
                      </div>

                      {/* Zoom Controls */}
                      <div className="flex items-center space-x-3">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            onClick={handleZoomOut}
                            disabled={zoomLevel <= 0.3}
                            size="sm"
                            variant="outline"
                            _hover={{ bg: 'red.50', borderColor: 'red.300' }}
                            transition="all 0.2s"
                            title="Zoom Out"
                          >
                            <Text fontSize="lg" fontWeight="bold">−</Text>
                          </Button>
                        </motion.div>
                        
                        {/* Zoom Slider */}
                        <div className="flex items-center space-x-3">
                          <Text 
                            fontSize="sm" 
                            color="gray.600" 
                            fontWeight="medium" 
                            minW="45px"
                            cursor="pointer"
                            _hover={{ color: 'blue.600', fontWeight: 'bold' }}
                            transition="all 0.2s"
                            onClick={handleQuickZoom}
                            onDoubleClick={handleZoomReset}
                            title="Click for quick zoom presets, double-click to reset to 100%"
                          >
                            {Math.round(zoomLevel * 100)}%
                             </Text>
                          
                          {/* Custom Zoom Slider */}
                          <Tooltip 
                            label={`Zoom: ${Math.round(zoomLevel * 100)}% (30% - 300%)`}
                            placement="bottom"
                            hasArrow
                            bg="gray.700"
                            color="white"
                          >
                            <div className="relative w-32 h-6 flex items-center">
                              <input
                                type="range"
                                min="30"
                                max="300"
                                value={Math.round(zoomLevel * 100)}
                                onChange={(e) => setZoomLevel(parseInt(e.target.value) / 100)}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                style={{
                                  background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${((zoomLevel * 100 - 30) / (300 - 30)) * 100}%, #E5E7EB ${((zoomLevel * 100 - 30) / (300 - 30)) * 100}%, #E5E7EB 100%)`
                                }}
                              />
                              {/* Tick marks for common zoom levels */}
                              <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                                {[50, 100, 150, 200].map(percent => {
                                  const position = ((percent - 30) / (300 - 30)) * 100;
                                  return (
                                    <div
                                      key={percent}
                                      className="absolute w-px h-3 bg-gray-400"
                                      style={{
                                        left: `${position}%`,
                                        top: '50%',
                                        transform: 'translateY(-50%)'
                                      }}
                                    />
                                  );
                                })}
                           </div>
                         </div>
                          </Tooltip>
                       </div>
                        
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            onClick={handleZoomIn}
                            disabled={zoomLevel >= 3.0}
                            size="sm"
                            variant="outline"
                            _hover={{ bg: 'green.50', borderColor: 'green.300' }}
                            transition="all 0.2s"
                            title="Zoom In"
                          >
                            <Text fontSize="lg" fontWeight="bold">+</Text>
                          </Button>
                    </motion.div>
                </div>
                    </motion.div>
                  )}

                  {/* PDF Viewer Container - PROPERLY SCROLLABLE! */}
                  <div 
                    ref={pdfContainerRef}
                    className="flex-1 bg-gray-100 overflow-auto"
                    style={{ 
                      cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                      userSelect: 'none' // Prevent text selection during drag
                    }}
                    onMouseDown={handleMouseDown}
                    onWheel={handleWheel}
                  >
                    {pdfError ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-center h-full"
                      >
                        <div className="text-center">
                          <div className="bg-red-50 p-6 rounded-xl mb-4 border border-red-200">
                            <div className="text-red-500 text-4xl mb-2">⚠️</div>
                            <Text color="red.600" fontSize="lg" fontWeight="medium">{pdfError}</Text>
                        </div>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button 
                            colorScheme="blue"
                            onClick={() => setPdfError(null)}
                            _hover={{ transform: 'translateY(-1px)', boxShadow: 'md' }}
                            transition="all 0.2s"
                              borderRadius="lg"
                          >
                            Try Again
                          </Button>
                        </motion.div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="p-6" style={{ minWidth: `${600 * zoomLevel + 48}px`, minHeight: `${850 * zoomLevel + 48}px` }}>
                        <div className="flex justify-center">
                          <div 
                            className="bg-white shadow-2xl rounded-lg border border-gray-200 inline-block"
                            style={{
                              transform: `scale(${zoomLevel})`,
                              transformOrigin: 'top center',
                              transition: 'transform 0.2s ease-out'
                            }}
                          >
                        <Document
                          file={pdfUrl}
                          onLoadSuccess={onDocumentLoadSuccess}
                          onLoadError={onDocumentLoadError}
                          loading={
                                <div className="flex flex-col items-center justify-center p-16 bg-white rounded-lg">
                                  <Spinner size="xl" color="blue.500" thickness="4px" />
                                  <Text className="mt-4 text-gray-600 font-medium">Loading PDF...</Text>
                                  <Text className="mt-2 text-gray-400 text-sm">Please wait...</Text>
                            </div>
                          }
                          options={pdfOptions}
                        >
                          <Page 
                            pageNumber={localPageNumber || 1} 
                                width={600} // Fixed base width
                            loading={
                                  <div className="flex flex-col items-center justify-center p-16 bg-white rounded-lg">
                                    <Spinner size="xl" color="blue.500" thickness="4px" />
                                    <Text className="mt-4 text-gray-600 font-medium">Loading page...</Text>
                              </div>
                            }
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                            onRenderError={(error) => {
                              console.error('Error rendering page:', error);
                              toast({
                                title: "Error",
                                description: "Error rendering PDF page",
                                status: "error",
                                duration: 3000,
                                isClosable: true,
                              });
                            }}
                          />
                        </Document>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </ModalContent>
      </Modal>
    );
  };

  // Local filtering function (similar to Diffuse)
  const filterDocumentsLocally = useCallback((documents) => {
    console.log('🔍 Local filtering started with', documents.length, 'documents');
    let filteredDocs = [...documents];

    // Apply search query filter (instant search) - now includes ID search
    if (searchQuery) {
      filteredDocs = filteredDocs.filter(doc => {
        const searchTerm = searchQuery.toLowerCase();
        
        // Check if search term is a number (potential ID search)
        const isNumericSearch = /^\d+$/.test(searchQuery.trim());
        
        if (isNumericSearch) {
          // If numeric, search by ID first, then by name
          return doc.id_document.toString().includes(searchQuery) ||
                 doc.nom_document.toLowerCase().includes(searchTerm) ||
                 (doc.nom_document_original && doc.nom_document_original.toLowerCase().includes(searchTerm));
        } else {
          // If not numeric, search by name only
          return doc.nom_document.toLowerCase().includes(searchTerm) ||
                 (doc.nom_document_original && doc.nom_document_original.toLowerCase().includes(searchTerm));
        }
      });
      console.log('📝 After search query filter (with ID support):', filteredDocs.length, 'documents');
    }

    // Apply tags filter
    if (selectedTags.length > 0) {
      filteredDocs = filteredDocs.filter(doc => {
        if (!doc.tags || !Array.isArray(doc.tags)) return false;
        return selectedTags.some(selectedTagId => 
          doc.tags.some(tag => (tag.id_tag || tag.id) === selectedTagId)
        );
      });
      console.log('🏷️ After tags filter:', filteredDocs.length, 'documents');
    }

    // Apply authors filter
    if (selectedAuthors.length > 0) {
      filteredDocs = filteredDocs.filter(doc => 
        selectedAuthors.includes(doc.id_user_source)
      );
      console.log('👤 After authors filter:', filteredDocs.length, 'documents');
    }

    // Apply document type filter
    if (selectedTypeId) {
      filteredDocs = filteredDocs.filter(doc => doc.type_id === selectedTypeId);
      console.log('📄 After type filter:', filteredDocs.length, 'documents');
    }

    // Apply keywords filter
    if (keywords) {
      const keywordArray = keywords.toLowerCase().split(',').map(k => k.trim()).filter(k => k);
      filteredDocs = filteredDocs.filter(doc => {
        const docKeywords = [doc.mot1, doc.mot2, doc.mot3, doc.mot4, doc.mot5]
          .filter(k => k && k.trim() !== '')
          .map(k => k.toLowerCase());
        
        return keywordArray.some(searchKeyword => 
          docKeywords.some(docKeyword => docKeyword.includes(searchKeyword))
        );
      });
      console.log('🔑 After keywords filter:', filteredDocs.length, 'documents');
    }

    // Apply date filters
    if (startDate) {
      filteredDocs = filteredDocs.filter(doc => {
        const docDate = new Date(doc.date_upload);
        const filterStartDate = new Date(startDate);
        return docDate >= filterStartDate;
      });
      console.log('📅 After start date filter:', filteredDocs.length, 'documents');
    }

    if (endDate) {
      filteredDocs = filteredDocs.filter(doc => {
        const docDate = new Date(doc.date_upload);
        const filterEndDate = new Date(endDate);
        return docDate <= filterEndDate;
      });
      console.log('📅 After end date filter:', filteredDocs.length, 'documents');
    }

    console.log('✅ Final filtered documents:', filteredDocs.length);
    return filteredDocs;
  }, [searchQuery, selectedTags, selectedAuthors, selectedTypeId, keywords, startDate, endDate]);

  // Apply local filtering whenever filters change
  useEffect(() => {
    if (allDocuments.length > 0) {
      const filtered = filterDocumentsLocally(allDocuments);
      setTableData(filtered);
      setCurrentPage(1); // Reset to first page when filters change
    }
  }, [allDocuments, filterDocumentsLocally]);

  // Add pagination calculation
  const totalPages = Math.ceil(tableData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = tableData.slice(startIndex, endIndex);

  // Add pagination handlers
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [expandedComment, setExpandedComment] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(false);

  const logDocumentView = async (nom_doc) => {
    try {
      const response = await fetch(`${backend}/document_log`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nom_doc }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        console.error('Failed to log document view:', data.error);
      }
    } catch (error) {
      console.error('Error logging document view:', error);
    }
  };

  // Update the document click handler
  const handleDocumentClick = async (document) => {
    try {
      // Log the document view first
      await logDocumentView(document.nom_doc);
      
      // Then open the document
      window.open(document.url, '_blank');
    } catch (error) {
      console.error('Error handling document click:', error);
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
              {/* Subtle background patterns */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200/20 to-indigo-200/20 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-200/20 to-purple-200/20 rounded-full blur-xl"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    <FaSearch />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Căutare Documente</h1>
                    <p className="text-gray-600 mt-1">Găsește-ți documentele folosind filtre avansate de căutare</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Modern Search Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6 mb-8 relative z-10"
          >
            <form onSubmit={handleSearch} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Modern Search Input */}
                <div className="md:col-span-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaSearch className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      ref={docNameRef}
                      type="text"
                      placeholder="Caută documente (nume sau ID)"
                      value={searchQuery}
                      onChange={(e) => {
                        const searchTerm = e.target.value;
                        console.log('🔍 Local search triggered:', searchTerm);
                        setSearchQuery(searchTerm);
                      }}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:bg-white/70"
                    />
                  </div>
                </div>

                {/* Modern Document Type Selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenDocTypes(!openDocTypes)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl text-left hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedTypeId ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                        </svg>
                      </div>
                      <span className={`text-sm font-medium ${selectedTypeId ? 'text-purple-700' : 'text-gray-700'}`}>
                        {selectedTypeId 
                          ? documentTypes.find(t => t.id_type === selectedTypeId)?.nom_type || 'Tip Document'
                          : 'Tip Document'
                        }
                      </span>
                    </div>
                    <svg 
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${openDocTypes ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                      
                  {/* Modern Dropdown */}
                  {openDocTypes && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setOpenDocTypes(false)}
                      />
                      
                      {/* Dropdown Content */}
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200 z-50 max-h-80 overflow-y-auto">
                        <div className="p-2">
                          <div className="space-y-1">
                            {/* All Types Option */}
                            <button
                              onClick={() => {
                                setSelectedTypeId(null);
                                setOpenDocTypes(false);
                              }}
                              className={`w-full flex items-center p-3 rounded-lg text-left transition-all duration-200 ${
                                !selectedTypeId 
                                  ? 'bg-purple-50 text-purple-700' 
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                                !selectedTypeId ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'
                              }`}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V5H19V19Z"/>
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className={`text-sm font-medium ${!selectedTypeId ? 'text-purple-700' : 'text-gray-700'}`}>
                                  Toate tipurile
                                </div>
                                <div className="text-xs text-gray-500">
                                  Afișează toate documentele
                                </div>
                              </div>
                              {!selectedTypeId && (
                                <div className="text-purple-500 text-sm font-bold">
                                  ✓
                                </div>
                              )}
                            </button>
                                
                            {/* Document Types */}
                            {documentTypes.map(type => {
                              const isSelected = selectedTypeId === type.id_type;
                              return (
                                <button
                                  key={type.id_type}
                                  onClick={() => {
                                    setSelectedTypeId(type.id_type);
                                    setOpenDocTypes(false);
                                  }}
                                  className={`w-full flex items-center p-3 rounded-lg text-left transition-all duration-200 ${
                                    isSelected 
                                      ? 'bg-purple-50 text-purple-700' 
                                      : 'text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                                    isSelected ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <div className={`text-sm font-medium ${isSelected ? 'text-purple-700' : 'text-gray-700'}`}>
                                      {type.nom_type || type.type_name || 'Unknown Type'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Filtrează după acest tip
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <div className="text-purple-500 text-sm font-bold">
                                      ✓
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Modern Tags Selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenTags(!openTags)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl text-left hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedTags.length > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                        <FaTags />
                      </div>
                      <span className={`text-sm font-medium ${selectedTags.length > 0 ? 'text-green-700' : 'text-gray-700'}`}>
                        {selectedTags.length > 0 
                          ? `${selectedTags.length} tag${selectedTags.length > 1 ? 'uri' : ''} selectat${selectedTags.length > 1 ? 'e' : ''}`
                          : 'Selectează Tag-uri'
                        }
                      </span>
                    </div>
                    <svg 
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${openTags ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                      
                  {/* Modern Tags Dropdown */}
                  {openTags && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => {
                          setOpenTags(false);
                          setTagSearchTerm('');
                        }}
                      />
                      
                      {/* Dropdown Content */}
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 z-[100] max-h-80 overflow-y-auto">
                        <div className="p-3">
                          {/* Tag Search Input */}
                          <div className="mb-3">
                            <input
                              type="text"
                              placeholder="Caută tag-uri..."
                              value={tagSearchTerm}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                              onChange={(e) => setTagSearchTerm(e.target.value)}
                            />
                          </div>
                          
                          {Array.isArray(tags) && tags.length > 0 ? (
                            <div className="space-y-2">
                              {tags
                                .filter(tag => 
                                  tag.tag_name.toLowerCase().includes(tagSearchTerm.toLowerCase())
                                )
                                .sort((a, b) => {
                                  // Sort selected tags to the top
                                  const aSelected = selectedTags.includes(a.id_tag);
                                  const bSelected = selectedTags.includes(b.id_tag);
                                  if (aSelected && !bSelected) return -1;
                                  if (!aSelected && bSelected) return 1;
                                  return a.tag_name.localeCompare(b.tag_name);
                                })
                                .map(tag => {
                                  const isSelected = selectedTags.includes(tag.id_tag);
                                  return (
                                    <button
                                      key={tag.id_tag}
                                      onClick={() => toggleTagSelection(tag.id_tag)}
                                      className={`w-full flex items-center p-3 rounded-lg text-left transition-all duration-200 ${
                                        isSelected 
                                          ? 'bg-green-50 text-green-700 border border-green-200' 
                                          : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                                      }`}
                                    >
                                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 ${
                                        isSelected 
                                          ? 'bg-green-500 border-green-500 text-white' 
                                          : 'border-gray-300'
                                      }`}>
                                        {isSelected && (
                                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                        )}
                                      </div>
                                      <span className="text-sm font-medium">
                                        {tag.tag_name}
                                      </span>
                                      {isSelected && (
                                        <div className="ml-auto">
                                          <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                                            Selectat
                                          </span>
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                            </div>
                          ) : (
                            <div className="text-center py-6">
                              <p className="text-sm text-gray-500">
                                {tagSearchTerm ? 'Nu s-au găsit taguri care să conțină "' + tagSearchTerm + '"' : 'Nu există taguri disponibile'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Modern Authors Selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenAuthors(!openAuthors)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl text-left hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedAuthors.length > 0 ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                        <FaUser />
                      </div>
                      <span className={`text-sm font-medium ${selectedAuthors.length > 0 ? 'text-purple-700' : 'text-gray-700'}`}>
                        {selectedAuthors.length > 0 
                          ? `${selectedAuthors.length} autor${selectedAuthors.length > 1 ? 'i' : ''} selectat${selectedAuthors.length > 1 ? 'i' : ''}`
                          : 'Selectează Autori'
                        }
                      </span>
                    </div>
                    <svg 
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${openAuthors ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                      
                  {/* Modern Authors Dropdown */}
                  {openAuthors && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setOpenAuthors(false)}
                      />
                      
                      {/* Dropdown Content */}
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200 z-50 max-h-80 overflow-y-auto">
                        <div className="p-3">
                          {Array.isArray(availableAuthors) && availableAuthors.length > 0 ? (
                            <div className="space-y-2">
                              {availableAuthors.map(author => {
                                const isSelected = selectedAuthors.includes(author.id);
                                return (
                                  <button
                                    key={author.id}
                                    onClick={() => toggleAuthorSelection(author.id)}
                                    className={`w-full flex items-center p-3 rounded-lg text-left transition-all duration-200 ${
                                      isSelected 
                                        ? 'bg-purple-50 text-purple-700' 
                                        : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 ${
                                      isSelected 
                                        ? 'bg-purple-500 border-purple-500 text-white' 
                                        : 'border-gray-300'
                                    }`}>
                                      {isSelected && (
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <div className={`text-sm font-medium ${isSelected ? 'text-purple-700' : 'text-gray-700'}`}>
                                        {author.fullName}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {author.email}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-6">
                              <p className="text-sm text-gray-500">Nu există autori disponibili</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

                {/* Advanced Filters */}
                <Collapse in={showAdvancedFilters}>
                  <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4} mt={4}>
                    <FormControl>
                      <Input
                        ref={keyWordRef}
                        type="text"
                        placeholder="Keywords"
                        focusBorderColor="blue.500"
                        _hover={{ borderColor: 'blue.400' }}
                        transition="all 0.2s"
                        borderRadius="md"
                      />
                    </FormControl>
                                        {/* Modern Date Range Picker */}
                    <FormControl>
                      <Box>
                        <RangePicker
                          value={dateRange}
                          onChange={(dates) => {
                            setDateRange(dates);
                            if (dates && dates[0] && dates[1]) {
                              setStartDate(dates[0].format('YYYY-MM-DD'));
                              setEndDate(dates[1].format('YYYY-MM-DD'));
                            } else {
                              setStartDate('');
                              setEndDate('');
                            }
                          }}
                          format="DD.MM.YYYY"
                          allowClear={true}
                          size="large"
                          placeholder={['Data început', 'Data sfârșit']}
                          disabledDate={(current) => {
                            return current && current > moment().endOf('day');
                          }}
                          ranges={{
                            'Astăzi': [moment().startOf('day'), moment().endOf('day')],
                            'Ultimele 7 zile': [moment().subtract(6, 'days').startOf('day'), moment().endOf('day')],
                            'Ultimele 30 zile': [moment().subtract(29, 'days').startOf('day'), moment().endOf('day')],
                            'Această lună': [moment().startOf('month'), moment().endOf('month')]
                          }}
                          style={{
                            width: '100%',
                            borderRadius: '8px',
                            borderColor: '#E2E8F0',
                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                          }}
                          className="modern-date-picker"
                        />
                      </Box>
                  </FormControl>
                </Grid>
                </Collapse>

              {/* Modern Action Buttons */}
              <div className="flex justify-between items-center mt-6">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex items-center space-x-2 text-purple-600 hover:text-purple-700 transition-colors duration-200"
                >
                  <FaFilter className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {showAdvancedFilters ? 'Ascunde opțiuni avansate' : 'Afișează opțiuni avansate'}
                  </span>
                </button>
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all duration-200 hover:shadow-md"
                  >
                    <FaTrash className="w-4 h-4" />
                    <span className="text-sm font-medium">Șterge</span>
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-medium">Căutare...</span>
                      </>
                    ) : (
                      <>
                        <FaSearch className="w-4 h-4" />
                        <span className="text-sm font-medium">Caută</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>

          {/* Modern Results Section */}
          {searchClicked && !loading && !nofile && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100/50 p-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentItems.map((doc, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                    onClick={(e) => {
                      // Only trigger if not clicking on interactive elements
                      if (!e.target.closest('button') && !e.target.closest('[data-interactive]')) {
                        handleDocumentView(doc);
                      }
                    }}
                  >
                    {/* Document Type Label - Corner Tag */}
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1 rounded-bl-xl text-xs font-semibold shadow-sm z-10">
                      {doc.type_name || doc.type || 'Unknown'}
                    </div>

                    <div className="flex flex-col h-full">
                      <div className="flex-1">
                        {/* Document Header */}
                        <div className="mb-4 mt-2">
                          <div className="flex items-start space-x-3 pr-4">
                            {/* ID Badge */}
                            <div className="bg-gray-600 text-white px-2 py-1 rounded-md text-xs font-medium flex-shrink-0">
                              #{doc.id_document}
                            </div>
                            
                            {/* Document Title */}
                            <h3 className="text-lg font-bold text-gray-900 line-clamp-2 flex-1 hover:text-purple-600 transition-colors duration-200">
                              {doc.nom_document}
                            </h3>
                          </div>
                        </div>

                        {/* Author and Date Section */}
                        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/50 mb-4">
                          <div className="grid grid-cols-2 gap-4">
                            {/* Author */}
                            <div className="flex items-start space-x-2">
                              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                                <FaUser className="w-3 h-3" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-600 font-medium uppercase">Autor</p>
                                <p className="text-sm text-gray-800 font-medium truncate">
                                  {doc.prenom} {doc.nom}
                                </p>
                              </div>
                            </div>
                            
                            {/* Date */}
                            <div className="flex items-start space-x-2">
                              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                                <FaCalendarAlt className="w-3 h-3" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-600 font-medium uppercase">Data</p>
                                <p className="text-sm text-gray-800 font-medium">
                                  {new Date(doc.date_upload).toLocaleDateString('ro-RO')}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Location Section */}
                        <div className={`p-4 rounded-xl border mb-4 ${
                          isDocumentOwner(doc) 
                            ? 'bg-green-50/50 border-green-200/50' 
                            : 'bg-gray-50/50 border-gray-200/50'
                        }`}>
                          <div className="flex items-start space-x-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0 ${
                              isDocumentOwner(doc) ? 'bg-green-500' : 'bg-gray-400'
                            }`}>
                              <FaFolder className="w-3 h-3" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <p className={`text-xs font-medium uppercase ${
                                  isDocumentOwner(doc) ? 'text-gray-600' : 'text-gray-500'
                                }`}>
                                  Locație
                                </p>
                                {!isDocumentOwner(doc) && (
                                  <span className="bg-orange-400 text-white px-2 py-0.5 rounded-md text-xs font-medium">
                                    Read-only
                                  </span>
                                )}
                              </div>
                              <p 
                                className={`text-sm font-medium truncate cursor-pointer transition-all duration-200 ${
                                  isDocumentOwner(doc) 
                                    ? 'text-gray-800 hover:text-green-600 hover:underline' 
                                    : 'text-gray-500 cursor-not-allowed'
                                }`}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  
                                  // Prevent multiple rapid clicks
                                  if (isNavigating) {
                                    return;
                                  }
                                  
                                  if (isDocumentOwner(doc) && doc.path) {
                                    setIsNavigating(true);
                                    
                                    // Clear any existing timeout
                                    if (navigationTimeout) {
                                      clearTimeout(navigationTimeout);
                                    }
                                    
                                    try {
                                      // Navigate to diffuse page with the specific folder parameter
                                      const folderPath = doc.path;
                                      const documentName = doc.nom_document || doc.nom_doc;
                                      
                                      console.log('🚀 Navigating to folder:', folderPath);
                                      console.log('📄 Looking for document:', documentName);
                                      
                                      // Navigate with folder, docId and highlight parameters
                                      // DiffusePage will compute the correct page from the canonical list
                                      navigate(`/dashboard/diffuse?folder=${encodeURIComponent(folderPath)}&docId=${encodeURIComponent(doc.id_document)}&highlight=${encodeURIComponent(documentName)}`);
                                      
                                      // Longer delay to allow for smooth navigation and data loading
                                      const timeout = setTimeout(() => {
                                        setIsNavigating(false);
                                        console.log('✅ Navigation completed');
                                      }, 2500);
                                      
                                      setNavigationTimeout(timeout);
                                    } catch (error) {
                                      console.error('Navigation error:', error);
                                      setIsNavigating(false);
                                    }
                                  } else if (!isDocumentOwner(doc)) {
                                    toast({
                                      title: "Acces restricționat",
                                      description: "Poți naviga doar la documentele pe care le-ai încărcat tu.",
                                      status: "warning",
                                      duration: 3000,
                                      isClosable: true,
                                    });
                                  }
                                }}
                              >
                                {doc.path ? (
                                  (() => {
                                    const pathParts = doc.path.split('/').filter(part => part.trim() !== '');
                                    if (pathParts.length === 0) {
                                      return 'Root';
                                    } else if (pathParts.length === 1) {
                                      return pathParts[0];
                                    } else if (pathParts.length === 2) {
                                      return pathParts.join('/');
                                    } else {
                                      return `${pathParts[0]}/.../${pathParts.slice(-2).join('/')}`;
                                    }
                                  })()
                                ) : 'Locație necunoscută'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Tags Section */}
                        <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-200/50 mb-4 min-h-20">
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M5.5,7A1.5,1.5 0 0,1 4,5.5A1.5,1.5 0 0,1 5.5,4A1.5,1.5 0 0,1 7,5.5A1.5,1.5 0 0,1 5.5,7M21.41,11.58L12.41,2.58C12.05,2.22 11.55,2 11,2H4C2.89,2 2,2.89 2,4V11C2,11.55 2.22,12.05 2.59,12.41L11.58,21.41C11.95,21.78 12.45,22 13,22C13.55,22 14.05,21.78 14.41,21.41L21.41,14.41C21.78,14.05 22,13.55 22,13C22,12.45 21.78,11.95 21.41,11.58Z"/>
                              </svg>
                            </div>
                            <p className="text-xs text-purple-700 font-semibold uppercase">Tags</p>
                          </div>
                          
                          {doc.tags && Array.isArray(doc.tags) && doc.tags.length > 0 && doc.tags.some(tag => tag && (tag.tag_name || tag.name)) ? (
                            <div className="flex flex-wrap gap-2 min-h-8">
                              {doc.tags.filter(tag => tag && (tag.tag_name || tag.name)).map((tag, tagIndex) => {
                                const tagId = tag.id_tag || tag.id;
                                const tagName = tag.tag_name || tag.name;
                                const isSelected = selectedTags.includes(tagId);
                                return (
                                  <button
                                    key={tagIndex}
                                    data-interactive="true"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (tagId) {
                                        toggleTagSelection(tagId);
                                      }
                                    }}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all duration-200 hover:scale-105 max-w-32 truncate inline-flex items-center ${
                                      isSelected 
                                        ? 'bg-purple-500 text-white border-purple-500' 
                                        : 'bg-white text-purple-700 border-purple-300 hover:bg-purple-500 hover:text-white hover:border-purple-500'
                                    }`}
                                    title={`${isSelected ? 'Click pentru a deselecta' : 'Click pentru a selecta'}: "${tagName}"`}
                                  >
                                    {isSelected && (
                                      <span className="mr-1 text-xs">✓</span>
                                    )}
                                    {tagName}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 italic">
                              Nu există taguri pentru acest document
                            </p>
                          )}
                        </div>

                        {/* Description & Keywords Section */}
                        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/50 mb-4 min-h-20">
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center text-white">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                              </svg>
                            </div>
                            <p className="text-xs text-gray-700 font-semibold uppercase">Descriere & Keywords</p>
                          </div>
                          
                          <div className="space-y-3">
                            {/* Description */}
                            {doc.commentaire ? (
                              <div 
                                className="bg-white p-3 rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-100 transition-all duration-200 min-h-8 flex flex-col justify-center"
                                data-interactive="true"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedComment(doc.commentaire);
                                  setShowCommentModal(true);
                                }}
                                title={`Descriere completă: "${doc.commentaire}"`}
                              >
                                <p className="text-sm text-gray-700 italic line-clamp-2 break-words">
                                  "{doc.commentaire}"
                                </p>
                                {doc.commentaire.length > 80 && (
                                  <p className="text-xs text-gray-500 mt-1 text-right font-medium">
                                    Mai mult...
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 italic text-center py-2">
                                Nu există descriere
                              </p>
                            )}

                            {/* Keywords */}
                            <div>
                              <p className="text-xs text-gray-600 font-medium mb-2">Keywords:</p>
                              {doc.mot1 ? (
                                <div className="flex flex-wrap gap-2">
                                  {[doc.mot1, doc.mot2, doc.mot3, doc.mot4, doc.mot5]
                                    .filter(Boolean)
                                    .map((keyword, index) => (
                                      <button
                                        key={index}
                                        data-interactive="true"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleKeywordClick(keyword);
                                        }}
                                        className="px-3 py-1 rounded-lg text-xs font-medium bg-white text-blue-700 border border-blue-300 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all duration-200 max-w-32 truncate"
                                        title={`Click pentru a căuta: "${keyword}"`}
                                      >
                                        {keyword}
                                      </button>
                                    ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500 italic">
                                  Nu există keywords pentru acest document
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-auto pt-4">
                          <div className="border-t border-gray-200 mb-4"></div>
                          
                          <div className="flex space-x-3">
                            <button
                              data-interactive="true"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDocumentView(doc);
                              }}
                              className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 flex-1 font-semibold text-sm h-10"
                            >
                              <FaEye className="w-4 h-4" />
                              <span>Vizualizare</span>
                            </button>
                            
                            <button
                              data-interactive="true"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloaddoc(doc.nom_doc);
                              }}
                              className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 flex-1 font-semibold text-sm h-10"
                            >
                              <FaDownload className="w-4 h-4" />
                              <span>Descarcă</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  ))}
                </div>

            {/* Comment Modal */}
            <Modal
              isOpen={showCommentModal}
              onClose={() => setShowCommentModal(false)}
              size="xl"
              motionPreset="slideInBottom"
            >
              <ModalOverlay 
                bg="blackAlpha.300"
                backdropFilter="blur(10px)"
              />
              <ModalContent 
                borderRadius="xl"
                overflow="hidden"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ModalHeader 
                  bg="blue.50"
                  borderBottom="1px solid"
                  borderColor="gray.200"
                  py={4}
                >
                  Document Description
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody p={6}>
                        <MotionBox
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <Text
                      fontSize="lg"
                      color="gray.700"
                      whiteSpace="pre-wrap"
                      lineHeight="tall"
                    >
                      {expandedComment}
                  </Text>
                  </MotionBox>
                </ModalBody>
                <ModalFooter 
                  bg="gray.50"
                  borderTop="1px solid"
                  borderColor="gray.200"
                  py={4}
                >
                  <Button 
                    colorScheme="blue" 
                    onClick={() => setShowCommentModal(false)}
                    _hover={{ transform: 'translateY(-1px)' }}
                    transition="all 0.2s"
                  >
                    Close
                  </Button>
                </ModalFooter>
              </ModalContent>
            </Modal>

              {/* Modern Pagination */}
              <div className="flex justify-center items-center mt-8 gap-4 flex-col md:flex-row">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    First
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                </div>

                <div className="flex space-x-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      if (totalPages <= 5) return true;
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    })
                    .map((page, index, array) => {
                      if (index > 0 && array[index - 1] !== page - 1) {
                        return (
                          <React.Fragment key={`ellipsis-${page}`}>
                            <span className="px-2 py-2 text-gray-500">...</span>
                            <button
                              onClick={() => handlePageChange(page)}
                              className={`px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                                currentPage === page
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-white border border-gray-300 hover:bg-gray-100'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                            currentPage === page
                              ? 'bg-purple-600 text-white'
                              : 'bg-white border border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                </div>

                {/* Page Input Box */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 font-medium">Go to:</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    placeholder="Page"
                    className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const pageNumber = parseInt(e.target.value);
                        if (pageNumber >= 1 && pageNumber <= totalPages) {
                          handlePageChange(pageNumber);
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                  <span className="text-xs text-gray-500">of {totalPages}</span>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Last
                  </button>
                </div>
              </div>

              <p className="text-center mt-4 text-gray-500 text-sm">
                Showing {startIndex + 1} to {Math.min(endIndex, tableData.length)} of {tableData.length} results
              </p>
            </motion.div>
          )}

          {/* PDF Viewer Modal */}
          <PDFViewerModal
            isOpen={isOpen}
            onClose={closePopup}
            pdfUrl={pdfUrl}
            selectedDocument={selectedDocument}
          />
        </div>
      </div>
      
      {/* Navigation Loading Overlay */}
      {isNavigating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl border border-gray-200 flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Navigare la document</h3>
              <p className="text-sm text-gray-600">Se încarcă folderul și pagina specifică...</p>
              <p className="text-xs text-gray-500 mt-1">Se calculează poziția documentului</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

const DocumentTagsCell = ({ document, onTagClick }) => {
  // Get tags from the document object and ensure it's an array
  const tags = Array.isArray(document.tags) ? document.tags : [];

  if (!tags || tags.length === 0) {
    return <p className="text-sm text-gray-500">No tags</p>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(tag => {
        // Ensure we have the correct tag name
        const tagName = tag.tag_name || tag.name;
        if (!tagName) return null;

        return (
          <span
            key={tag.id_tag || tag.id}
            onClick={() => onTagClick(tagName)}
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium cursor-pointer transition-colors ${
              tag.is_predefined
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
            title={`Added by ${tag.added_by?.firstname || ''} ${tag.added_by?.lastname || ''} on ${tag.added_date || ''}`}
          >
            {tagName}
          </span>
        );
      })}
    </div>
  );
};

export default SearchPage;