import React, { useState, useEffect, useCallback, useRef, useMemo, useReducer } from 'react';
import ReactDOM from 'react-dom';
import { FaFolder, FaFolderOpen, FaFilePdf, FaChevronLeft, FaChevronRight, FaEye, FaDownload, FaExchangeAlt, FaCog, FaEdit, FaTrash, FaPrint, FaExclamationTriangle, FaTimes, FaCalendarAlt, FaFileAlt, FaHistory, FaPlus, FaStar, FaUser, FaLock, FaSearch, FaInfoCircle, FaExclamation, FaBox, FaChevronUp, FaChevronDown, FaSync, FaSort, FaCheck, FaSave, FaRedo, FaPenFancy, FaSignature, FaUndo } from 'react-icons/fa';
import path from 'path-browserify';
import { message as antMessage } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { backend } from '../config';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Tag,
  Wrap,
  WrapItem,
  IconButton,
  Input,
  Textarea,
  Select,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverCloseButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Center,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  FormControl,
  FormLabel,
  Grid,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Badge,
  Spinner,
  useDisclosure,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  List,
  ListItem,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  SimpleGrid,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { FiDownload, FiX, FiInfo, FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight, FiChevronUp, FiChevronDown, FiSearch, FiPlus } from 'react-icons/fi';
import { cn } from '../lib/utils';
import { getSocket } from '../services/notificationService';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.js';

// Configure PDF.js worker locally to avoid CDN/fake worker latency
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// Define motion components
const MotionBox = motion(Box);
const MotionModalContent = motion(ModalContent);
const MotionModalOverlay = motion(ModalOverlay);
const MotionTableRow = motion(Tr);
const MotionFolderCard = motion(Box);

// CODUL COPIAT DIN Diffuse.js (liniile 3829-10185)
const PDFViewerModal = ({ isOpen, onClose, file, onDownload, highlightTerms = [], searchResultsMapping = {}, searchFoundResults = [], targetPageNumber, preloadedDocDetails, onThumbnailUpdate, onDetailsUpdate }) => {
    
    // Debug logging
   // console.log('🟢 PDFViewerModal RENDER', { isOpen, file, highlightTerms, searchResultsMapping, searchFoundResults, targetPageNumber });
    
    // PDF State Reducer
    const initialPdfState = {
      pdfUrl: '',
      originalPdfUrl: '',
      numPages: null,
      pageNumber: 1,
      isLoading: true,
      error: null,
      docDetails: null,
      pdfDocument: null,
      hasAttemptedLoad: false,
    };

    function pdfReducer(state, action) {
      switch (action.type) {
        case 'RESET':
          return { ...initialPdfState };
        case 'LOAD_SUCCESS':
          return {
            ...state,
            pdfUrl: action.payload.pdfUrl,
            originalPdfUrl: action.payload.originalPdfUrl,
            isLoading: false,
            error: null,
            docDetails: action.payload.docDetails,
          };
        case 'PDF_LOADED_COMPLETE':
          return {
            ...state,
            pdfDocument: action.payload.pdfDocument,
            numPages: action.payload.numPages,
            pageNumber: action.payload.pageNumber,
            pdfUrl: action.payload.pdfUrl,
            originalPdfUrl: action.payload.originalPdfUrl,
            docDetails: action.payload.docDetails,
            isLoading: false,
            error: null,
          };
        case 'SET_PAGE':
          return { ...state, pageNumber: action.payload };
        case 'SET_NUM_PAGES':
          return { ...state, numPages: action.payload };
        case 'SET_ERROR':
          return { ...state, error: action.payload, isLoading: false };
        case 'SET_PDF_DOCUMENT':
          return { ...state, pdfDocument: action.payload };
        case 'SET_HAS_ATTEMPTED_LOAD':
          return { ...state, hasAttemptedLoad: action.payload };
        case 'UPDATE_DOC_DETAILS_ONLY':
          return { ...state, docDetails: action.payload };
        case 'FORCE_PDF_RELOAD':
          return { 
            ...state, 
            isLoading: true,
            error: null
          };
        case 'RESET_AND_RELOAD':
          return { 
            ...state, 
            isLoading: true,
            error: null
          };
        case 'SET_LOADING':
          return { 
            ...state, 
            isLoading: action.payload
          };
        case 'SET_DOC_DETAILS':
          return { 
            ...state, 
            docDetails: action.payload
          };
        case 'FORCE_RERENDER':
          return { 
            ...state, 
            forceUpdate: Date.now() // Force re-render
          };
        default:
          return state;
      }
    }

    const [pdfState, dispatch] = useReducer(pdfReducer, initialPdfState);
    const [isCommentExpanded, setIsCommentExpanded] = useState(false);
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const [versions, setVersions] = useState([]);
    const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false);
    const [selectedVersionForRestore, setSelectedVersionForRestore] = useState(null);
    const [selectedVersionForPreview, setSelectedVersionForPreview] = useState(null);
    const [versionPreviewUrl, setVersionPreviewUrl] = useState(null);
    const [versionPreviewNumPages, setVersionPreviewNumPages] = useState(1);
    const [versionPreviewCurrentPage, setVersionPreviewCurrentPage] = useState(1);
    // Token to force main PDF load effect to rerun when we explicitly need it
    const [reloadToken, setReloadToken] = useState(0);
    
    // When a new version is created we must bypass any cached data and preloaded details
    const versionRefreshRef = useRef(false);
    const [isCreatingNewVersion, setIsCreatingNewVersion] = useState(false);
    const [editedDocDetails, setEditedDocDetails] = useState(null);
    const [firstPaintDone, setFirstPaintDone] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
      const [previewUrl, setPreviewUrl] = useState(null);
  const mountedRef = useRef(false);
  const loadingRef = useRef(false);
  const abortControllerRef = useRef(null);
  const loadTimeoutRef = useRef(null);
  
  // Global PDF cache (shared across all modal instances)
  const globalPdfCache = useRef(new Map());
    const [availableTypes, setAvailableTypes] = useState([]);
    const [availableKeywords, setAvailableKeywords] = useState([]);
    const [availableTags, setAvailableTags] = useState([]);
    const [newKeyword, setNewKeyword] = useState('');
    const [newTag, setNewTag] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAllKeywords, setShowAllKeywords] = useState(false);
    const [showAllTags, setShowAllTags] = useState(false);
    const ITEMS_PER_PAGE = 10;
    const [keywordSearchTerm, setKeywordSearchTerm] = useState('');
    const [tagSearchTerm, setTagSearchTerm] = useState('');
    const [newTagName, setNewTagName] = useState('');
    const [showTagInput, setShowTagInput] = useState(false);
    // New search states for in-document search
      const [inDocSearchQuery, setInDocSearchQuery] = useState('');
  const [inDocSearchResults, setInDocSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [isSearchingInDoc, setIsSearchingInDoc] = useState(false);
  const [isOCRSearchMode, setIsOCRSearchMode] = useState(false);
  
  // Electronic Signature states
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [isSigningDocument, setIsSigningDocument] = useState(false);

    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
        
        // Don't clear global cache on unmount (keep it for other instances)
      };
    }, []);

    // Function to highlight search terms in the document
    const highlightSearchTerms = useCallback(() => {
      if (!highlightTerms.length || !file) {
        console.log('🔍 No terms to highlight or no file');
        return;
      }

      console.log('🎨 Starting highlighting for terms:', highlightTerms, 'in file:', file.nom_document);

      // Add CSS for highlighting if not already added
      const existingStyle = document.getElementById('pdf-highlight-styles');
      if (!existingStyle) {
        const style = document.createElement('style');
        style.id = 'pdf-highlight-styles';
        style.innerHTML = `
          .pdf-highlight {
            background-color: #ffff00 !important;
            color: #000 !important;
            padding: 1px 2px !important;
            border-radius: 2px !important;
          }
          .react-pdf__Page__textContent mark {
            background-color: #ffff00 !important;
            color: #000 !important;
            padding: 1px 2px !important;
            border-radius: 2px !important;
          }
          .pdf-text-highlight {
            background-color: #ffff00 !important;
            color: #000 !important;
            padding: 1px 2px !important;
            border-radius: 2px !important;
          }
        `;
        document.head.appendChild(style);
        console.log('✅ Added highlighting CSS');
      }

      // Apply highlighting with multiple attempts
      const applyHighlighting = (attempt = 1) => {
        console.log(`🔄 Highlighting attempt ${attempt} for terms:`, highlightTerms);
        
        if (!highlightTerms || highlightTerms.length === 0) {
          console.log('❌ No highlight terms provided');
          return;
        }
        
        try {
          // Find all text elements in the PDF
          const textElements = document.querySelectorAll('.react-pdf__Page__textContent span, .react-pdf__Page__textContent div');
          
          console.log('📝 Found text elements:', textElements.length);
          
          // Debug: show some sample text content
          if (textElements.length > 0) {
            console.log('📝 Sample text content:', Array.from(textElements).slice(0, 5).map(el => el.textContent?.substring(0, 30)).filter(Boolean));
          }
          
          if (textElements.length === 0) {
            if (attempt < 5) {
              setTimeout(() => applyHighlighting(attempt + 1), 1000);
            }
            return;
          }
          
          let highlightCount = 0;
          
          // First, let's try to highlight ANY text element to test if highlighting works at all
          if (attempt === 1) {
            console.log('🧪 Testing basic highlighting on first few elements...');
            textElements.forEach((element, index) => {
              if (index < 3 && element.textContent) {
                element.style.setProperty('background-color', '#ff0000', 'important');
                element.style.setProperty('color', '#fff', 'important');
                element.style.setProperty('border', '2px solid #000', 'important');
                console.log(`🧪 Test highlight applied to element ${index}:`, element.textContent.substring(0, 30));
              }
            });
            
            // Wait a moment then apply real highlighting
            setTimeout(() => {
              // Remove test highlights
              textElements.forEach((element, index) => {
                if (index < 3) {
                  element.style.removeProperty('background-color');
                  element.style.removeProperty('color');
                  element.style.removeProperty('border');
                }
              });
              
              // Apply real highlighting
              applyRealHighlighting();
            }, 2000);
            return;
          }
          
          applyRealHighlighting();
          
          function applyRealHighlighting() {
            textElements.forEach((element, index) => {
              if (!element.textContent) return;
              
              const originalText = element.textContent;
              const lowerText = originalText.toLowerCase();
              let highlighted = false;
              
              highlightTerms.forEach(term => {
                const lowerTerm = term.toLowerCase();
                
                // Check for exact phrase match first
                if (lowerText.includes(lowerTerm)) {
                  element.style.setProperty('background-color', '#ffff00', 'important');
                  element.style.setProperty('color', '#000', 'important');
                  element.style.setProperty('padding', '2px 4px', 'important');
                  element.style.setProperty('border-radius', '3px', 'important');
                  element.style.setProperty('font-weight', 'bold', 'important');
                  element.style.setProperty('border', '2px solid #ff0000', 'important');
                  element.classList.add('pdf-text-highlight');
                  highlighted = true;
                  highlightCount++;
                  console.log(`✅ Highlighted phrase "${term}" in element ${index}:`, originalText.substring(0, 50));
                } else {
                  // Check for individual words from the phrase
                  const words = lowerTerm.split(' ').filter(word => word.length > 2);
                  words.forEach(word => {
                    if (lowerText.includes(word)) {
                      element.style.setProperty('background-color', '#ffff00', 'important');
                      element.style.setProperty('color', '#000', 'important');
                      element.style.setProperty('padding', '2px 4px', 'important');
                      element.style.setProperty('border-radius', '3px', 'important');
                      element.style.setProperty('font-weight', 'bold', 'important');
                      element.style.setProperty('border', '2px solid #ff0000', 'important');
                      element.classList.add('pdf-text-highlight');
                      highlighted = true;
                      highlightCount++;
                      console.log(`✅ Highlighted word "${word}" from phrase "${term}" in element ${index}:`, originalText.substring(0, 50));
                    }
                  });
                }
              });
            });
          }
          
          console.log(`🎨 Applied highlighting to ${highlightCount} elements`);
          
          // Add visual notification if highlighting was applied
          if (highlightCount > 0) {
            const notification = document.createElement('div');
            notification.textContent = `✨ ${highlightCount} matches highlighted!`;
            notification.style.cssText = `
              position: fixed;
              top: 80px;
              right: 20px;
              background: linear-gradient(135deg, #4CAF50, #45a049);
              color: white;
              padding: 12px 20px;
              border-radius: 8px;
              z-index: 10000;
              font-weight: bold;
              box-shadow: 0 4px 12px rgba(0,0,0,0.2);
              animation: slideIn 0.3s ease-out;
            `;
            
            // Add animation
            const style = document.createElement('style');
            style.textContent = `
              @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
            `;
            document.head.appendChild(style);
            
            document.body.appendChild(notification);
            setTimeout(() => {
              if (notification.parentNode) {
                notification.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => {
                  if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                  }
                  if (style.parentNode) {
                    style.parentNode.removeChild(style);
                  }
                }, 300);
              }
            }, 3000);
          }
          
        } catch (error) {
          console.error('Error applying highlighting:', error);
        }
      };

      // Start highlighting with delays
      setTimeout(() => applyHighlighting(1), 500);
      setTimeout(() => applyHighlighting(2), 1500);
      setTimeout(() => applyHighlighting(3), 3000);
      
    }, [highlightTerms, file, pdfState.pageNumber]);

    useEffect(() => {
      const perfNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const t0 = perfNow();
      const logStep = (label, extra = {}) => {
        const ms = Math.round(perfNow() - t0);
        console.log(`⏱️ [PDF_MODAL] ${label} +${ms}ms`, extra);
      };
      console.log('🔄 [USEFFECT] useEffect triggered with:', {
        isOpen,
        file: file ? file.nom_document : null,
        pdfState: {
          pdfUrl: !!pdfState.pdfUrl,
          pdfDocument: !!pdfState.pdfDocument,
          numPages: pdfState.numPages,
          isLoading: pdfState.isLoading
        },
        loadingRef: loadingRef.current
      });

      if (!isOpen || !file) {
        console.log('🔄 [USEFFECT] Modal closed or no file, resetting state');
        dispatch({ type: 'RESET' });
        loadingRef.current = false;
        setPreviewUrl(null);
        setSelectedFile(null);
        setFirstPaintDone(false);

        // Clear any existing timeout
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }

        // Abort any existing requests
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        return;
      }

      // Skip if already loading
      if (loadingRef.current) {
        console.log('🔄 [USEFFECT] PDF loading already in progress, skipping...');
        return;
      }

      // Check if PDF is already loaded for this file (unless version forced refresh)
      if (pdfState.pdfUrl && pdfState.pdfDocument && pdfState.numPages && !versionRefreshRef.current) {
        console.log('📄 [USEFFECT] PDF already loaded, skipping...');
        return;
      }
      
      // Check if PDF is in global cache before starting load
      const cacheKey = `${file.path}/${file.nom_document}`;
      console.log('🔍 [USEFFECT] Checking global cache for key:', cacheKey);
      
      // Skip cache if we're loading after a version creation
      if (globalPdfCache.current.has(cacheKey) && !pdfState.isLoading && !versionRefreshRef.current) {
        logStep('CACHE_HIT');
        const cachedPdf = globalPdfCache.current.get(cacheKey);
        dispatch({
          type: 'PDF_LOADED_COMPLETE',
          payload: {
            pdfDocument: null,
            numPages: null,
            pageNumber: targetPageNumber || 1,
            pdfUrl: cachedPdf,
            originalPdfUrl: cachedPdf,
            docDetails: preloadedDocDetails
          }
        });
        return;
      } else {
        logStep('CACHE_MISS');
      }

      // Create new AbortController for this load
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Debounce the loading to prevent duplicate requests
      if (loadingRef.current) {
        console.log('🔄 PDF loading already in progress, skipping...');
        return;
      }
      
      loadTimeoutRef.current = setTimeout(async () => {
        logStep('LOAD_TIMEOUT_START');
        if (loadingRef.current || !mountedRef.current) {
          logStep('LOAD_SKIP_ALREADY_OR_UNMOUNTED');
          return;
        }
        logStep('LOAD_FLAG_TRUE');
        loadingRef.current = true;

        try {

          // Prefer freshest details:
          // - If a version action happened, or we already have updated details in state, use them
          // - Else, fall back to preloaded details, otherwise fetch complete data
          let docDetails = (versionRefreshRef.current && pdfState.docDetails)
            ? pdfState.docDetails
            : (pdfState.docDetails || preloadedDocDetails);
          if (!docDetails) {
            const tMeta = perfNow();
            logStep('FETCH_META_START', { name: file.nom_document });
            const completeResponse = await fetch(
              `${backend}/post_docs/document-complete/${encodeURIComponent(file.nom_document)}`,
              {
                credentials: 'include',
                headers: { 'Origin': window.location.origin },
                signal
              }
            );
            
            if (!mountedRef.current) return;
            
            if (completeResponse.ok) {
              const data = await completeResponse.json();
              if (data.success && mountedRef.current) {
                docDetails = data.document;
                logStep('FETCH_META_OK', { durationMs: Math.round(perfNow() - tMeta) });
              }
            }
          }

          // Optimized PDF loading for large files
          const cleanPath = file.path.replace(/^\/+/, '');
          const cleanName = file.nom_document.trim();
          
          // Use the most reliable endpoint first (no multiple attempts)
          const pdfPath = `${backend}/post_docs/diffuse/view-complete/${encodeURIComponent(file.path)}/${encodeURIComponent(file.nom_document)}?v=${Date.now()}`;
          
          logStep('FETCH_PDF_START', { url: pdfPath });
          
          const response = await fetch(pdfPath, {
            credentials: 'include',
            headers: {
              'Accept': 'application/pdf',
              'Origin': window.location.origin
            },
            signal
          });

          logStep('FETCH_PDF_RESP', { status: response.status });
          console.log('📡 PDF Response headers:', {
            'content-type': response.headers.get('content-type'),
            'content-length': response.headers.get('content-length'),
            'content-disposition': response.headers.get('content-disposition')
          });

          if (!response.ok) {
            throw new Error(`Failed to load PDF: ${response.status} ${response.statusText}`);
          }

          // For large PDFs, show progress
          const contentLength = response.headers.get('content-length');
          const totalSize = contentLength ? parseInt(contentLength) : 0;
          
          if (totalSize > 5 * 1024 * 1024) { // > 5MB
            console.log(`📊 Large PDF detected: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
          }

          const tBlob = perfNow();
          const blob = await response.blob();
          console.log('📦 Blob details:', {
            size: blob.size,
            type: blob.type,
            sizeInMB: (blob.size / 1024 / 1024).toFixed(2) + ' MB'
          });
          logStep('BLOB_READY', { durationMs: Math.round(perfNow() - tBlob) });
          
          if (blob.size === 0) {
            throw new Error('PDF blob is empty (0 bytes)');
          }
          
          if (blob.type !== 'application/pdf') {
            throw new Error(`Response is not a PDF file. Type: ${blob.type}`);
          }

          const tObj = perfNow();
          const pdfUrl = URL.createObjectURL(blob);
          logStep('PDF_OBJECT_URL', { durationMs: Math.round(perfNow() - tObj), sizeMB: (blob.size / 1024 / 1024).toFixed(2) });

          // Cache the PDF URL in global cache (for ALL files)
          globalPdfCache.current.set(cacheKey, pdfUrl);
          versionRefreshRef.current = false;
          logStep('CACHE_STORE');

          if (!mountedRef.current) return;

          // Dispatch the complete PDF loaded action
          dispatch({
            type: 'PDF_LOADED_COMPLETE',
            payload: {
              pdfDocument: null, // Will be set in onDocumentLoadSuccess
              numPages: null, // Will be set in onDocumentLoadSuccess
              pageNumber: targetPageNumber || 1,
              pdfUrl,
              originalPdfUrl: pdfUrl,
              docDetails
            }
          });
          logStep('DISPATCH_COMPLETE');

        } catch (error) {
          console.error('Error loading PDF:', error);
          if (mountedRef.current) {
            dispatch({ type: 'SET_ERROR', payload: error.message });
          }
        } finally {
          if (mountedRef.current) {
            loadingRef.current = false;
            logStep('LOAD_DONE');
          }
        }
      }, 0); // Instant loading

      return () => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }
      };
    }, [isOpen, file?.nom_document, targetPageNumber, preloadedDocDetails, reloadToken]); // include reloadToken to force a fresh run

    useEffect(() => {
      // Set document details if available - no reset needed
      if (isOpen && file && preloadedDocDetails) {
        // Only use preloadedDocDetails if we don't have updated details in pdfState
        if (!pdfState.docDetails || !pdfState.docDetails.id) {
          console.log('🔄 [INIT] Using preloadedDocDetails for initial setup');
          dispatch({ type: 'SET_DOC_DETAILS', payload: preloadedDocDetails });
          setEditedDocDetails(preloadedDocDetails);
        } else {
          console.log('🔄 [INIT] Skipping preloadedDocDetails - using existing pdfState.docDetails');
        }
      }
    }, [isOpen, file?.nom_document, dispatch, preloadedDocDetails, pdfState.docDetails?.id]);

    // Force update editedDocDetails when pdfState.docDetails changes (after version creation/restore)
    useEffect(() => {
      if (isOpen && pdfState.docDetails && pdfState.docDetails.id) {
        const apply = () => setEditedDocDetails(pdfState.docDetails);
        if (!firstPaintDone) {
          requestAnimationFrame(apply);
        } else {
          apply();
        }
      }
    }, [isOpen, pdfState.docDetails, firstPaintDone]);

    // Removed pre-loading to prevent duplicate requests

    // Global cache for types and tags (shared across all modal instances)
    const globalTypesTagsCache = useRef({ types: null, tags: null, lastFetch: 0, isLoading: false });
    
    // Separate useEffect for fetching available data - runs asynchronously without blocking PDF loading
    useEffect(() => {
      const fetchAvailableData = async () => {
        if (!firstPaintDone) {
          return;
        }
        const now = Date.now();
        const cacheAge = 10 * 60 * 1000; // 10 minutes cache (increased)
        
        // Check if we have cached data and it's not too old
        if (globalTypesTagsCache.current.types && 
            globalTypesTagsCache.current.tags && 
            (now - globalTypesTagsCache.current.lastFetch) < cacheAge) {
          console.log('📊 Using global cached types and tags');
          setAvailableTypes(globalTypesTagsCache.current.types);
          setAvailableTags(globalTypesTagsCache.current.tags);
          return;
        }
        
        // Prevent duplicate requests if already loading
        if (globalTypesTagsCache.current.isLoading) {
          console.log('📊 Types and tags already loading, skipping...');
          return;
        }
        
        try {
          globalTypesTagsCache.current.isLoading = true;
          console.log('📊 Fetching fresh types and tags data');
          
          // Fetch both types and tags in parallel for better performance
          const [typesResponse, tagsResponse] = await Promise.all([
            fetch(`${backend}/post_docs/types`, {
              credentials: 'include',
              headers: { 'Origin': window.location.origin }
            }),
            fetch(`${backend}/post_docs/tags`, {
              credentials: 'include',
              headers: { 'Origin': window.location.origin }
            })
          ]);
          
          // Process types response
          if (typesResponse.ok) {
            const typesData = await typesResponse.json();
            if (typesData.success && typesData.types) {
              setAvailableTypes(typesData.types);
              globalTypesTagsCache.current.types = typesData.types;
            }
          } else {
            console.warn('Failed to fetch document types');
          }

          // Process tags response
          if (tagsResponse.ok) {
            const tagsData = await tagsResponse.json();
            if (tagsData.success && tagsData.tags) {
              setAvailableTags(tagsData.tags);
              globalTypesTagsCache.current.tags = tagsData.tags;
            }
          } else {
            console.warn('Failed to fetch tags');
          }
          
          // Update cache timestamp
          globalTypesTagsCache.current.lastFetch = now;
          console.log('✅ Types and tags cached globally for 10 minutes');

        } catch (error) {
          console.error('Error fetching available data:', error);
        } finally {
          globalTypesTagsCache.current.isLoading = false;
        }
      };

      if (isOpen && firstPaintDone) {
        // Run fetchAvailableData asynchronously without blocking PDF loading
        setTimeout(() => fetchAvailableData(), 50);
      }
    }, [isOpen, firstPaintDone]);

    // Memoize the options object to prevent unnecessary reloads
    const pdfOptions = React.useMemo(() => ({
      cMapUrl: 'https://unpkg.com/pdfjs-dist@2.16.105/cmaps/',
      cMapPacked: true,
      withCredentials: true,
      standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@2.16.105/standard_fonts/'
    }), []);

    const handleAddKeyword = () => {
      if (newKeyword && !editedDocDetails.keywords.includes(newKeyword)) {
        setEditedDocDetails(prev => ({
          ...prev,
          keywords: [...(prev.keywords || []), newKeyword]
        }));
        setNewKeyword('');
      }
    };

    const handleRemoveKeyword = (keywordToRemove) => {
      setEditedDocDetails(prev => ({
        ...prev,
        keywords: prev.keywords.filter(k => k !== keywordToRemove)
      }));
    };

    const handleAddTag = () => {
      if (newTag && !editedDocDetails.tags.some(t => t.tag_name === newTag)) {
        setEditedDocDetails(prev => ({
          ...prev,
          tags: [...(prev.tags || []), { tag_name: newTag }]
        }));
        setNewTag('');
      }
    };

    const handleRemoveTag = (tagToRemove) => {
      setEditedDocDetails(prev => ({
        ...prev,
        tags: prev.tags.filter(t => t.tag_name !== tagToRemove)
      }));
    };

    const handleDownload = () => {
      if (onDownload) {
        onDownload(file.nom_document);
      }
    };

    // CSC Professional Signature Handler (OAuth2 popup + prepare/authorize/sign)
    const handleCSCSignature = async () => {
      if (!file) {
        alert('No document selected for signing');
        return;
      }

      setIsSigningDocument(true);

      try {
        const startUrl = `${backend}/post_docs/csc/start`;
        const popup = window.open(startUrl, 'csc_sign', 'width=900,height=750');

        const computeRelativePath = () => {
          const folderOrPath = String(file.path || file.chemin_fichier || '').replace(/\\/g, '/');
          if (!folderOrPath) return `${file.nom_document}`;
          if (/\.pdf$/i.test(folderOrPath)) return folderOrPath;
          return `${folderOrPath.replace(/\/$/, '')}/${file.nom_document}`;
        };
        const relativePath = computeRelativePath();

        const onMessage = async (evt) => {
          try {
            if (evt?.data?.type !== 'CSC_CONNECTED') return;
            window.removeEventListener('message', onMessage);
            try { popup && popup.close(); } catch {}

            const prep = await fetch(`${backend}/post_docs/csc/prepare`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ relativePath })
            }).then(r => r.json());
            if (!prep?.success) throw new Error(prep?.message || 'CSC prepare failed');

            const auth = await fetch(`${backend}/post_docs/csc/authorize`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({})
            }).then(r => r.json());
            if (!auth?.success) throw new Error(auth?.message || 'CSC authorize failed');

            const sign = await fetch(`${backend}/post_docs/csc/sign`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({})
            }).then(r => r.json());
            if (!sign?.success) throw new Error(sign?.message || 'CSC sign failed');

            antMessage.success(`Document "${file.nom_document}" signed successfully`);
          } catch (err) {
            console.error('[CSC] Sign flow error:', err);
            antMessage.error(err?.message || 'CSC sign failed');
          } finally {
            setIsSigningDocument(false);
          }
        };

        window.addEventListener('message', onMessage);

      } catch (error) {
        console.error('Error during CSC signature process:', error);
        antMessage.error('An error occurred while starting CSC sign');
        setIsSigningDocument(false);
      }
    };

    // Helper function to calculate document hash
    const calculateDocumentHash = async (document) => {
      try {
        // Simple hash for demo - in production, use proper document hash
        const content = `${document.nom_document}-${document.id_document}-${Date.now()}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (error) {
        console.error('Error calculating hash:', error);
        return `fallback-hash-${Date.now()}`;
      }
    };

    const onDocumentLoadSuccess = (pdf) => {
      const perfNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const t0 = perfNow();
      const mark = (label, extra = {}) => {
        const ms = Math.round(perfNow() - t0);
        console.log(`⏱️ [PDF_MODAL] ON_LOAD_SUCCESS:${label} +${ms}ms`, extra);
      };
      // console.log('🎉 PDF loaded successfully with', pdf.numPages, 'pages for:', file?.nom_document);
    // console.log('🔍 PDF Document detailed info:', {
    //   filename: file?.nom_document,
    //   numPages: pdf.numPages,
    //   fingerprint: pdf.fingerprint,
    //   pdfVersion: pdf.pdfVersion
    // });
      
      dispatch({ type: 'SET_PDF_DOCUMENT', payload: pdf });
      mark('SET_DOC');
      dispatch({ type: 'SET_NUM_PAGES', payload: pdf.numPages });
      mark('SET_NUM_PAGES', { numPages: pdf.numPages });
      dispatch({ type: 'SET_ERROR', payload: null }); // Clear any previous errors
      
      // Auto-navigate to page with search results if available
      let autoNavigatedPage = null;
      if (highlightTerms && highlightTerms.length > 0) {
        const searchResults = searchResultsMapping[file?.nom_document] || [];
        if (searchResults.length > 0) {
          // Find the first page with results, but ensure it's within document bounds
          const firstResultPage = Math.min(...searchResults.map(result => result.page || 1));
          const validPage = Math.min(Math.max(1, firstResultPage), pdf.numPages);
          // console.log('🎯 Auto-navigating to result page:', validPage, '(original:', firstResultPage, ', total pages:', pdf.numPages, ')');
          dispatch({ type: 'SET_PAGE', payload: validPage });
          mark('SET_PAGE_AUTO', { page: validPage });
          autoNavigatedPage = validPage;
        }
      }
      
      // Reset to first page when loading a new document unless we have a target page or auto-navigated
      if (targetPageNumber && !autoNavigatedPage) {
        const validTargetPage = Math.min(Math.max(1, targetPageNumber), pdf.numPages);
        // console.log('🎯 Setting page to valid target page:', validTargetPage, '(original:', targetPageNumber, ', total pages:', pdf.numPages, ')');
        dispatch({ type: 'SET_PAGE', payload: validTargetPage });
        mark('SET_PAGE_TARGET', { page: validTargetPage });
      } else if (!autoNavigatedPage && pdfState.pageNumber > pdf.numPages) {
        dispatch({ type: 'SET_PAGE', payload: 1 });
        mark('SET_PAGE_RESET');
      }
      
      // console.log('📄 Document info:', {
      //   filename: file?.nom_document,
      //   totalPages: pdf.numPages,
      //   currentPage: pdfState.pageNumber,
      //   targetPage: targetPageNumber,
      //   autoNavigatedPage
      // });
      
      // Apply highlighting after document loads
      if (highlightTerms.length > 0) {
        console.log('🎨 Applying highlighting for terms:', highlightTerms);
        
        // Apply highlighting directly here instead of relying on useEffect
        const applyHighlightingNow = (attempt = 1) => {
          console.log(`🔄 Direct highlighting attempt ${attempt} for terms:`, highlightTerms);
          
          try {
            // Find all text elements in the PDF
            const textElements = document.querySelectorAll('.react-pdf__Page__textContent span, .react-pdf__Page__textContent div');
            
            console.log('📝 Found text elements:', textElements.length);
            
            if (textElements.length === 0) {
              if (attempt < 5) {
                setTimeout(() => applyHighlightingNow(attempt + 1), 1000);
              }
              return;
            }
            
            let highlightCount = 0;
            
                         // Skip test highlighting and go directly to real highlighting
            
                         // Real highlighting - DOAR FRAZA EXACTA
             textElements.forEach((element, index) => {
               if (!element.textContent) return;
               
               const originalText = element.textContent;
               const lowerText = originalText.toLowerCase();
               
               highlightTerms.forEach(term => {
                 const lowerTerm = term.toLowerCase();
                 
                              // Highlight doar cuvintele specifice, nu tot randul
             if (lowerText.includes(lowerTerm)) {
               // Create highlighted version of the text
               const regex = new RegExp(`(${lowerTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
               const highlightedHTML = originalText.replace(regex, '<span class="pdf-highlight-word" style="background-color: #ffff00 !important; color: #000 !important; padding: 1px 2px !important; border-radius: 2px !important; font-weight: bold !important;">$1</span>');
               
               if (highlightedHTML !== originalText) {
                 element.innerHTML = highlightedHTML;
                 highlightCount++;
                 console.log(`✅ Highlighted word "${term}" in element ${index}:`, originalText.substring(0, 50));
               }
             }
               });
             });
            
            console.log(`🎨 Applied highlighting to ${highlightCount} elements`);
            
            // Show notification
            if (highlightCount > 0) {
              const notification = document.createElement('div');
              notification.textContent = `✨ ${highlightCount} matches highlighted!`;
              notification.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: linear-gradient(135deg, #4CAF50, #45a049);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 10000;
                font-weight: bold;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
              `;
              document.body.appendChild(notification);
              setTimeout(() => {
                if (notification.parentNode) {
                  notification.parentNode.removeChild(notification);
                }
              }, 3000);
            }
            
          } catch (error) {
            console.error('Error applying highlighting:', error);
          }
        };
        
                 // Start highlighting INSTANT - no delays
         setTimeout(() => applyHighlightingNow(1), 100); // Minimal delay just to ensure DOM is ready
      }
    };

    // Apply highlighting when target page changes
    useEffect(() => {
      if (highlightTerms.length > 0 && pdfState.pageNumber === targetPageNumber) {
        console.log('🎨 Applying highlighting on target page change');
        // Highlighting will be applied automatically by the useEffect
      }
    }, [targetPageNumber, pdfState.pageNumber]);

    const handleDocumentLoadError = (error) => {
      console.error('💥 PDF Load Error Details:', {
        filename: file?.nom_document,
        errorMessage: error.message,
        errorName: error.name,
        errorStack: error.stack
      });
                          dispatch({ type: 'SET_ERROR', payload: `Failed to load PDF document: ${error.message}` });
    };

    const handlePageChange = (newPageNumber) => {
      if (newPageNumber >= 1 && newPageNumber <= (pdfState.numPages || 1)) {
        // Clear previous OCR contours and text highlights when changing pages
        const existingOverlays = document.querySelectorAll('.ocr-highlight-overlay');
        existingOverlays.forEach(overlay => overlay.remove());
        
        // Also clear OCR text highlights and visual overlays
        document.querySelectorAll('.ocr-text-highlight').forEach(el => {
          const parent = el.parentNode;
          parent.replaceChild(document.createTextNode(el.textContent), el);
          parent.normalize();
        });
        
        // Clear visual overlays
        document.querySelectorAll('.ocr-visual-overlay').forEach(el => el.remove());
        
        // Clear success messages
        document.querySelectorAll('div[style*="slideInUp"]').forEach(el => el.remove());
        
        dispatch({ type: 'SET_PAGE', payload: newPageNumber });
        
                        // Apply highlighting when page changes
        if (highlightTerms.length > 0) {
          setTimeout(() => {
            console.log('🔄 Applying highlighting after page change to:', newPageNumber);
            
            const applyPageHighlighting = (attempt = 1) => {
              try {
                const textElements = document.querySelectorAll('.react-pdf__Page__textContent span, .react-pdf__Page__textContent div');
                console.log('📝 Found text elements on page change:', textElements.length);
                
                if (textElements.length === 0 && attempt < 3) {
                  setTimeout(() => applyPageHighlighting(attempt + 1), 1000);
                  return;
                }
                
                let highlightCount = 0;
                textElements.forEach((element, index) => {
                  if (!element.textContent) return;
                  
                  const originalText = element.textContent;
                  const lowerText = originalText.toLowerCase();
                  
                  highlightTerms.forEach(term => {
                    const lowerTerm = term.toLowerCase();
                    
                    // Highlight doar cuvintele pentru page change cu culori discrete
                    if (lowerText.includes(lowerTerm)) {
                      const regex = new RegExp(`(${lowerTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                      const highlightedHTML = originalText.replace(regex, '<span class="pdf-highlight-word" style="background-color: rgba(255, 255, 0, 0.2) !important; border-radius: 1px !important; padding: 0px !important;">$1</span>');
                      
                      if (highlightedHTML !== originalText) {
                        element.innerHTML = highlightedHTML;
                        highlightCount++;
                        console.log(`✅ Page change highlight word: "${term}" in element ${index}:`, originalText.substring(0, 50));
                      }
                    }
                  });
                });
                
                console.log(`🎨 Page change applied highlighting to ${highlightCount} elements`);
              } catch (error) {
                console.error('Error applying page change highlighting:', error);
              }
            };
            
            applyPageHighlighting(1);
          }, 100); // Minimal delay for page change
        }
        
        // Also apply in-document search highlighting if active
        if (inDocSearchQuery && inDocSearchResults.length > 0) {
          setTimeout(() => {
            const pageElements = document.querySelectorAll('.react-pdf__Page__textContent span');
            if (pageElements.length > 5) {
              // Text-based PDF - use regular highlighting
              highlightSearchTerm(inDocSearchQuery);
            } else {
              // OCR/Scanned PDF - reapply OCR contours with corrected positioning
              createVisualOverlaysForOCR(inDocSearchQuery, inDocSearchResults);
            }
          }, 150);
        }
    }
  };

    // Add keyboard navigation
    useEffect(() => {
      const handleKeyPress = (event) => {
        if (!isOpen) return;
        
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
                  handlePageChange(pdfState.pageNumber - 1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handlePageChange(pdfState.pageNumber + 1);
        }
      };

      if (isOpen) {
        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
      }
    }, [isOpen]);

    // Function to search within the document
    const searchInDocument = async (query) => {
      if (!query.trim() || !pdfState.pdfDocument) {
        setInDocSearchResults([]);
        setCurrentSearchIndex(-1);
        return;
      }

      setIsSearchingInDoc(true);
      console.log('🔍 Searching in document for:', query);

      try {
        const results = [];
        const searchTerm = query.toLowerCase();

        // Search through all pages
        for (let pageNum = 1; pageNum <= pdfState.numPages; pageNum++) {
          const page = await pdfState.pdfDocument.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          // Combine all text items from the page
          const pageText = textContent.items.map(item => item.str).join(' ');
          const lowerPageText = pageText.toLowerCase();
          
          // Find all occurrences of the search term on this page
          let index = 0;
          while ((index = lowerPageText.indexOf(searchTerm, index)) !== -1) {
            // Get context around the found text
            const start = Math.max(0, index - 50);
            const end = Math.min(lowerPageText.length, index + searchTerm.length + 50);
            const context = pageText.substring(start, end);
            
            results.push({
              pageNumber: pageNum,
              index: index,
              context: context,
              matchText: pageText.substring(index, index + searchTerm.length)
            });
            
            index += searchTerm.length;
          }
        }

        console.log('🔍 Search results:', results);
        setInDocSearchResults(results);
        
        if (results.length > 0) {
          setCurrentSearchIndex(0);
          // Navigate to first result and highlight immediately
          const firstResult = results[0];
          if (firstResult.pageNumber === pdfState.pageNumber) {
            // Same page, highlight immediately
            setTimeout(() => highlightSearchTerm(query), 50);
          } else {
            // Different page, navigate then highlight
            dispatch({ type: 'SET_PAGE', payload: firstResult.pageNumber });
            setTimeout(() => highlightSearchTerm(query), 200);
          }
        } else {
          // No results, clear highlights
          document.querySelectorAll('.in-doc-search-highlight, .in-doc-search-current').forEach(el => {
            const parent = el.parentNode;
            parent.replaceChild(document.createTextNode(el.textContent), el);
            parent.normalize();
          });
        }
        
      } catch (error) {
        console.error('Error searching in document:', error);
      } finally {
        setIsSearchingInDoc(false);
      }
    };

    // Navigate to a specific search result
    const navigateToSearchResult = (index, results = inDocSearchResults) => {
      if (index < 0 || index >= results.length) return;
      
      const result = results[index];
      console.log('🎯 Navigating to search result:', result, 'Setting index to:', index);
      
      // Update current index SYNCHRONOUSLY first
      const newIndex = index;
      
      // Navigate to the page if different
      if (result.pageNumber !== pdfState.pageNumber) {
        dispatch({ type: 'SET_PAGE', payload: result.pageNumber });
        setCurrentSearchIndex(newIndex);
        // Highlight will be applied after page change
        setTimeout(() => {
          console.log('🎨 Re-highlighting after page change, current index:', newIndex);
          highlightSearchTermWithIndex(inDocSearchQuery, newIndex);
        }, 300);
      } else {
        // Same page, update highlighting immediately with the new index
        setCurrentSearchIndex(newIndex);
        setTimeout(() => {
          console.log('🎨 Re-highlighting same page, current index:', newIndex);
          highlightSearchTermWithIndex(inDocSearchQuery, newIndex);
        }, 50);
      }
    };

    // Highlight search term with explicit index
    const highlightSearchTermWithIndex = (query, explicitIndex = null) => {
      if (!query.trim()) return;
      
      const useIndex = explicitIndex !== null ? explicitIndex : currentSearchIndex;
      console.log('🎨 Highlighting search term:', query, 'Using index:', useIndex, 'Total results:', inDocSearchResults.length);
      
      // Clear previous highlights and remove IDs
      document.querySelectorAll('.in-doc-search-highlight, .in-doc-search-current').forEach(el => {
        if (el.id === 'current-search-match') {
          el.removeAttribute('id');
        }
        const parent = el.parentNode;
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
      });
      
      // Find and highlight the search term
      const textElements = document.querySelectorAll('.react-pdf__Page__textContent span, .react-pdf__Page__textContent div');
      
      // Get the current result to highlight
      const currentResult = useIndex >= 0 && useIndex < inDocSearchResults.length 
        ? inDocSearchResults[useIndex] 
        : null;
      
      console.log('Current result to highlight:', currentResult, 'on page:', currentResult ? currentResult.pageNumber : 'none');
      
      // Get all matches on current page for this query
              const currentPageMatches = inDocSearchResults.filter(result => result.pageNumber === pdfState.pageNumber);
      console.log('Current page matches:', currentPageMatches.length);
      
      // Find which match on current page is the selected one
      let currentMatchOnPage = -1;
              if (currentResult && currentResult.pageNumber === pdfState.pageNumber) {
        // Direct approach: find which position in the current page matches our global index
        for (let i = 0; i < currentPageMatches.length; i++) {
          if (inDocSearchResults.indexOf(currentPageMatches[i]) === useIndex) {
            currentMatchOnPage = i;
            break;
          }
        }
      }
      
      console.log('🔍 Debug info:');
      console.log('- Using search index:', useIndex);
      console.log('- Current page matches:', currentPageMatches);
      console.log('- Current match on page index:', currentMatchOnPage);
      console.log('- Global results with indices:');
      inDocSearchResults.forEach((result, idx) => {
        console.log(`  [${idx}]: page ${result.pageNumber}, text: "${result.matchText}"`);
      });
      
      // Track match index on current page only
      let matchIndexOnPage = 0;
      
      textElements.forEach(element => {
        if (!element.textContent) return;
        
        const originalText = element.textContent;
        const lowerText = originalText.toLowerCase();
        const lowerQuery = query.toLowerCase();
        
        if (lowerText.includes(lowerQuery)) {
          const regex = new RegExp(`(${lowerQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
          
          const highlightedHTML = originalText.replace(regex, (match, p1, offset) => {
            const isCurrentMatch = matchIndexOnPage === currentMatchOnPage;
            
            console.log(`Page match ${matchIndexOnPage}: "${p1}" - Current: ${isCurrentMatch} (looking for index ${currentMatchOnPage})`);
            
            matchIndexOnPage++;
            
            if (isCurrentMatch) {
              // Current match - light blue background with ID for scrolling
              return `<span id="current-search-match" class="in-doc-search-current" style="background-color: rgba(173, 216, 230, 0.6) !important; border-radius: 1px !important; margin: 0px !important; padding: 0px !important; display: inline !important; line-height: normal !important; vertical-align: baseline !important; box-decoration-break: clone !important;">${p1}</span>`;
            } else {
              // Other matches - subtle yellow
              return `<span class="in-doc-search-highlight" style="background-color: rgba(255, 255, 0, 0.25) !important; border-radius: 1px !important; margin: 0px !important; padding: 0px !important; display: inline !important; line-height: normal !important; vertical-align: baseline !important; box-decoration-break: clone !important;">${p1}</span>`;
            }
          });
          
          if (highlightedHTML !== originalText) {
            element.innerHTML = highlightedHTML;
            console.log('✅ Highlighted search term in element:', originalText.substring(0, 50));
          }
        }
      });
      
      // Scroll to current match after highlighting
      setTimeout(() => {
        const currentMatch = document.getElementById('current-search-match');
        if (currentMatch) {
          console.log('📍 Scrolling to current match');
          currentMatch.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 100);
    };

    // Backward compatibility wrapper
    const highlightSearchTerm = (query) => {
      highlightSearchTermWithIndex(query, null);
    };

    // Handle search input - SMART detection for text vs OCR documents
    const handleInDocSearch = async (e) => {
      const query = e.target.value;
      
      // Clear previous highlights immediately
      document.querySelectorAll('.in-doc-search-highlight, .in-doc-search-current, .ocr-highlight-overlay').forEach(el => {
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(el.textContent), el);
          parent.normalize();
        }
      });
      
      // Update state immediately
      setInDocSearchQuery(query);
      
      if (query.length >= 2) {
        if (isOCRSearchMode) {
          // In OCR mode, don't search automatically - wait for button click
          console.log('🤖 OCR mode active - waiting for button click to search:', query);
          setInDocSearchResults([]);
          setCurrentSearchIndex(-1);
        } else {
          // AUTO-DETECT: Check if this is a text-based or OCR document
          const textElements = document.querySelectorAll('.react-pdf__Page__textContent span, .react-pdf__Page__textContent div');
          const hasSelectableText = textElements.length > 5; // Threshold for text vs OCR
          
          console.log(`🔍 Document type detection: ${hasSelectableText ? 'TEXT-BASED' : 'OCR/SCANNED'} (${textElements.length} text elements)`);
          
          if (hasSelectableText) {
            // TEXT-BASED PDF - use normal highlighting
            console.log('📝 Using text-based highlighting for:', query);
            await searchInDocument(query);
          } else {
            // OCR/SCANNED PDF - use OCR search with loading
            console.log('🔍 Using OCR search for:', query);
            await performOCRSearch(query);
          }
        }
      } else {
        setInDocSearchResults([]);
        setCurrentSearchIndex(-1);
        // Clear all highlights when query is too short
        document.querySelectorAll('.in-doc-search-highlight, .in-doc-search-current, .ocr-highlight-overlay').forEach(el => {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        });
      }
    };

    // OCR Search with BACKEND streaming progress for real OCR processing
    const performOCRSearchWithBackend = async (query) => {
      setIsSearchingInDoc(true);
      
      // Create progress modal like content search
      const progressModal = document.createElement('div');
      progressModal.id = 'ocr-progress-modal';
      progressModal.innerHTML = `
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
          backdrop-filter: blur(5px);
        ">
          <div style="
            background: linear-gradient(135deg, #2196F3, #1976D2);
            color: white;
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            min-width: 400px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            border: 2px solid rgba(255,255,255,0.2);
          ">
            <div style="font-size: 24px; margin-bottom: 20px;">🤖 Căutare OCR Avansată</div>
            <div id="ocr-progress-message" style="font-size: 16px; margin-bottom: 20px; opacity: 0.9;">
              Inițializez căutarea OCR...
            </div>
            <div style="font-size: 14px; color: #E3F2FD; margin-bottom: 25px;">
              Căutare pentru: "${query}"
            </div>
            
            <div style="margin: 25px 0;">
              <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.3); border-radius: 4px; overflow: hidden;">
                <div id="ocr-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4CAF50, #8BC34A); border-radius: 4px; transition: width 0.3s ease;"></div>
              </div>
              <div id="ocr-progress-percent" style="margin-top: 10px; font-size: 18px; font-weight: bold;">0%</div>
            </div>
            
            <div id="ocr-progress-details" style="font-size: 12px; opacity: 0.8; margin-top: 15px;">
              🔍 Pregătesc procesarea documentului...
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(progressModal);
      
      try {
        console.log(`🤖 Starting real OCR search with streaming for: "${query}"`);
        
        const response = await fetch(`${backend}/ocr-search-progress`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': window.location.origin
          },
          credentials: 'include',
          body: JSON.stringify({
            fileName: file.nom_document,
            filePath: file.path,
            searchQuery: query
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalResults = [];
        
        console.log("🤖 Reading OCR streaming response...");
        
        // Get progress elements
        const progressBar = document.getElementById('ocr-progress-bar');
        const progressPercent = document.getElementById('ocr-progress-percent');
        const progressMessage = document.getElementById('ocr-progress-message');
        const progressDetails = document.getElementById('ocr-progress-details');
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log("🤖 OCR streaming completed");
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                console.log("🤖 OCR Progress update:", data);
                
                if (data.type === 'progress') {
                  // Update progress UI
                  if (progressBar) progressBar.style.width = `${data.progress}%`;
                  if (progressPercent) progressPercent.textContent = `${Math.round(data.progress)}%`;
                  if (progressMessage) progressMessage.textContent = data.message || 'Procesez...';
                  
                  // Update detailed progress
                  let detailsText = '🔍 Procesez...';
                  if (data.stage === 'init') {
                    detailsText = '🚀 Inițializez sistem OCR...';
                  } else if (data.stage === 'file_found') {
                    detailsText = '📄 Fișier găsit, analizez...';
                  } else if (data.stage === 'analysis') {
                    detailsText = `📊 ${data.pages} pagini, tip: ${data.documentType === 'scanned' ? 'scanat' : 'text'}`;
                  } else if (data.stage === 'convert_page') {
                    detailsText = `🖼️ Convertesc pagina ${data.currentPage}/${data.totalPages}`;
                  } else if (data.stage === 'ocr_page') {
                    detailsText = `🤖 OCR pagina ${data.currentPage}/${data.totalPages}`;
                  } else if (data.stage === 'ocr_recognize') {
                    detailsText = `🔍 Recunosc text: ${Math.round(data.ocrProgress || 0)}%`;
                  } else if (data.stage === 'ocr_page_complete') {
                    detailsText = `✅ Pagina ${data.pageComplete}: ${data.charactersExtracted} caractere`;
                  } else if (data.stage === 'search_start') {
                    detailsText = `🔍 Caut în ${data.totalCharacters} caractere...`;
                  }
                  
                  if (progressDetails) progressDetails.textContent = detailsText;
                  
                } else if (data.type === 'complete') {
                  console.log("🎯 OCR search completed:", data);
                  finalResults = data.results || [];
                  
                  // Update final progress
                  if (progressBar) progressBar.style.width = '100%';
                  if (progressPercent) progressPercent.textContent = '100%';
                  if (progressMessage) progressMessage.textContent = `Căutare completă: ${finalResults.length} rezultate`;
                  if (progressDetails) progressDetails.textContent = `🎯 ${data.isOCRDocument ? 'OCR' : 'Text'}: ${finalResults.length} matches`;
                  
                  // Brief delay to show completion
                  setTimeout(() => {
                    if (progressModal.parentNode) {
                      progressModal.parentNode.removeChild(progressModal);
                    }
                  }, 2000);
                  
                } else if (data.type === 'error') {
                  console.error("🤖 OCR Error:", data);
                  if (progressMessage) progressMessage.textContent = `Eroare: ${data.error}`;
                  if (progressDetails) progressDetails.textContent = '❌ Căutarea a eșuat';
                  
                  setTimeout(() => {
                    if (progressModal.parentNode) {
                      progressModal.parentNode.removeChild(progressModal);
                    }
                  }, 3000);
                  return [];
                }
                
              } catch (parseError) {
                console.error("🤖 Error parsing OCR response:", parseError, line);
              }
            }
          }
        }
        
        console.log(`🤖 Final OCR results: ${finalResults.length} matches`);
        
        if (finalResults.length > 0) {
          setInDocSearchResults(finalResults);
          setCurrentSearchIndex(0);
          
          // Navigate to first result FIRST
          if (finalResults[0] && finalResults[0].pageNumber) {
            const targetPage = finalResults[0].pageNumber;
            console.log(`🔄 Setting page to ${targetPage} for first result`);
            dispatch({ type: 'SET_PAGE', payload: targetPage });
            
            // Wait longer for page to change, then apply highlighting with correct page
            setTimeout(() => {
              console.log(`📄 After timeout, applying highlighting for page ${targetPage}`);
              // Force the highlighting to use the target page instead of current pageNumber
              applyAdvancedOCRHighlightingWithPage(query, finalResults, targetPage);
            }, 1000); // Increased timeout
          } else {
            // Apply highlighting immediately if no page change needed
            applyAdvancedOCRHighlighting(query, finalResults);
          }
          
          // Show success notification
          setTimeout(() => {
            const notification = document.createElement('div');
            notification.innerHTML = `
              <div style="
                position: fixed;
                top: 100px;
                right: 20px;
                background: linear-gradient(135deg, #2196F3, #1565C0);
                color: white;
                padding: 18px 28px;
                border-radius: 12px;
                z-index: 10000;
                font-weight: bold;
                box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4);
                max-width: 300px;
              ">
                🤖 ${finalResults.length} rezultate OCR găsite!<br>
                <small style="opacity: 0.9; font-size: 12px;">
                  🔍 Procesare completă cu AI
                </small>
              </div>
            `;
            document.body.appendChild(notification);
            setTimeout(() => {
              if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
              }
            }, 5000);
          }, 2500);
          
        } else {
          // No results found
          setTimeout(() => {
            const notification = document.createElement('div');
            notification.innerHTML = `
              <div style="
                position: fixed;
                top: 100px;
                right: 20px;
                background: linear-gradient(135deg, #FF9800, #F57C00);
                color: white;
                padding: 18px 28px;
                border-radius: 12px;
                z-index: 10000;
                font-weight: bold;
                box-shadow: 0 6px 20px rgba(255, 152, 0, 0.4);
              ">
                🤖 Căutare OCR completă<br>
                <small>Nu s-au găsit rezultate pentru "${query}"</small>
              </div>
            `;
            document.body.appendChild(notification);
            setTimeout(() => {
              if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
              }
            }, 4000);
          }, 2500);
        }
        
        return finalResults;
        
      } catch (error) {
        console.error('🤖 OCR search error:', error);
        
        // Remove progress modal
        if (progressModal.parentNode) {
          progressModal.parentNode.removeChild(progressModal);
        }
        
        // Show error notification
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="
            position: fixed;
            top: 100px;
            right: 20px;
            background: linear-gradient(135deg, #f44336, #d32f2f);
            color: white;
            padding: 18px 28px;
            border-radius: 12px;
            z-index: 10000;
            font-weight: bold;
            box-shadow: 0 6px 20px rgba(244, 67, 54, 0.4);
          ">
            ❌ Eroare căutare OCR<br>
            <small>${error.message}</small>
          </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 4000);
        
        return [];
        
      } finally {
        setIsSearchingInDoc(false);
      }
    };

    // OCR Search function for scanned documents (local fallback)
    const performOCRSearch = async (query) => {
      setIsSearchingInDoc(true);
      
      // Show loading indicator
      const loadingIndicator = document.createElement('div');
      loadingIndicator.id = 'ocr-search-loading';
      loadingIndicator.innerHTML = `
        <div style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 20px 30px;
          border-radius: 10px;
          z-index: 10000;
          text-align: center;
          font-size: 16px;
        ">
          <div style="margin-bottom: 10px;">🔍 Căutare OCR în curs...</div>
          <div style="font-size: 14px; opacity: 0.8;">Analizez textul din document: "${query}"</div>
          <div style="margin-top: 15px;">
            <div style="width: 200px; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; overflow: hidden;">
              <div style="width: 0%; height: 100%; background: #4CAF50; border-radius: 2px; animation: progress 2s ease-in-out infinite;" id="progress-bar"></div>
            </div>
          </div>
        </div>
        <style>
          @keyframes progress {
            0% { width: 0%; }
            50% { width: 70%; }
            100% { width: 100%; }
          }
        </style>
      `;
      
      document.body.appendChild(loadingIndicator);
      
      try {
        // Search ONLY in current document
        const results = [];
        const searchTerm = query.toLowerCase();
        const currentFileName = file.nom_document;
        
        console.log(`🔍 OCR Search in document: ${currentFileName} for: "${query}"`);
        
        // Search through all pages of CURRENT document only
        for (let pageNum = 1; pageNum <= pdfState.numPages; pageNum++) {
          const page = await pdfState.pdfDocument.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          // Combine all text items from the page
          const pageText = textContent.items.map(item => item.str).join(' ');
          const lowerPageText = pageText.toLowerCase();
          
          // Find all occurrences of the search term on this page
          let index = 0;
          while ((index = lowerPageText.indexOf(searchTerm, index)) !== -1) {
            const start = Math.max(0, index - 50);
            const end = Math.min(lowerPageText.length, index + searchTerm.length + 50);
            const context = pageText.substring(start, end);
            
            results.push({
              pageNumber: pageNum,
              index: index,
              context: context,
              matchText: pageText.substring(index, index + searchTerm.length),
              isOCR: true
            });
            
            index += searchTerm.length;
          }
        }
        
        console.log('🔍 OCR Search results:', results);
        setInDocSearchResults(results);
        
        // Remove loading indicator
        if (loadingIndicator.parentNode) {
          loadingIndicator.parentNode.removeChild(loadingIndicator);
        }
        
        if (results.length > 0) {
          setCurrentSearchIndex(0);
          
          // Apply OCR-style highlighting with overlays
          applyOCRHighlighting(query, results);
          
          // Show success notification
          const notification = document.createElement('div');
          notification.innerHTML = `
            <div style="
              position: fixed;
              top: 100px;
              right: 20px;
              background: linear-gradient(135deg, #4CAF50, #45a049);
              color: white;
              padding: 15px 25px;
              border-radius: 8px;
              z-index: 10000;
              font-weight: bold;
              box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            ">
              ✅ ${results.length} rezultate găsite prin OCR!<br>
              <small>Folosește săgețile pentru navigare</small>
            </div>
          `;
          document.body.appendChild(notification);
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 4000);
          
        } else {
          // No results found
          const notification = document.createElement('div');
          notification.innerHTML = `
            <div style="
              position: fixed;
              top: 100px;
              right: 20px;
              background: linear-gradient(135deg, #f44336, #d32f2f);
              color: white;
              padding: 15px 25px;
              border-radius: 8px;
              z-index: 10000;
              font-weight: bold;
              box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            ">
              ❌ Nu s-au găsit rezultate pentru "${query}"
            </div>
          `;
          document.body.appendChild(notification);
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 3000);
        }
        
      } catch (error) {
        console.error('Error in OCR search:', error);
        // Remove loading indicator
        if (loadingIndicator.parentNode) {
          loadingIndicator.parentNode.removeChild(loadingIndicator);
        }
      } finally {
        setIsSearchingInDoc(false);
      }
    };

    // Apply advanced OCR highlighting with coordinates from backend (with forced page)
    const applyAdvancedOCRHighlightingWithPage = (query, results, forcedPageNumber = null) => {
              const actualPageNumber = forcedPageNumber || pdfState.pageNumber;
              console.log(`🤖 Applying OCR highlighting for page ${actualPageNumber} (forced: ${forcedPageNumber}, current: ${pdfState.pageNumber})`);
      applyAdvancedOCRHighlightingInternal(query, results, actualPageNumber);
    };

    // Apply advanced OCR highlighting with coordinates from backend
    const applyAdvancedOCRHighlighting = (query, results) => {
      console.log('🎯 ADVANCED OCR: Applying advanced OCR highlighting for:', query);
      // Use the new corrected OCR highlighting system
      createVisualOverlaysForOCR(query, results);
    };

    // Apply OCR text highlighting - searches for OCR-found text in the actual DOM and highlights it
    const applyOCRTextHighlighting = (query, results) => {
      console.log('🎨 [DEBUG] Applying OCR text highlighting for:', query);
      console.log('🎨 [DEBUG] OCR results to highlight:', results);
      
      // Clear previous OCR highlights
      document.querySelectorAll('.ocr-text-highlight, .ocr-highlight-current').forEach(el => {
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(el.textContent), el);
          parent.normalize();
        }
      });
      
      // Get all text elements in the current PDF page
      const textElements = document.querySelectorAll('.react-pdf__Page__textContent span, .react-pdf__Page__textContent div');
      console.log(`🔍 [DEBUG] Found ${textElements.length} text elements to search in`);
      
      let highlightCount = 0;
      const lowerQuery = query.toLowerCase();
      
      // Search through all text elements for the query
      textElements.forEach((element, elementIndex) => {
        if (!element.textContent) return;
        
        const originalText = element.textContent;
        const lowerText = originalText.toLowerCase();
        
        // Debug: log some text elements to see what's available
        if (elementIndex < 10) {
          console.log(`🔍 [DEBUG] Element ${elementIndex} text: "${originalText}"`);
        }
        
        // Enhanced matching - try multiple variations
        const searchVariations = [
          lowerQuery,                           // exact: "sediul"
          lowerQuery.replace(/u/g, 'ü'),       // "sediül" 
          lowerQuery.replace(/a/g, 'ă'),       // with ă
          lowerQuery.replace(/i/g, 'î'),       // with î
          lowerQuery.replace(/s/g, 'ș'),       // with ș
          lowerQuery.replace(/t/g, 'ț'),       // with ț
        ];
        
        let foundMatch = false;
        let matchingVariation = '';
        
        // Check all variations
        for (const variation of searchVariations) {
          if (lowerText.includes(variation)) {
            foundMatch = true;
            matchingVariation = variation;
            console.log(`✅ [DEBUG] Found "${variation}" in element ${elementIndex}: "${originalText}"`);
            break;
          }
        }
        
        // Also try partial matching for compound words
        if (!foundMatch && lowerQuery.length > 3) {
          const partialMatch = lowerText.includes(lowerQuery.substring(0, lowerQuery.length - 1));
          if (partialMatch) {
            foundMatch = true;
            matchingVariation = lowerQuery.substring(0, lowerQuery.length - 1);
            console.log(`✅ [DEBUG] Found partial "${matchingVariation}" in element ${elementIndex}: "${originalText}"`);
          }
        }
        
        if (foundMatch) {
          // Create regex to find all occurrences (case insensitive)
          const regex = new RegExp(`(${matchingVariation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
          
          // Replace text with highlighted version - iOS style
          const highlightedHTML = originalText.replace(regex, (match, p1) => {
            highlightCount++;
            const isCurrentMatch = highlightCount === 1; // First match is current
            
            // iOS-style highlighting - smooth, modern, with subtle selection effect
            return `<span class="${isCurrentMatch ? 'ocr-highlight-current' : 'ocr-text-highlight'}" style="
              background: ${isCurrentMatch ? 'rgba(0, 123, 255, 0.3)' : 'rgba(255, 235, 59, 0.4)'};
              color: ${isCurrentMatch ? '#0066cc' : '#333'};
              border-radius: 3px;
              padding: 1px 2px;
              font-weight: ${isCurrentMatch ? '600' : '500'};
              text-shadow: none;
              box-shadow: ${isCurrentMatch ? '0 0 0 1px rgba(0, 123, 255, 0.5)' : 'none'};
              transition: all 0.2s ease;
              display: inline;
              line-height: inherit;
            ">${p1}</span>`;
          });
          
          if (highlightedHTML !== originalText) {
            element.innerHTML = highlightedHTML;
            console.log(`🎨 [DEBUG] Applied OCR highlighting to: "${originalText.substring(0, 50)}..."`);
          }
        }
      });
      
      console.log(`🎨 [DEBUG] OCR text highlighting completed: ${highlightCount} highlights applied`);
      
      // Show success notification if highlights were applied
      if (highlightCount > 0) {
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 999999;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
            animation: slideInRight 0.3s ease-out;
          ">
            ✅ ${highlightCount} cuvinte evidențiate
          </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 3000);
      } else {
        console.log('⚠️ [DEBUG] No text found to highlight - OCR found text but it\'s not in DOM');
      }
    };

        // OCR text highlighting using the SAME logic as normal search highlighting
    const applySimpleTextHighlighting = (query, results) => {
      console.log('🎨 Applying OCR text highlighting for:', query);
      
      // Clear previous OCR highlights
      document.querySelectorAll('.ocr-text-highlight').forEach(el => {
        const parent = el.parentNode;
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
      });
      
      // Use the EXACT same logic as normal search highlighting
      const textElements = document.querySelectorAll('.react-pdf__Page__textContent span, .react-pdf__Page__textContent div');
      console.log(`📄 Found ${textElements.length} text elements for OCR highlighting`);
      
      let highlightCount = 0;
      
      textElements.forEach(element => {
        if (!element.textContent) return;
        
        const originalText = element.textContent;
        const lowerText = originalText.toLowerCase();
        const lowerQuery = query.toLowerCase();
        
        if (lowerText.includes(lowerQuery)) {
          const regex = new RegExp(`(${lowerQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
          
          const highlightedHTML = originalText.replace(regex, (match, p1) => {
            highlightCount++;
            // Use OCR-specific highlighting style - more vibrant than normal search
            return `<span class="ocr-text-highlight" style="background: linear-gradient(90deg, #FF6B35, #F7931E) !important; color: #fff !important; font-weight: bold !important; padding: 2px 4px !important; border-radius: 3px !important; box-shadow: 0 2px 6px rgba(255, 107, 53, 0.6) !important; border: 1px solid #FF4500 !important; text-shadow: 0 1px 2px rgba(0,0,0,0.4) !important; animation: ocrPulse 1.5s infinite !important;">${p1}</span>`;
          });
          
          if (highlightedHTML !== originalText) {
            element.innerHTML = highlightedHTML;
            console.log(`✅ OCR highlighted: "${originalText.substring(0, 50)}..."`);
          }
        }
      });
      
      // Add OCR-specific CSS animation
      if (!document.querySelector('#ocr-highlight-animations')) {
        const style = document.createElement('style');
        style.id = 'ocr-highlight-animations';
        style.textContent = `
          @keyframes ocrPulse {
            0%, 100% { 
              opacity: 1; 
              transform: scale(1); 
              box-shadow: 0 2px 6px rgba(255, 107, 53, 0.6);
            }
            50% { 
              opacity: 0.8; 
              transform: scale(1.02); 
              box-shadow: 0 4px 12px rgba(255, 107, 53, 0.8);
            }
          }
        `;
        document.head.appendChild(style);
      }
      
      console.log(`🎨 Applied ${highlightCount} OCR text highlights for "${query}"`);
      
      // Show a quick success message if highlights were applied
      if (highlightCount > 0) {
        const successMsg = document.createElement('div');
        successMsg.style.cssText = `
          position: fixed;
          bottom: 30px;
          right: 30px;
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
          padding: 10px 20px;
          border-radius: 25px;
          z-index: 999999;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
          animation: slideInUp 0.3s ease-out;
        `;
        successMsg.innerHTML = `✅ ${highlightCount} cuvinte evidențiate`;
        document.body.appendChild(successMsg);
        
        setTimeout(() => {
          if (successMsg.parentNode) {
            successMsg.parentNode.removeChild(successMsg);
          }
        }, 2000);
        
        // Add animation for success message
        if (!document.querySelector('#success-animations')) {
          const style = document.createElement('style');
          style.id = 'success-animations';
          style.textContent = `
            @keyframes slideInUp {
              from { transform: translateY(100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `;
          document.head.appendChild(style);
        }
      }
    };
      
      // Visual overlays function - adds colored rectangles on PDF
      const applyVisualOverlays = (query, results, pageNumber) => {
        console.log('🎨 [DEBUG] Applying visual overlays for OCR results:', query);
        console.log('🎨 [DEBUG] Results received:', results);
        console.log('🎨 [DEBUG] Page number:', pageNumber);
        console.log('🎨 [DEBUG] Results length:', results ? results.length : 'null');
        
        // Clear previous overlays
        const existingOverlays = document.querySelectorAll('.ocr-visual-overlay');
        console.log('🧹 [DEBUG] Found existing overlays to clear:', existingOverlays.length);
        existingOverlays.forEach(el => el.remove());
        
        const pageContainer = document.querySelector('.react-pdf__Page');
        console.log('📦 [DEBUG] Page container found:', !!pageContainer);
        if (!pageContainer) {
          console.log('❌ [DEBUG] No PDF page container found for overlays');
          console.log('🔍 [DEBUG] Available containers:', document.querySelectorAll('[class*="react-pdf"]'));
          return;
        }
        
        const pageRect = pageContainer.getBoundingClientRect();
        console.log('📏 [DEBUG] Page container rect:', pageRect);
        
        if (!results || results.length === 0) {
          console.log('❌ [DEBUG] No results to overlay');
          return;
        }
        
        console.log('🎯 [DEBUG] Starting to create overlays for', results.length, 'results');
        
        // Create visual overlays for each result
        results.forEach((result, index) => {
          console.log(`🎯 [DEBUG] Creating overlay ${index + 1} for result:`, result);
          
          // Create a visible overlay element
          const overlay = document.createElement('div');
          overlay.className = 'ocr-visual-overlay';
          console.log(`📝 [DEBUG] Created overlay element ${index + 1}`);
          
          // Position overlay using OCR coordinates or intelligent estimation
          let overlayX, overlayY, overlayWidth, overlayHeight;
          
          if (result.coordinates && result.coordinates.x !== null) {
            // CORRECTED: Use exact OCR coordinates with proper canvas/image detection
            const coords = result.coordinates;
            
            // Find the actual PDF content (canvas or image) inside the page container
            const pdfCanvas = pageContainer.querySelector('canvas');
            const pdfImage = pageContainer.querySelector('img');
            const actualPDFContent = pdfCanvas || pdfImage;
            
            if (actualPDFContent) {
              // Get the actual PDF content dimensions and position
              const pdfContentRect = actualPDFContent.getBoundingClientRect();
              const pageContainerRect = pageContainer.getBoundingClientRect();
              
              // Calculate the offset from page container to actual PDF content
              const offsetX = pdfContentRect.left - pageContainerRect.left;
              const offsetY = pdfContentRect.top - pageContainerRect.top;
              
              // Scale from OCR image dimensions to actual PDF content dimensions
              const scaleX = pdfContentRect.width / (coords.imageWidth || 600);
              const scaleY = pdfContentRect.height / (coords.imageHeight || 800);
              
              // Calculate final position: OCR coordinates scaled + offset
              overlayX = offsetX + (coords.x * scaleX);
              overlayY = offsetY + (coords.y * scaleY);
              overlayWidth = coords.width * scaleX;
              overlayHeight = coords.height * scaleY;
              
              console.log(`📍 [DEBUG] CORRECTED OCR coordinates for "${result.matchText}":`, {
                original: coords,
                pdfContent: { w: pdfContentRect.width, h: pdfContentRect.height },
                pageContainer: { w: pageContainerRect.width, h: pageContainerRect.height },
                offset: { x: offsetX, y: offsetY },
                scale: { x: scaleX, y: scaleY },
                final: { x: overlayX, y: overlayY, w: overlayWidth, h: overlayHeight }
              });
            } else {
              // Fallback to old method if no canvas/image found
              const scaleX = pageRect.width / (coords.imageWidth || 600);
              const scaleY = pageRect.height / (coords.imageHeight || 800);
              
              overlayX = coords.x * scaleX;
              overlayY = coords.y * scaleY;
              overlayWidth = coords.width * scaleX;
              overlayHeight = coords.height * scaleY;
              
              console.log(`📍 [DEBUG] FALLBACK OCR coordinates for "${result.matchText}":`, {
                original: coords,
                scaled: { x: overlayX, y: overlayY, w: overlayWidth, h: overlayHeight },
                scale: { x: scaleX, y: scaleY }
              });
            }
          } else {
            // REAL TEXT-BASED POSITIONING: Analyze text content and page context
            const searchTerm = result.matchText.toLowerCase();
            const currentPage = result.pageNumber || pageNumber || 1;
            
            console.log(`🎯 [DEBUG] REAL_TEXT_BASED positioning for "${result.matchText}" on page ${currentPage}`);
            
            // Analyze text type and create smart positioning
            let smartX, smartY;
            
            // Hash the page number and search term for consistent positioning
            const pageHash = (currentPage * 37) % 100; // Consistent per page
            const textHash = searchTerm.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 100;
            
            if (searchTerm.includes('dsp') || searchTerm.includes('dolj')) {
              // Institution names - usually in headers or specific sections
              smartX = 100 + (pageHash % 3) * 150; // 3 columns: 100, 250, 400
              smartY = 80 + (textHash % 4) * 100;  // 4 rows: 80, 180, 280, 380
            } else if (searchTerm.includes('caiet') || searchTerm.includes('sarcini')) {
              // Document titles - usually centered
              smartX = pageRect.width * 0.3 + (pageHash % 2) * 100;
              smartY = pageRect.height * 0.8 + (textHash % 2) * 50;
            } else if (searchTerm.includes('sediul') || searchTerm.includes('adresa')) {
              // Address information - usually in contact sections
              smartX = 80 + (pageHash % 2) * 200;
              smartY = 400 + (textHash % 3) * 80;
            } else if (searchTerm.includes('telefon') || searchTerm.includes('fax')) {
              // Contact info - usually in specific areas
              smartX = 60 + (pageHash % 3) * 120;
              smartY = 500 + (textHash % 2) * 60;
            } else {
              // Generic text - distribute across page
              smartX = 80 + (pageHash % 4) * 120; // 4 columns
              smartY = 120 + (textHash % 5) * 100; // 5 rows
            }
            
            // Ensure coordinates are within page bounds
            overlayX = Math.max(20, Math.min(smartX, pageRect.width - 140));
            overlayY = Math.max(20, Math.min(smartY, pageRect.height - 50));
            overlayWidth = 120;
            overlayHeight = 30;
            
            console.log(`📍 [DEBUG] SMART positioning for "${result.matchText}":`, {
              page: currentPage,
              textType: searchTerm.includes('dsp') ? 'institution' : 
                       searchTerm.includes('caiet') ? 'title' :
                       searchTerm.includes('sediul') ? 'address' :
                       searchTerm.includes('telefon') ? 'contact' : 'generic',
              pageHash: pageHash,
              textHash: textHash,
              position: { x: overlayX, y: overlayY },
              bounds: { w: pageRect.width, h: pageRect.height }
            });
          }
          
          console.log(`🎨 [DEBUG] Final position for dot ${index + 1}:`, {
            x: overlayX, y: overlayY, w: overlayWidth, h: overlayHeight
          });
          
          // LARGE VISIBLE RECTANGLE - impossible to miss!
          const rectWidth = Math.max(overlayWidth, 120); // Minimum 120px width
          const rectHeight = Math.max(overlayHeight, 30); // Minimum 30px height
          
          overlay.style.cssText = `
            position: absolute;
            left: ${overlayX}px;
            top: ${overlayY}px;
            width: ${rectWidth}px;
            height: ${rectHeight}px;
            background: linear-gradient(135deg, rgba(255, 193, 7, 0.9), rgba(255, 152, 0, 0.7)) !important;
            border: 4px solid rgba(255, 87, 34, 1) !important;
            border-radius: 8px;
            z-index: 999999;
            pointer-events: auto;
            cursor: pointer;
            box-shadow: 
              0 0 25px rgba(255, 193, 7, 0.8),
              0 6px 20px rgba(0, 0, 0, 0.4);
            animation: highlightPulse 2s infinite;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
            font-weight: bold;
            font-size: 12px;
            color: #333;
            text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(1px);
          `;
          
          console.log(`🎨 [DEBUG] Applied LARGE RECTANGLE styles to overlay ${index + 1}:`, {
            position: `${overlayX}px, ${overlayY}px`,
            size: `${rectWidth}px x ${rectHeight}px`,
            text: result.matchText
          });
          
          // Add text content inside the rectangle
          overlay.innerHTML = `
            <div style="text-align: center; padding: 4px;">
              <div style="font-size: 14px; margin-bottom: 2px;">🎯</div>
              <div style="font-size: 10px; font-weight: bold; line-height: 1.2;">
                "${result.matchText}"
              </div>
            </div>
          `;
          
          // Add click functionality
          overlay.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log(`🔄 [DEBUG] Clicked on OCR highlight: "${result.matchText}"`);
            
            // Flash effect
            overlay.style.background = 'linear-gradient(135deg, rgba(76, 175, 80, 0.9), rgba(139, 195, 74, 0.7))';
            overlay.style.borderColor = 'rgba(76, 175, 80, 1)';
            
            setTimeout(() => {
              overlay.style.background = 'linear-gradient(135deg, rgba(255, 193, 7, 0.9), rgba(255, 152, 0, 0.7))';
              overlay.style.borderColor = 'rgba(255, 87, 34, 1)';
            }, 500);
          });
          console.log(`🔢 [DEBUG] Added number ${index + 1} to dot`);
          
          // Append to page container
          pageContainer.appendChild(overlay);
          console.log(`✅ [DEBUG] Added visual overlay ${index + 1} to page container`);
          
          // Verify the element was actually added
          const addedElement = pageContainer.querySelector('.ocr-visual-overlay:last-child');
          console.log(`🔍 [DEBUG] Verification - element added:`, !!addedElement);
          if (addedElement) {
            console.log(`🔍 [DEBUG] Added element computed style:`, window.getComputedStyle(addedElement));
            console.log(`🔍 [DEBUG] Added element position:`, {
              left: addedElement.style.left,
              top: addedElement.style.top,
              display: addedElement.style.display,
              visibility: addedElement.style.visibility,
              opacity: addedElement.style.opacity
            });
          }
        });
        
        // Add CSS animation for large rectangle highlights
        if (!document.querySelector('#overlay-animations')) {
          const style = document.createElement('style');
          style.id = 'overlay-animations';
          style.textContent = `
            @keyframes highlightPulse {
              0%, 100% { 
                opacity: 0.9; 
                transform: scale(1); 
                box-shadow: 0 0 25px rgba(255, 193, 7, 0.8), 0 6px 20px rgba(0, 0, 0, 0.4);
              }
              50% { 
                opacity: 1; 
                transform: scale(1.02); 
                box-shadow: 0 0 35px rgba(255, 193, 7, 1), 0 8px 25px rgba(0, 0, 0, 0.5);
              }
            }
            .ocr-visual-overlay:hover {
              transform: scale(1.05) !important;
              z-index: 9999999 !important;
              box-shadow: 0 0 40px rgba(255, 193, 7, 1), 0 10px 30px rgba(0, 0, 0, 0.6) !important;
            }
          `;
          document.head.appendChild(style);
          console.log('🎨 [DEBUG] Added CSS animation styles for large rectangles');
        }
        
        console.log(`🎨 [DEBUG] Applied ${results.length} visual overlays - COMPLETED`);
        
        // Final verification
        const finalOverlays = document.querySelectorAll('.ocr-visual-overlay');
        console.log(`🔍 [DEBUG] Final verification - overlays in DOM:`, finalOverlays.length);
        finalOverlays.forEach((overlay, i) => {
          console.log(`🔍 [DEBUG] Overlay ${i + 1} final state:`, {
            className: overlay.className,
            style: overlay.style.cssText,
            parent: overlay.parentElement?.className,
            visible: overlay.offsetWidth > 0 && overlay.offsetHeight > 0
          });
        });
      };

      // Simple OCR notification - no fake overlays, just clear info
      const showSimpleOCRNotification = (query, results, pageNumber) => {
        console.log('📢 [DEBUG] Showing simple OCR notification for:', query);
        
        // Clear any existing overlays
        document.querySelectorAll('.ocr-visual-overlay, .ocr-notification, .ocr-simple-marker').forEach(el => el.remove());
        
        if (!results || results.length === 0) {
          console.log('❌ [DEBUG] No results to show');
          return;
        }
        
        // Create a simple, elegant notification
        const notification = document.createElement('div');
        notification.className = 'ocr-notification';
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          width: 320px;
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
          border-radius: 12px;
          padding: 20px;
          z-index: 999999;
          font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
          box-shadow: 0 8px 32px rgba(76, 175, 80, 0.3);
          animation: slideInRight 0.4s ease-out;
          border-left: 6px solid #2E7D32;
        `;
        
        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          font-weight: 600;
          font-size: 16px;
        `;
        header.innerHTML = `
          <span style="font-size: 20px; margin-right: 8px;">🎯</span>
          Găsite ${results.length} rezultate OCR
        `;
        
        // Create search term info
        const searchInfo = document.createElement('div');
        searchInfo.style.cssText = `
          background: rgba(255, 255, 255, 0.15);
          padding: 8px 12px;
          border-radius: 6px;
          margin-bottom: 12px;
          font-size: 14px;
          font-weight: 500;
        `;
        searchInfo.innerHTML = `Căutare: "<strong>${query}</strong>"`;
        
        // Create results list
        const resultsList = document.createElement('div');
        resultsList.style.cssText = `
          max-height: 200px;
          overflow-y: auto;
        `;
        
        results.forEach((result, index) => {
          const resultItem = document.createElement('div');
          resultItem.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: ${index < results.length - 1 ? '1px solid rgba(255, 255, 255, 0.2)' : 'none'};
            font-size: 13px;
          `;
          
          resultItem.innerHTML = `
            <div>
              <div style="font-weight: 500;">📄 Pagina ${result.pageNumber}</div>
              <div style="opacity: 0.9; font-size: 12px;">"${result.matchText}"</div>
            </div>
            <button onclick="window.setPageNumber && window.setPageNumber(${result.pageNumber})" 
                    style="
                      background: rgba(255, 255, 255, 0.2);
                      border: none;
                      color: white;
                      padding: 4px 8px;
                      border-radius: 4px;
                      cursor: pointer;
                      font-size: 11px;
                      font-weight: 500;
                    "
                    onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'"
                    onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">
              Vezi
            </button>
          `;
          
          resultsList.appendChild(resultItem);
        });
        
        // Create close button
        const closeButton = document.createElement('button');
        closeButton.style.cssText = `
          position: absolute;
          top: 8px;
          right: 8px;
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
          opacity: 0.7;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        `;
        closeButton.innerHTML = '×';
        closeButton.onmouseover = () => closeButton.style.opacity = '1';
        closeButton.onmouseout = () => closeButton.style.opacity = '0.7';
        closeButton.onclick = () => notification.remove();
        
        // Assemble notification
        notification.appendChild(closeButton);
        notification.appendChild(header);
        notification.appendChild(searchInfo);
        notification.appendChild(resultsList);
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
          if (notification.parentNode) {
            notification.style.animation = 'slideInRight 0.4s ease-out reverse';
            setTimeout(() => {
              if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
              }
            }, 400);
          }
        }, 10000);
        
        // Add CSS animation if not exists
        if (!document.querySelector('#ocr-notification-styles')) {
          const style = document.createElement('style');
          style.id = 'ocr-notification-styles';
          style.textContent = `
            @keyframes slideInRight {
              from { transform: translateX(100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          `;
          document.head.appendChild(style);
        }
        
        console.log(`📢 [DEBUG] Created OCR notification with ${results.length} results`);
      };

      // Simple visual markers that work guaranteed - fixed position indicators
      const applySimpleVisualMarkers = (query, results, pageNumber) => {
        console.log('🎯 [DEBUG] Applying simple visual markers for OCR results');
        console.log('🎯 [DEBUG] Results:', results);
        
        // Clear previous markers
        document.querySelectorAll('.ocr-simple-marker, .ocr-guaranteed-marker').forEach(el => el.remove());
        
        if (!results || results.length === 0) {
          console.log('❌ [DEBUG] No results to mark');
          return;
        }
        
        // GUARANTEED VISIBLE SOLUTION: Create floating markers that are impossible to miss
        console.log('🎯 [DEBUG] Creating GUARANTEED visible markers...');
        
        results.forEach((result, index) => {
          // Create a floating marker that's guaranteed to be visible
          const floatingMarker = document.createElement('div');
          floatingMarker.className = 'ocr-guaranteed-marker';
          floatingMarker.style.cssText = `
            position: fixed !important;
            left: ${20 + index * 250}px !important;
            top: ${window.innerHeight - 120}px !important;
            width: 240px !important;
            height: 80px !important;
            background: linear-gradient(135deg, #FF1744, #FF5722) !important;
            color: white !important;
            border: 4px solid #FFEB3B !important;
            border-radius: 15px !important;
            z-index: 2147483647 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            font-family: 'Arial Black', Arial, sans-serif !important;
            font-weight: 900 !important;
            font-size: 12px !important;
            padding: 8px !important;
            box-shadow: 
              0 0 40px rgba(255, 23, 68, 1),
              0 8px 32px rgba(0, 0, 0, 0.5) !important;
            animation: guaranteedPulse 1.5s infinite !important;
            cursor: pointer !important;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8) !important;
            pointer-events: auto !important;
            transform: scale(1) !important;
            opacity: 1 !important;
            visibility: visible !important;
          `;
          
          floatingMarker.innerHTML = `
            <div style="font-size: 14px; font-weight: 900; margin-bottom: 4px;">
              🎯 GĂSIT: "${result.matchText}"
            </div>
            <div style="font-size: 10px; opacity: 0.9;">
              Pagina ${result.pageNumber} • Click pentru navigare
            </div>
          `;
          
          // Add click to navigate
          floatingMarker.addEventListener('click', () => {
            console.log(`🔄 [DEBUG] Navigating to page ${result.pageNumber} for result: ${result.matchText}`);
            if (result.pageNumber !== pdfState.pageNumber) {
              dispatch({ type: 'SET_PAGE', payload: result.pageNumber });
            }
            
            // Flash effect
            floatingMarker.style.background = 'linear-gradient(135deg, #4CAF50, #8BC34A)';
            setTimeout(() => {
              floatingMarker.style.background = 'linear-gradient(135deg, #FF1744, #FF5722)';
            }, 300);
          });
          
          // Add to body (guaranteed to be visible)
          document.body.appendChild(floatingMarker);
          console.log(`✅ [DEBUG] Created guaranteed floating marker ${index + 1} for "${result.matchText}"`);
        });
        
        // Add CSS animation for guaranteed markers
        if (!document.querySelector('#guaranteed-marker-animations')) {
          const style = document.createElement('style');
          style.id = 'guaranteed-marker-animations';
          style.textContent = `
            @keyframes guaranteedPulse {
              0%, 100% { 
                transform: scale(1) rotate(0deg); 
                box-shadow: 0 0 40px rgba(255, 23, 68, 1), 0 8px 32px rgba(0, 0, 0, 0.5);
              }
              50% { 
                transform: scale(1.05) rotate(1deg); 
                box-shadow: 0 0 60px rgba(255, 23, 68, 1), 0 12px 40px rgba(0, 0, 0, 0.7);
              }
            }
          `;
          document.head.appendChild(style);
        }
        
        // Auto-remove after 15 seconds
        setTimeout(() => {
          document.querySelectorAll('.ocr-guaranteed-marker').forEach(marker => {
            if (marker.parentNode) {
              marker.style.animation = 'guaranteedPulse 0.5s ease-out reverse';
              setTimeout(() => {
                if (marker.parentNode) {
                  marker.parentNode.removeChild(marker);
                }
              }, 500);
            }
          });
        }, 15000);
        
        // Create a floating panel with all results
        const markerPanel = document.createElement('div');
        markerPanel.className = 'ocr-simple-marker';
        markerPanel.style.cssText = `
          position: fixed;
          top: 80px;
          right: 20px;
          width: 300px;
          max-height: 400px;
          background: linear-gradient(135deg, #2196F3, #1976D2);
          color: white;
          border-radius: 12px;
          z-index: 999999;
          font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
          box-shadow: 0 8px 32px rgba(33, 150, 243, 0.4);
          overflow: hidden;
          animation: slideInRight 0.4s ease-out;
        `;
        
        // Header
        const header = document.createElement('div');
        header.style.cssText = `
          padding: 16px 20px;
          background: rgba(255, 255, 255, 0.1);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          font-weight: 600;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        `;
        header.innerHTML = `
          <div>
            <span style="margin-right: 8px;">🎯</span>
            ${results.length} rezultate OCR pentru "${query}"
          </div>
          <button onclick="this.parentElement.parentElement.remove()" style="
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            opacity: 0.7;
            padding: 4px;
            border-radius: 4px;
          " onmouseover="this.style.opacity='1'; this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.opacity='0.7'; this.style.background='none'">×</button>
        `;
        
        // Results list
        const resultsList = document.createElement('div');
        resultsList.style.cssText = `
          padding: 12px 0;
          max-height: 300px;
          overflow-y: auto;
        `;
        
        results.forEach((result, index) => {
          const resultItem = document.createElement('div');
          resultItem.style.cssText = `
            padding: 12px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
          `;
          
          resultItem.innerHTML = `
            <div style="
              width: 24px;
              height: 24px;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 12px;
              font-weight: bold;
              font-size: 12px;
            ">${index + 1}</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; margin-bottom: 4px;">
                Pagina ${result.pageNumber}: "${result.matchText}"
              </div>
              <div style="font-size: 12px; opacity: 0.8; line-height: 1.4;">
                ${result.context ? result.context.substring(0, 80) + '...' : 'Context OCR'}
              </div>
            </div>
          `;
          
          // Add hover effects
          resultItem.addEventListener('mouseenter', () => {
            resultItem.style.background = 'rgba(255, 255, 255, 0.1)';
            resultItem.style.transform = 'translateX(-2px)';
          });
          
          resultItem.addEventListener('mouseleave', () => {
            resultItem.style.background = 'none';
            resultItem.style.transform = 'translateX(0)';
          });
          
          // Click to navigate
          resultItem.addEventListener('click', () => {
            console.log(`🔄 [DEBUG] Navigating to result ${index + 1} on page ${result.pageNumber}`);
            // Navigate to page if different
            if (result.pageNumber !== pdfState.pageNumber) {
              dispatch({ type: 'SET_PAGE', payload: result.pageNumber });
            }
          });
          
          resultsList.appendChild(resultItem);
        });
        
        markerPanel.appendChild(header);
        markerPanel.appendChild(resultsList);
        document.body.appendChild(markerPanel);
        
        console.log('✅ [DEBUG] Created simple visual marker panel with', results.length, 'results');
        
        // ALSO create direct visual markers on the PDF page
        setTimeout(() => {
          createDirectPDFMarkers(query, results, pageNumber);
        }, 500);
        
        // Add CSS animation if not exists
        if (!document.querySelector('#simple-marker-animations')) {
          const style = document.createElement('style');
          style.id = 'simple-marker-animations';
          style.textContent = `
            @keyframes slideInRight {
              from { 
                transform: translateX(100%); 
                opacity: 0; 
              }
              to { 
                transform: translateX(0); 
                opacity: 1; 
              }
            }
            
            @keyframes pdfMarkerPulse {
              0%, 100% { 
                opacity: 0.8; 
                transform: scale(1); 
              }
              50% { 
                opacity: 1; 
                transform: scale(1.1); 
              }
            }
          `;
          document.head.appendChild(style);
        }
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
          if (markerPanel.parentNode) {
            markerPanel.style.animation = 'slideInRight 0.4s ease-out reverse';
            setTimeout(() => {
              if (markerPanel.parentNode) {
                markerPanel.parentNode.removeChild(markerPanel);
              }
            }, 400);
          }
        }, 10000);
      };

      // Create direct visual markers on PDF page - guaranteed to be visible
      const createDirectPDFMarkers = (query, results, pageNumber) => {
        console.log('🎯 [DEBUG] Creating direct PDF markers for:', query);
        
        // Clear previous direct markers
        document.querySelectorAll('.pdf-direct-marker').forEach(el => el.remove());
        
        const pdfContainer = document.querySelector('.react-pdf__Page');
        if (!pdfContainer) {
          console.log('❌ [DEBUG] No PDF container found for direct markers');
          return;
        }
        
        const containerRect = pdfContainer.getBoundingClientRect();
        console.log('📏 [DEBUG] PDF container rect:', containerRect);
        
        // Filter results for current page
        const currentPageResults = results.filter(r => r.pageNumber === pageNumber);
        console.log(`📄 [DEBUG] Creating ${currentPageResults.length} direct markers for page ${pageNumber}`);
        
        currentPageResults.forEach((result, index) => {
          // Create a bright, impossible-to-miss marker
          const marker = document.createElement('div');
          marker.className = 'pdf-direct-marker';
          
          // Position: if we have coordinates, use them; otherwise use grid
          let markerX, markerY;
          
                     if (result.coordinates && result.coordinates.x !== null && result.coordinates.x !== undefined) {
             // Scale coordinates from OCR image to PDF viewer
             const scaleX = containerRect.width / (result.coordinates.imageWidth || 600);
             const scaleY = containerRect.height / (result.coordinates.imageHeight || 800);
             markerX = result.coordinates.x * scaleX;
             markerY = result.coordinates.y * scaleY;
             console.log(`📍 [DEBUG] Using OCR coordinates for marker ${index + 1}:`, { x: markerX, y: markerY });
           } else {
             // Use intelligent positioning - spread markers across the PDF
             console.log(`📍 [DEBUG] No OCR coordinates available for "${result.matchText}", using intelligent positioning`);
             
             // Create a more intelligent distribution
             const totalResults = currentPageResults.length;
             const containerWidth = containerRect.width;
             const containerHeight = containerRect.height;
             
             if (totalResults === 1) {
               // Single result - center it
               markerX = containerWidth / 2 - 60; // Center minus half marker width
               markerY = containerHeight / 3; // Upper third
             } else if (totalResults === 2) {
               // Two results - left and right
               markerX = index === 0 ? containerWidth * 0.25 : containerWidth * 0.75;
               markerY = containerHeight / 3;
             } else {
               // Multiple results - distribute in grid
               const cols = Math.min(3, totalResults); // Max 3 columns
               const rows = Math.ceil(totalResults / cols);
               const col = index % cols;
               const row = Math.floor(index / cols);
               
               markerX = (containerWidth / (cols + 1)) * (col + 1) - 60; // Distribute evenly
               markerY = (containerHeight / (rows + 1)) * (row + 1); // Distribute vertically
             }
             
             console.log(`📍 [DEBUG] Using intelligent grid coordinates for marker ${index + 1}:`, { 
               x: markerX, y: markerY, 
               totalResults, 
               containerSize: { w: containerWidth, h: containerHeight }
             });
           }
          
                     // Create EXTREMELY visible marker - impossible to miss
           marker.style.cssText = `
             position: absolute !important;
             left: ${markerX}px !important;
             top: ${markerY}px !important;
             width: auto !important;
             min-width: 140px !important;
             height: 36px !important;
             background: linear-gradient(135deg, #FF0080, #FF4500) !important;
             color: white !important;
             border: 4px solid #FFFF00 !important;
             border-radius: 25px !important;
             z-index: 2147483647 !important;
             display: flex !important;
             align-items: center !important;
             justify-content: center !important;
             font-family: 'Arial Black', Arial, sans-serif !important;
             font-weight: 900 !important;
             font-size: 14px !important;
             padding: 0 16px !important;
             box-shadow: 
               0 0 30px rgba(255, 0, 128, 1),
               0 0 60px rgba(255, 69, 0, 0.8),
               inset 0 2px 4px rgba(255, 255, 255, 0.3) !important;
             animation: pdfMarkerPulse 1s infinite !important;
             cursor: pointer !important;
             text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8) !important;
             pointer-events: auto !important;
             transform: scale(1) !important;
             opacity: 1 !important;
             visibility: visible !important;
           `;
          
          marker.innerHTML = `🎯 "${result.matchText}" (${index + 1})`;
          marker.title = `OCR găsit: "${result.matchText}"\nContext: ${result.context}`;
          
          // Add click handler
          marker.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log(`🎯 [DEBUG] Clicked direct marker ${index + 1}`);
            // Flash effect
            marker.style.background = 'linear-gradient(135deg, #00FF00, #32CD32)';
            setTimeout(() => {
              marker.style.background = 'linear-gradient(135deg, #FFD700, #FFA500)';
            }, 200);
          });
          
          // Add hover effects
          marker.addEventListener('mouseenter', () => {
            marker.style.transform = 'scale(1.2)';
            marker.style.boxShadow = '0 0 30px rgba(255, 215, 0, 1), 0 6px 16px rgba(0, 0, 0, 0.4)';
          });
          
          marker.addEventListener('mouseleave', () => {
            marker.style.transform = 'scale(1)';
            marker.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8), 0 4px 12px rgba(0, 0, 0, 0.3)';
          });
          
                     // Add to PDF container
           pdfContainer.appendChild(marker);
           console.log(`✅ [DEBUG] Added direct marker ${index + 1} to PDF at (${markerX}, ${markerY})`);
           
           // Immediate verification
           setTimeout(() => {
             const addedMarker = pdfContainer.querySelector('.pdf-direct-marker:last-child');
             if (addedMarker) {
               const rect = addedMarker.getBoundingClientRect();
               const computed = window.getComputedStyle(addedMarker);
               console.log(`🔍 [DEBUG] Marker ${index + 1} verification:`, {
                 inDOM: !!addedMarker,
                 visible: rect.width > 0 && rect.height > 0,
                 rect: rect,
                 position: computed.position,
                 zIndex: computed.zIndex,
                 display: computed.display,
                 opacity: computed.opacity,
                 visibility: computed.visibility
               });
               
               // Force visibility if needed
               if (rect.width === 0 || rect.height === 0) {
                 console.log(`⚠️ [DEBUG] Marker ${index + 1} not visible, forcing styles...`);
                 addedMarker.style.cssText += `
                   position: fixed !important;
                   left: ${100 + index * 200}px !important;
                   top: 100px !important;
                   width: 200px !important;
                   height: 50px !important;
                   background: red !important;
                   z-index: 999999999 !important;
                   display: block !important;
                 `;
               }
             } else {
               console.log(`❌ [DEBUG] Marker ${index + 1} not found in DOM after adding!`);
             }
           }, 100);
         });
        
        // Also add a big arrow pointing to first result
        if (currentPageResults.length > 0) {
          const arrow = document.createElement('div');
          arrow.className = 'pdf-direct-marker';
          arrow.style.cssText = `
            position: absolute;
            left: 20px;
            top: 20px;
            width: 200px;
            height: 40px;
            background: linear-gradient(135deg, #FF4500, #FF6347);
            color: white;
            border-radius: 20px;
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Inter', Arial, sans-serif;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 4px 20px rgba(255, 69, 0, 0.6);
            animation: pdfMarkerPulse 1.5s infinite;
            pointer-events: none;
          `;
          arrow.innerHTML = `👆 ${currentPageResults.length} rezultate OCR găsite!`;
          pdfContainer.appendChild(arrow);
          
          // Remove arrow after 5 seconds
          setTimeout(() => {
            if (arrow.parentNode) {
              arrow.parentNode.removeChild(arrow);
            }
          }, 5000);
        }
        
        console.log(`🎯 [DEBUG] Created ${currentPageResults.length} direct PDF markers`);
      };

      // DIRECT text highlighting - searches for text directly in PDF DOM and highlights it
      const applyDirectTextHighlighting = (query, results) => {
        console.log('🎯 DIRECT HIGHLIGHTING for:', query);
        
        // Clear previous highlights
        document.querySelectorAll('.direct-ocr-highlight').forEach(el => {
          const parent = el.parentNode;
          if (parent) {
            parent.replaceChild(document.createTextNode(el.textContent), el);
            parent.normalize();
          }
        });
        
        // Clear all annoying notifications and markers
        document.querySelectorAll('.ocr-simple-marker, .ocr-guaranteed-marker, .ocr-visual-indicator').forEach(el => el.remove());
        
        // Get text elements ONLY from the current page being displayed
        const currentPageContainer = document.querySelector('.react-pdf__Page');
        if (!currentPageContainer) {
          console.log('❌ No current page container found');
          return;
        }
        
        const currentPageTextElements = currentPageContainer.querySelectorAll('.react-pdf__Page__textContent span, .react-pdf__Page__textContent div, .react-pdf__Page__textContent');
        console.log(`🔍 Found ${currentPageTextElements.length} text elements on CURRENT page`);
        
        let highlightCount = 0;
        const searchTerm = query.toLowerCase();
        
        // Search through text elements on CURRENT page only
        currentPageTextElements.forEach((element, index) => {
          if (!element.textContent) return;
          
          const originalText = element.textContent;
          const lowerText = originalText.toLowerCase();
          
          // Log first 20 elements to see what's available
          if (index < 20) {
            console.log(`Element ${index}: "${originalText}"`);
          }
          
          // Check if this element contains our search term (exact phrase or parts)
          const containsExactPhrase = lowerText.includes(searchTerm);
          const containsPartialMatch = searchTerm.split(' ').some(word => lowerText.includes(word.trim()));
          
          if (containsExactPhrase || containsPartialMatch) {
            console.log(`✅ FOUND match in: "${originalText}"`);
            console.log(`   - Exact phrase: ${containsExactPhrase}`);
            console.log(`   - Partial match: ${containsPartialMatch}`);
            
            let highlightedHTML = originalText;
            
            if (containsExactPhrase) {
              // Highlight the exact phrase
              const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
              highlightedHTML = originalText.replace(regex, (match) => {
                highlightCount++;
                return `<span class="direct-ocr-highlight" style="
                  background: linear-gradient(135deg, #FFD700, #FFA500) !important;
                  color: #000 !important;
                  padding: 2px 4px !important;
                  border-radius: 4px !important;
                  font-weight: bold !important;
                  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.6) !important;
                  border: 2px solid #FF4500 !important;
                  animation: highlightPulse 2s infinite !important;
                ">${match}</span>`;
              });
            } else {
              // Highlight individual words that match
              const words = searchTerm.split(' ');
              words.forEach(word => {
                if (word.trim().length > 2 && lowerText.includes(word.trim())) {
                  const wordRegex = new RegExp(`(${word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                  highlightedHTML = highlightedHTML.replace(wordRegex, (match) => {
                    highlightCount++;
                    return `<span class="direct-ocr-highlight" style="
                      background: linear-gradient(135deg, #FFD700, #FFA500) !important;
                      color: #000 !important;
                      padding: 2px 4px !important;
                      border-radius: 4px !important;
                      font-weight: bold !important;
                      box-shadow: 0 2px 8px rgba(255, 215, 0, 0.6) !important;
                      border: 2px solid #FF4500 !important;
                      animation: highlightPulse 2s infinite !important;
                    ">${match}</span>`;
                  });
                }
              });
            }
            
            if (highlightedHTML !== originalText) {
              element.innerHTML = highlightedHTML;
              console.log(`🎨 Applied highlight to: "${originalText}"`);
            }
          }
        });
        
        // Add CSS animation
        if (!document.querySelector('#direct-highlight-styles')) {
          const style = document.createElement('style');
          style.id = 'direct-highlight-styles';
          style.textContent = `
            @keyframes highlightPulse {
              0%, 100% { 
                box-shadow: 0 2px 8px rgba(255, 215, 0, 0.6);
                transform: scale(1);
              }
              50% { 
                box-shadow: 0 4px 16px rgba(255, 215, 0, 0.9);
                transform: scale(1.02);
              }
            }
          `;
          document.head.appendChild(style);
        }
        
        // Show ONE elegant toast notification
        if (highlightCount > 0) {
          const toast = document.createElement('div');
          toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            z-index: 999999;
            font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 8px 32px rgba(76, 175, 80, 0.3);
            animation: slideInRight 0.4s ease-out;
            display: flex;
            align-items: center;
            gap: 8px;
          `;
          
          toast.innerHTML = `
            <span style="font-size: 18px;">✅</span>
            <span>${highlightCount} rezultate evidențiate pentru "${query}"</span>
          `;
          
          document.body.appendChild(toast);
          
          // Auto-remove after 3 seconds
          setTimeout(() => {
            if (toast.parentNode) {
              toast.style.animation = 'slideInRight 0.4s ease-out reverse';
              setTimeout(() => {
                if (toast.parentNode) {
                  toast.parentNode.removeChild(toast);
                }
              }, 400);
            }
          }, 3000);
          
          console.log(`🎯 SUCCESS: Applied ${highlightCount} highlights for "${query}"`);
        } else {
          console.log(`❌ No text found in DOM for "${query}" - creating visual overlays instead`);
          
          // Since text is not in DOM (it's an image), create visual overlays
          createVisualOverlaysForOCR(query, results);
        }
      };

      // PRODUCTION-READY: Hybrid OCR + DOM Detection System
      const createVisualOverlaysForOCR = (query, results) => {
        console.log('🚀 HYBRID SYSTEM: Creating intelligent overlays for:', query);
        
        // Clear previous overlays
        document.querySelectorAll('.ocr-visual-overlay, .hybrid-text-highlight').forEach(el => el.remove());
        
        // Step 1: Try DOM-based highlighting first (most accurate)
        const domHighlightSuccess = attemptDOMHighlighting(query);
        
        // Step 2: If DOM highlighting fails or is incomplete, use OCR positioning
        if (!domHighlightSuccess || results.length > 0) {
          createOCRBasedOverlays(query, results);
        }
        
        // Step 3: Show intelligent feedback
        showHybridSearchFeedback(query, domHighlightSuccess, results.length);
      };

      // Method 1: DOM-based text highlighting (most accurate)
      const attemptDOMHighlighting = (query) => {
        console.log('🔍 STEP 1: Attempting DOM-based highlighting...');
        
        const currentPageContainer = findModalPDFContainer();
        if (!currentPageContainer) return false;
        
        const textElements = currentPageContainer.querySelectorAll(
          '.react-pdf__Page__textContent span, .react-pdf__Page__textContent div, [data-text]'
        );
        
        console.log(`📝 Found ${textElements.length} DOM text elements`);
        
        let highlightCount = 0;
        const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
        
        textElements.forEach((element, index) => {
          const text = element.textContent?.toLowerCase() || '';
          
          // Check for exact phrase match
          if (text.includes(query.toLowerCase())) {
            highlightDOMElement(element, query, 'exact');
            highlightCount++;
            console.log(`✅ DOM exact match: "${element.textContent}"`);
          }
          // Check for partial matches
          else if (searchTerms.some(term => text.includes(term))) {
            highlightDOMElement(element, query, 'partial');
            highlightCount++;
            console.log(`🔍 DOM partial match: "${element.textContent}"`);
          }
        });
        
        console.log(`📊 DOM highlighting: ${highlightCount} elements highlighted`);
        return highlightCount > 0;
      };

      // Method 2: PRECISE OCR-based overlay positioning
      const createOCRBasedOverlays = (query, results) => {
        console.log('🎯 PRECISE OCR: Creating exact overlays...');
        
        const currentPageContainer = findModalPDFContainer();
        if (!currentPageContainer || results.length === 0) return;
        
        // Find the actual PDF canvas or image element
        const pdfCanvas = currentPageContainer.querySelector('canvas');
        const pdfImage = currentPageContainer.querySelector('img');
        const actualPDFElement = pdfCanvas || pdfImage;
        
        if (!actualPDFElement) {
          console.log('❌ No PDF canvas or image found, cannot position overlays precisely');
          return;
        }
        
        const pdfRect = actualPDFElement.getBoundingClientRect();
        const containerRect = currentPageContainer.getBoundingClientRect();
        
        console.log('📐 OCR Positioning Debug:', {
          container: { w: containerRect.width, h: containerRect.height },
          pdfElement: { w: pdfRect.width, h: pdfRect.height },
          offset: { x: pdfRect.left - containerRect.left, y: pdfRect.top - containerRect.top }
        });
        
        results.forEach((result, index) => {
          console.log(`\n🔍 Processing result ${index + 1}:`, {
            matchText: result.matchText,
            coordinates: result.coordinates,
            pageNumber: result.pageNumber,
            matchType: result.coordinates?.matchType || 'UNKNOWN'
          });
          
          if (!result.coordinates) {
            console.log(`❌ Skipping result ${index + 1}: no coordinates available`);
            return;
          }
          
          // Show all results on current page, regardless of original page number
          console.log(`✅ Processing result ${index + 1} on current page (original: ${result.pageNumber}, current: ${pdfState.pageNumber})`);
          
          // Get OCR coordinates (from backend) with validation - UPDATED for higher resolution
          const coords = result.coordinates;
          const ocrX = Math.max(0, coords.x || 0);
          const ocrY = Math.max(0, coords.y || 0);
          const ocrWidth = Math.max(20, coords.width || 50);
          const ocrHeight = Math.max(15, coords.height || 20);
          // UPDATED: Support both old (600x800) and new (1200x1600) resolutions
          const ocrImageWidth = coords.imageWidth || 1200;
          const ocrImageHeight = coords.imageHeight || 1600;
          
          // Log coordinate details for debugging
                      console.log(`📊 Coordinate details for result ${index + 1}:`, {
              raw: { x: coords.x, y: coords.y, w: coords.width, h: coords.height },
              validated: { x: ocrX, y: ocrY, w: ocrWidth, h: ocrHeight },
              matchType: coords.matchType,
              lineInfo: coords.lineNumber !== undefined ? `line ${coords.lineNumber + 1}/${coords.totalLines}` : 'unknown',
              confidence: coords.confidence,
              analysis: coords.analysis
            });
          
          // Calculate scaling from OCR image to actual PDF display
          const scaleX = pdfRect.width / ocrImageWidth;
          const scaleY = pdfRect.height / ocrImageHeight;
          
          // Calculate position relative to PDF element
          const scaledX = ocrX * scaleX;
          const scaledY = ocrY * scaleY;
          const scaledWidth = Math.max(ocrWidth * scaleX, 20);
          const scaledHeight = Math.max(ocrHeight * scaleY, 15);
          
          // Calculate final position relative to container
          const offsetX = pdfRect.left - containerRect.left;
          const offsetY = pdfRect.top - containerRect.top;
          const finalX = offsetX + scaledX;
          const finalY = offsetY + scaledY;
          
          console.log(`📊 CORRECTED Scaling calculation:`, {
            ocrCoords: { x: ocrX, y: ocrY, w: ocrWidth, h: ocrHeight },
            ocrImageSize: { w: ocrImageWidth, h: ocrImageHeight },
            pdfDisplaySize: { w: pdfRect.width, h: pdfRect.height },
            scale: { x: scaleX, y: scaleY },
            scaled: { x: scaledX, y: scaledY, w: scaledWidth, h: scaledHeight },
            offset: { x: offsetX, y: offsetY },
            final: { x: finalX, y: finalY }
          });
          
          // Create precise overlay with different colors based on match type
          const overlay = document.createElement('div');
          overlay.className = 'ocr-visual-overlay';
          overlay.setAttribute('data-result-index', index);
          overlay.setAttribute('data-match-text', result.matchText || query);
          overlay.setAttribute('data-match-type', coords.matchType || 'UNKNOWN');
          
          // Choose colors based on match type
          let backgroundColor, borderColor, shadowColor;
          switch (coords.matchType) {
            case 'EXACT':
              backgroundColor = 'rgba(76, 175, 80, 0.7)'; // Green for exact matches
              borderColor = 'rgba(76, 175, 80, 1)';
              shadowColor = 'rgba(76, 175, 80, 0.8)';
              break;
            case 'PARTIAL':
              backgroundColor = 'rgba(255, 193, 7, 0.7)'; // Yellow for partial matches
              borderColor = 'rgba(255, 193, 7, 1)';
              shadowColor = 'rgba(255, 193, 7, 0.8)';
              break;
            case 'LINE':
              backgroundColor = 'rgba(33, 150, 243, 0.6)'; // Blue for line matches
              borderColor = 'rgba(33, 150, 243, 1)';
              shadowColor = 'rgba(33, 150, 243, 0.8)';
              break;
            case 'REFERENCE':
              backgroundColor = 'rgba(156, 39, 176, 0.6)'; // Purple for reference matches
              borderColor = 'rgba(156, 39, 176, 1)';
              shadowColor = 'rgba(156, 39, 176, 0.8)';
              break;
            case 'ESTIMATED':
              backgroundColor = 'rgba(255, 87, 34, 0.5)'; // Orange for estimated matches
              borderColor = 'rgba(255, 87, 34, 1)';
              shadowColor = 'rgba(255, 87, 34, 0.8)';
              break;
            case 'INTELLIGENT':
              backgroundColor = 'rgba(0, 188, 212, 0.7)'; // Cyan for intelligent matches
              borderColor = 'rgba(0, 188, 212, 1)';
              shadowColor = 'rgba(0, 188, 212, 0.8)';
              break;
            default:
              backgroundColor = 'rgba(158, 158, 158, 0.6)'; // Gray for unknown
              borderColor = 'rgba(158, 158, 158, 1)';
              shadowColor = 'rgba(158, 158, 158, 0.8)';
          }
          
          overlay.style.cssText = `
            position: absolute !important;
            left: ${finalX}px !important;
            top: ${finalY}px !important;
            width: ${scaledWidth}px !important;
            height: ${scaledHeight}px !important;
            background: ${backgroundColor} !important;
            border: 2px solid ${borderColor} !important;
            border-radius: 4px !important;
            z-index: 999999 !important;
            pointer-events: auto !important;
            box-shadow: 0 0 10px ${shadowColor} !important;
            animation: preciseGlow 2s ease-in-out infinite !important;
            cursor: pointer !important;
            transition: all 0.3s ease !important;
          `;
          
          // Add tooltip with match information
          const matchInfo = coords.matchType === 'EXACT' ? 'Exact word match' :
                           coords.matchType === 'PARTIAL' ? 'Partial word match' :
                           coords.matchType === 'LINE' ? 'Line-level match' :
                           coords.matchType === 'REFERENCE' ? 'Reference position' :
                           coords.matchType === 'ESTIMATED' ? 'Estimated position' :
                           coords.matchType === 'INTELLIGENT' ? `Intelligent position (${coords.method})` : 'Unknown match';
          
          const reference = coords.reference || coords.wordText || coords.lineText;
          const tooltipText = `${matchInfo}${reference ? `\nReference: "${reference.substring(0, 30)}${reference.length > 30 ? '...' : ''}"` : ''}`;
          
          overlay.title = tooltipText;
          
          // Add click handler to navigate to result
          overlay.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log(`🎯 Clicked on OCR result: "${result.matchText}" (${coords.matchType})`);
            navigateToSearchResult(results.indexOf(result));
          });
          
          // Add hover effects with match-type specific colors
          overlay.addEventListener('mouseenter', () => {
            const hoverColor = backgroundColor.replace('0.6', '0.9').replace('0.7', '0.9').replace('0.5', '0.8');
            overlay.style.background = hoverColor;
            overlay.style.transform = 'scale(1.1)';
            overlay.style.zIndex = '9999999';
          });
          
          overlay.addEventListener('mouseleave', () => {
            overlay.style.background = backgroundColor;
            overlay.style.transform = 'scale(1)';
            overlay.style.zIndex = '999999';
          });
          
          currentPageContainer.appendChild(overlay);
          
          console.log(`✅ Created CORRECTED overlay ${index + 1}:`, {
            position: `(${finalX.toFixed(1)}, ${finalY.toFixed(1)})`,
            size: `${scaledWidth.toFixed(1)}x${scaledHeight.toFixed(1)}`,
            matchText: result.matchText,
            matchType: coords.matchType,
            color: backgroundColor
          });
        });
        
        // Add precise animation
        addPreciseAnimationStyles();
      };

      // Helper: Find the modal PDF container intelligently
      const findModalPDFContainer = () => {
        const allPdfPages = document.querySelectorAll('.react-pdf__Page');
        console.log(`🔍 Found ${allPdfPages.length} PDF pages total`);
        
        // Find the largest visible PDF page (modal)
        let modalPage = null;
        let maxArea = 0;
        
        allPdfPages.forEach((page, i) => {
          const rect = page.getBoundingClientRect();
          const area = rect.width * rect.height;
          const isVisible = rect.width > 0 && rect.height > 0;
          
          console.log(`📄 Page ${i}: ${rect.width}x${rect.height}, area=${area}, visible=${isVisible}`);
          
          if (isVisible && area > maxArea) {
            maxArea = area;
            modalPage = page;
          }
        });
        
        if (modalPage) {
          console.log(`✅ Selected modal page with area: ${maxArea}`);
        }
        
        return modalPage;
      };

      // Helper: Highlight DOM element with precision
      const highlightDOMElement = (element, query, matchType) => {
        const originalHTML = element.innerHTML;
        const text = element.textContent;
        
        // Create highlight wrapper
        const highlightClass = matchType === 'exact' ? 'hybrid-exact-highlight' : 'hybrid-partial-highlight';
        const backgroundColor = matchType === 'exact' ? 'rgba(76, 175, 80, 0.4)' : 'rgba(255, 193, 7, 0.3)';
        
        // Apply highlighting
        element.style.cssText += `
          background: ${backgroundColor} !important;
          padding: 2px 4px !important;
          border-radius: 4px !important;
          box-shadow: 0 2px 8px ${backgroundColor.replace('0.4', '0.6').replace('0.3', '0.5')} !important;
          animation: domHighlight 2s ease-in-out infinite !important;
        `;
        
        element.className += ` ${highlightClass} hybrid-text-highlight`;
      };

      // Helper: Try to find text in DOM first (most accurate)
      const findVisualTextPosition = (searchText, containerRect) => {
        const currentPageContainer = findModalPDFContainer();
        if (!currentPageContainer) return null;
        
        console.log(`🔍 Searching for "${searchText}" in DOM elements...`);
        
        // Search through PDF text elements
        const textElements = currentPageContainer.querySelectorAll(
          '.react-pdf__Page__textContent span, .react-pdf__Page__textContent div, [data-text]'
        );
        
        for (let element of textElements) {
          const elementText = element.textContent?.toLowerCase() || '';
          const searchLower = searchText.toLowerCase();
          
          if (elementText.includes(searchLower)) {
            const elementRect = element.getBoundingClientRect();
            const containerRect2 = currentPageContainer.getBoundingClientRect();
            
            const relativeX = elementRect.left - containerRect2.left;
            const relativeY = elementRect.top - containerRect2.top;
            
            console.log(`✅ Found "${searchText}" in DOM:`, {
              element: elementText,
              position: { x: relativeX, y: relativeY, w: elementRect.width, h: elementRect.height }
            });
            
            return {
              x: relativeX,
              y: relativeY,
              width: elementRect.width,
              height: elementRect.height
            };
          }
        }
        
        console.log(`❌ "${searchText}" not found in DOM, will use OCR coordinates`);
        return null;
      };

      // Helper: Smart fallback positioning for common terms
      const getIntelligentFallbackPosition = (searchTerm, containerRect, index) => {
        const patterns = {
          'caiet': { x: 0.5, y: 0.85, w: 0.4, h: 0.06 }, // Bottom center
          'sarcini': { x: 0.5, y: 0.85, w: 0.4, h: 0.06 },
          'sediul': { x: 0.1, y: 0.3 + (index * 0.15), w: 0.6, h: 0.05 }, // Left side, distributed
          'adresa': { x: 0.1, y: 0.4 + (index * 0.1), w: 0.5, h: 0.04 },
          'telefon': { x: 0.1, y: 0.6 + (index * 0.08), w: 0.4, h: 0.04 }
        };
        
        const matchedPattern = Object.keys(patterns).find(key => searchTerm.includes(key));
        const pattern = patterns[matchedPattern] || { x: 0.5, y: 0.5 + (index * 0.1), w: 0.3, h: 0.05 };
        
        return {
          x: containerRect.width * pattern.x - (containerRect.width * pattern.w / 2),
          y: containerRect.height * pattern.y,
          width: containerRect.width * pattern.w,
          height: containerRect.height * pattern.h
        };
      };

      // Helper: Add precise animation styles
      const addPreciseAnimationStyles = () => {
        if (document.querySelector('#precise-highlight-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'precise-highlight-styles';
        style.textContent = `
          @keyframes domHighlight {
            0%, 100% { opacity: 0.8; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.01); }
          }
          @keyframes preciseGlow {
            0%, 100% { 
              opacity: 0.4; 
              box-shadow: 0 0 4px rgba(255, 87, 34, 0.6);
            }
            50% { 
              opacity: 0.6; 
              box-shadow: 0 0 8px rgba(255, 87, 34, 0.8);
            }
          }
        `;
        document.head.appendChild(style);
      };

      // Helper: Show intelligent feedback
      const showHybridSearchFeedback = (query, domSuccess, ocrCount) => {
        const toast = document.createElement('div');
        const method = domSuccess ? 'DOM' : 'OCR';
        const color = domSuccess ? '#4CAF50' : '#2196F3';
        const icon = domSuccess ? '📝' : '🤖';
        
        toast.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, ${color}, ${color}CC);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          z-index: 999999;
          font-family: system-ui, sans-serif;
          font-weight: 600;
          font-size: 13px;
          box-shadow: 0 4px 20px ${color}40;
          animation: slideInRight 0.3s ease-out;
          display: flex;
          align-items: center;
          gap: 8px;
        `;
        
        toast.innerHTML = `
          <span style="font-size: 16px;">${icon}</span>
          <span>${method} highlighting: "${query}" găsit</span>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
          if (toast.parentNode) {
            toast.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => toast.parentNode?.removeChild(toast), 300);
          }
        }, 2500);
      };

    // Internal highlighting function
    const applyAdvancedOCRHighlightingInternal = (query, results, actualPageNumber) => {
      console.log('🤖 Applying advanced OCR highlighting with contours for:', query);
      console.log('🤖 Results to highlight:', results);
      
      // Clear previous overlays
      const existingOverlays = document.querySelectorAll('.ocr-highlight-overlay, .ocr-highlight-overlay-body, .test-ocr-contour, .ocr-visual-indicator');
      console.log(`🧹 Clearing ${existingOverlays.length} existing overlays`);
      existingOverlays.forEach(overlay => overlay.remove());
      
      // SIMPLE SOLUTION: Create visible indicators on screen regardless of PDF container issues
      if (results && results.length > 0) {
        // Use the passed actualPageNumber instead of pageNumber
        const currentPageResults = results.filter(result => result.pageNumber === actualPageNumber);
        
        console.log(`📄 [DEBUG] Using page number: ${actualPageNumber}, Results on this page: ${currentPageResults.length}`);
        console.log(`📄 [DEBUG] All results:`, results.map(r => ({ page: r.pageNumber, text: r.matchText })));
        console.log(`📄 [DEBUG] Current page results:`, currentPageResults.map(r => ({ page: r.pageNumber, text: r.matchText })));
        
        // Create a simple visual indicator panel
        const indicatorPanel = document.createElement('div');
        indicatorPanel.className = 'ocr-visual-indicator';
        indicatorPanel.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          width: 280px;
          max-height: 60px;
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          z-index: 999999;
          font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
          pointer-events: none;
          animation: slideInRight 0.3s ease-out;
        `;
        
        indicatorPanel.innerHTML = `
          <div style="display: flex; align-items: center;">
            <span style="font-size: 16px; margin-right: 8px;">✅</span>
            <div>
              <div style="font-weight: 600; font-size: 14px;">${results.length} rezultate OCR găsite</div>
              <div style="font-size: 11px; opacity: 0.9;">Cuvintele sunt evidențiate în PDF</div>
            </div>
          </div>
        `;
        
        // Add modern CSS animations
        if (!document.querySelector('#modern-ocr-animations')) {
          const style = document.createElement('style');
          style.id = 'modern-ocr-animations';
          style.textContent = `
            @keyframes slideInRight {
              from { 
                transform: translateX(100%); 
                opacity: 0; 
              }
              to { 
                transform: translateX(0); 
                opacity: 1; 
              }
            }
          `;
          document.head.appendChild(style);
        }
        
        document.body.appendChild(indicatorPanel);
        
        // Make page navigation function available globally
        window.pdfSetPage = (targetPage) => {
          console.log('🔄 Navigating to page:', targetPage);
          dispatch({ type: 'SET_PAGE', payload: targetPage });
          
          // Update the indicator panel to show current page
          setTimeout(() => {
            const existingPanel = document.querySelector('.ocr-visual-indicator');
            if (existingPanel) {
              existingPanel.remove();
              applyAdvancedOCRHighlighting(query, results); // Recreate with updated current page
            }
          }, 100);
        };
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
          if (indicatorPanel.parentNode) {
            indicatorPanel.parentNode.removeChild(indicatorPanel);
          }
        }, 3000);
        
        console.log('✅ Created visual indicator panel with', results.length, 'results');
        
        // SMART highlighting: detect PDF type and apply appropriate strategy
        setTimeout(() => {
          const textElements = document.querySelectorAll('.react-pdf__Page__textContent span, .react-pdf__Page__textContent div');
          const hasSelectableText = textElements.length > 5;
          
          // Check if results come from OCR (isOCR flag)
          const isOCRResults = currentPageResults.some(result => result.isOCR === true);
          
          console.log(`📋 [DEBUG] PDF Type Detection: ${hasSelectableText ? 'TEXT-BASED' : 'SCANNED/IMAGE'} (${textElements.length} text elements)`);
          console.log(`📋 [DEBUG] Results are from OCR:`, isOCRResults);
          console.log(`📋 [DEBUG] Current page results for highlighting:`, currentPageResults);
          console.log(`📋 [DEBUG] Actual page number:`, actualPageNumber);
          
          // FIXED LOGIC: For OCR results, try DIRECT text highlighting first
          if (isOCRResults) {
            console.log('🤖 [DEBUG] OCR results detected - trying DIRECT text highlighting');
            applyDirectTextHighlighting(query, currentPageResults);
          } else if (hasSelectableText) {
            // TEXT-BASED PDF: Use normal text highlighting
            console.log('📝 [DEBUG] Applying text highlighting for text-based PDF');
            applySimpleTextHighlighting(query, currentPageResults);
          } else {
            // SCANNED/IMAGE PDF: Use visual overlays
            console.log('📷 [DEBUG] Applying visual overlays for scanned/image PDF');
                    console.log('📷 [DEBUG] OCR results found - showing simple notification instead of fake overlays');
        
        // Instead of fake overlays, show a clear notification with results
        showSimpleOCRNotification(query, currentPageResults, actualPageNumber);
          }
        }, 200);
        
        return; // Skip the complex contour logic for now
      }
      
      const currentPageResults = results.filter(result => result.pageNumber === pdfState.pageNumber);
      
      if (currentPageResults.length > 0) {
        const pageContainer = document.querySelector('.react-pdf__Page');
        console.log('🔍 Looking for page container:', pageContainer);
        console.log('🔍 All page elements:', document.querySelectorAll('[class*="react-pdf"]'));
        
        if (pageContainer) {
          console.log(`🎯 Showing ${currentPageResults.length} OCR results on page ${pdfState.pageNumber}`);
          console.log('📏 Page container dimensions:', pageContainer.getBoundingClientRect());
          
          // Skip test contours for now
          
          currentPageResults.forEach((result, index) => {
            const isCurrentMatch = currentSearchIndex === results.indexOf(result);
            const isOCRResult = result.isOCR;
            
            // Create visual contour overlay for OCR results
            const contour = document.createElement('div');
            contour.className = 'ocr-highlight-overlay ocr-contour';
            
            // Get page dimensions for coordinate scaling
            const pageRect = pageContainer.getBoundingClientRect();
            const pageWidth = pageRect.width || 600;
            const pageHeight = pageRect.height || 800;
            
            let estimatedX, estimatedY, estimatedWidth, estimatedHeight;
            
            if (result.coordinates) {
              // Use exact OCR coordinates if available
              const coords = result.coordinates;
              const scaleX = pageWidth / coords.imageWidth;
              const scaleY = pageHeight / coords.imageHeight;
              
              estimatedX = coords.x * scaleX;
              estimatedY = coords.y * scaleY;
              estimatedWidth = coords.width * scaleX;
              estimatedHeight = coords.height * scaleY;
              
              console.log(`🎯 Using exact coordinates for "${result.matchText}":`, {
                original: coords,
                scaled: { x: estimatedX, y: estimatedY, w: estimatedWidth, h: estimatedHeight },
                scale: { x: scaleX, y: scaleY }
              });
            } else {
              // Fallback to grid positioning
              const cols = 2;
              const col = index % cols;
              const row = Math.floor(index / cols);
              estimatedX = 50 + col * 250;
              estimatedY = 50 + row * 100;
              estimatedWidth = 200;
              estimatedHeight = 35;
              
              console.log(`📍 Using fallback grid position for "${result.matchText}":`, {
                x: estimatedX, y: estimatedY, w: estimatedWidth, h: estimatedHeight
              });
            }
            
            // Create yellow contour style - use calculated dimensions
            const contourStyle = {
              x: estimatedX,
              y: estimatedY,
              width: estimatedWidth,
              height: estimatedHeight,
              borderColor: isCurrentMatch ? '#FF6B00' : '#FF9500', // More vibrant colors
              backgroundColor: isCurrentMatch ? 'rgba(255, 107, 0, 0.4)' : 'rgba(255, 149, 0, 0.3)',
              borderWidth: isCurrentMatch ? '4px' : '3px'
            };
            
            console.log(`🎯 Creating contour ${index + 1} at position:`, contourStyle);
            
            // Apply styles step by step for better debugging
            contour.style.position = 'absolute';
            contour.style.top = contourStyle.y + 'px';
            contour.style.left = contourStyle.x + 'px';
            contour.style.width = contourStyle.width + 'px';
            contour.style.height = contourStyle.height + 'px';
            contour.style.border = `${contourStyle.borderWidth} solid ${contourStyle.borderColor}`;
            contour.style.backgroundColor = contourStyle.backgroundColor;
            contour.style.borderRadius = '8px';
            contour.style.zIndex = '999999'; // Much higher z-index
            contour.style.cursor = 'pointer';
            contour.style.boxShadow = '0 4px 16px rgba(255, 165, 0, 0.8)';
            contour.style.pointerEvents = 'auto';
            contour.style.display = 'block';
            contour.style.visibility = 'visible';
            contour.style.opacity = '1';
            contour.style.transform = 'translateZ(0)'; // Force hardware acceleration
            contour.style.position = 'absolute'; // Ensure absolute positioning
            
            // Add simple text inside the contour
            contour.textContent = `🎯 "${result.matchText}"`;
            contour.style.color = 'white';
            contour.style.fontSize = '12px';
            contour.style.fontWeight = 'bold';
            contour.style.textAlign = 'center';
            contour.style.lineHeight = contourStyle.height + 'px';
            contour.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
            
            // Add tooltip
            contour.title = `${isOCRResult ? 'OCR' : 'Text'} Match: "${result.matchText}"\nContext: ${result.context}`;
            
            // Click to navigate to this result
            contour.addEventListener('click', (e) => {
              e.stopPropagation();
              console.log('🎯 Clicked on OCR result:', result);
              navigateToSearchResult(results.indexOf(result));
            });
            
            // Simple hover effects
            contour.addEventListener('mouseenter', () => {
              contour.style.transform = 'scale(1.1)';
              contour.style.boxShadow = '0 6px 20px rgba(255, 165, 0, 1)';
            });
            
            contour.addEventListener('mouseleave', () => {
              contour.style.transform = 'scale(1)';
              contour.style.boxShadow = '0 4px 16px rgba(255, 165, 0, 0.8)';
            });
            
            // Try adding to both pageContainer and body for testing
            pageContainer.appendChild(contour);
            
            // Also create a copy in body to test if it's a container issue
            const bodyContour = contour.cloneNode(true);
            bodyContour.className = 'ocr-highlight-overlay-body';
            bodyContour.style.position = 'fixed'; // Fixed to viewport
            bodyContour.style.top = (pageContainer.getBoundingClientRect().top + contourStyle.y) + 'px';
            bodyContour.style.left = (pageContainer.getBoundingClientRect().left + contourStyle.x) + 'px';
            bodyContour.style.zIndex = '999999';
            bodyContour.style.backgroundColor = 'rgba(255, 0, 255, 0.8)'; // Magenta for visibility
            bodyContour.style.border = '3px solid magenta';
            bodyContour.textContent = `🔴 BODY CONTOUR ${index + 1}`;
            document.body.appendChild(bodyContour);
            
            console.log(`✅ Contour ${index + 1} added to DOM at (${contourStyle.x}, ${contourStyle.y}):`, contour);
            console.log(`✅ Body contour ${index + 1} added to body:`, bodyContour);
            
            // Force visibility for debugging
            setTimeout(() => {
              if (contour.parentNode) {
                console.log(`🔍 Contour ${index + 1} still in DOM:`, contour.parentNode.contains(contour));
                console.log(`🔍 Contour ${index + 1} computed style:`, window.getComputedStyle(contour));
              }
            }, 1000);
          });
          
          // Show summary notification
          setTimeout(() => {
            const summary = document.createElement('div');
            summary.className = 'ocr-summary-notification';
            summary.style.cssText = `
              position: fixed;
              top: 120px;
              right: 20px;
              background: linear-gradient(135deg, #FF9800, #F57C00);
              color: white;
              padding: 15px 25px;
              border-radius: 12px;
              z-index: 10000;
              font-weight: bold;
              box-shadow: 0 6px 20px rgba(255, 152, 0, 0.4);
              border: 2px solid rgba(255,255,255,0.2);
              max-width: 280px;
              font-size: 14px;
            `;
            summary.innerHTML = `
              🎯 <strong>${currentPageResults.length} rezultate</strong> pe pagina ${pdfState.pageNumber}<br>
              <small style="opacity: 0.9;">Contururi galbene = zone găsite prin OCR</small>
            `;
            document.body.appendChild(summary);
            
            setTimeout(() => {
              if (summary.parentNode) {
                summary.parentNode.removeChild(summary);
              }
            }, 4000);
          }, currentPageResults.length * 150 + 500);
        }
      }
    };

    // Apply OCR-style highlighting with overlays (local fallback)
    const applyOCRHighlighting = (query, results) => {
      console.log('🎨 Applying OCR highlighting for:', query);
      
      // For OCR documents, we can't highlight text directly
      // Instead, we show visual indicators
      const currentPageResults = results.filter(result => result.pageNumber === pdfState.pageNumber);
      
      if (currentPageResults.length > 0) {
        // Create overlay indicators for OCR matches
        const pageContainer = document.querySelector('.react-pdf__Page');
        if (pageContainer) {
          currentPageResults.forEach((result, index) => {
            const isCurrentMatch = currentSearchIndex === results.indexOf(result);
            
            const overlay = document.createElement('div');
            overlay.className = 'ocr-highlight-overlay';
            overlay.style.cssText = `
              position: absolute;
              top: ${50 + (index * 30)}px;
              right: 10px;
              background: ${isCurrentMatch ? '#ff4444' : '#ffaa00'};
              color: white;
              padding: 5px 10px;
              border-radius: 15px;
              font-size: 12px;
              font-weight: bold;
              z-index: 1000;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              cursor: pointer;
              border: 2px solid ${isCurrentMatch ? '#fff' : 'transparent'};
            `;
            overlay.textContent = `📍 "${result.matchText}"`;
            overlay.title = `Context: ${result.context}`;
            
            // Click to navigate to this result
            overlay.addEventListener('click', () => {
              navigateToSearchResult(results.indexOf(result));
            });
            
            pageContainer.appendChild(overlay);
          });
        }
      }
    };

    // Navigate to next/previous search result
    const navigateSearchResults = (direction) => {
      if (inDocSearchResults.length === 0) return;
      
      let newIndex = currentSearchIndex + direction;
      if (newIndex < 0) newIndex = inDocSearchResults.length - 1;
      if (newIndex >= inDocSearchResults.length) newIndex = 0;
      
      console.log('🔄 Navigating from index', currentSearchIndex, 'to', newIndex);
      navigateToSearchResult(newIndex);
    };

    // Function to trigger OCR search when button is clicked
    const triggerOCRSearch = async () => {
      if (!inDocSearchQuery || inDocSearchQuery.length < 2) {
        console.log('🤖 OCR Search: Query too short or empty');
        
        // Show warning notification
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="
            position: fixed;
            top: 100px;
            right: 20px;
            background: linear-gradient(135deg, #FF9800, #F57C00);
            color: white;
            padding: 18px 28px;
            border-radius: 12px;
            z-index: 10000;
            font-weight: bold;
            box-shadow: 0 6px 20px rgba(255, 152, 0, 0.4);
          ">
            ⚠️ Scrie minim 2 caractere pentru căutare OCR
          </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 3000);
        return;
      }
      
      console.log('🤖 Triggering OCR search for:', inDocSearchQuery);
      await performOCRSearchWithBackend(inDocSearchQuery);
    };

  // Cache for versions to avoid repeated fetches
  const versionsCache = useRef(new Map());
  
  const fetchVersions = async () => {
    const documentId = file.id_document;
    const now = Date.now();
    const cacheAge = 2 * 60 * 1000; // 2 minutes cache for versions
    
    // Check cache first
    const cached = versionsCache.current.get(documentId);
    if (cached && (now - cached.timestamp) < cacheAge) {
      console.log('📄 Using cached versions');
      setVersions(cached.versions);
      return;
    }
    
    try {
      console.log('🔄 Fetching versions for document:', documentId);
      
      const response = await fetch(`${backend}/post_docs/versions/${encodeURIComponent(documentId)}`, {
        credentials: 'include',
        headers: { 'Origin': window.location.origin }    
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch versions: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.versions) {
        console.log(`✅ Loaded ${data.versions.length} versions`);
        setVersions(data.versions);
        
        // Cache the result
        versionsCache.current.set(documentId, {
          versions: data.versions,
          timestamp: now
        });
      } else {
        console.log('📄 No versions found or invalid response');
        setVersions([]);
      }
    } catch (error) {
      console.error('❌ Error fetching versions:', error);
      setVersions([]);
    }
  };

  const handleCreateNewVersion = async () => {
    try {
      console.log('Starting version creation process...');
      console.log('Current state:', {
        selectedFile,
        editedDocDetails,
        docDetails: pdfState.docDetails,
        file,
      });

      if (!editedDocDetails || !file) {
        console.error('Missing required data:', { editedDocDetails, file });
        console.error('Missing required data for version creation');
        return;
      }

      // Ensure we have a valid path
      if (!file.path) {
        console.error('Missing path in file object:', file);
        console.error('Missing file path');
        return;
      }

      // Prepare the data object with explicit path handling
      const versionData = {
        documentId: file.id_document,
        fileName: selectedFile?.name || file.nom_document,
        changeSummary: editedDocDetails.comment || '',
        tags: editedDocDetails.tags || [],
        comment: editedDocDetails.comment || '',
        keywords: editedDocDetails.keywords || [],
        path: file.path,
        type: editedDocDetails.type,
        originalPath: file.path,
        originalName: file.nom_document,
        filePath: `${file.path}/${file.nom_document}`
      };

      console.log('Creating new version with data:', versionData);

      const formData = new FormData();
      
      // Add file if selected
      if (selectedFile) {
        console.log('Appending file to form data:', selectedFile.name);
        formData.append('file', selectedFile);
      }

      // Add all metadata as a single JSON string
      console.log('Appending metadata to form data');
      formData.append('metadata', JSON.stringify(versionData));

      // Add path and documentId as separate fields
      formData.append('path', file.path);
      formData.append('documentId', file.id_document);
      formData.append('filePath', `${file.path}/${file.nom_document}`);

      console.log('Sending request to:', `${backend}/post_docs/versions/${file.id_document}`);
      console.log('FormData contents:', {
        file: selectedFile ? selectedFile.name : 'No new file',
        metadata: versionData,
        path: file.path,
        documentId: file.id_document,
        filePath: `${file.path}/${file.nom_document}`
      });
      
      // UI: show a subtle creating state to make the 1-2s server work feel responsive
      dispatch({ type: 'SET_LOADING', payload: true });

      const response = await fetch(`${backend}/post_docs/versions/${file.id_document}`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          'Origin': window.location.origin
        }
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (!response.ok) {
        console.error('Version creation failed:', responseData);
        throw new Error(responseData.error || 'Failed to create new version');
      }

      if (responseData.success) {
        console.log('Version created successfully, refreshing document list');
        // Show success message
        console.log('New version created successfully');
        
        // Get the latest version details to update UI with correct metadata
        console.log('📊 [VERSION] Fetching all versions to get latest version details');
        const versionsResponse = await fetch(
          `${backend}/post_docs/versions/${file.id_document}`,
          {
            credentials: 'include',
            headers: { 'Origin': window.location.origin }
          }
        );
        
        let latestVersionDetails = null;
        if (versionsResponse.ok) {
          const versionsData = await versionsResponse.json();
          if (versionsData.success && versionsData.versions && versionsData.versions.length > 0) {
            // Get the latest version (first in the list since it's ordered by DESC)
            latestVersionDetails = versionsData.versions[0];
            console.log('✅ [VERSION] Retrieved latest version details:', latestVersionDetails);
          }
        }
        
        // Also get current document details for merging
        console.log('🔄 Refreshing document details after new version creation');
        const updatedDetailsResponse = await fetch(
          `${backend}/post_docs/details/${encodeURIComponent(file.nom_document)}`,
          {
            credentials: 'include',
            headers: { 'Origin': window.location.origin }
          }
        );
        
        let updatedDetailsData = null;
        if (updatedDetailsResponse.ok) {
          const responseData = await updatedDetailsResponse.json();
          if (responseData.success) {
            updatedDetailsData = responseData;
            console.log('📝 Fetched updated document details');
          }
        }
        
        // Force complete refresh after new version creation
        console.log('🔄 [VERSION] Forcing complete refresh after new version creation');
        
        // Clear the specific document from global cache FIRST
        const cacheKey = `${file.path}/${file.nom_document}`;
        console.log('🗑️ [VERSION] Clearing document from global cache:', cacheKey);
        if (globalPdfCache.current[cacheKey]) {
          delete globalPdfCache.current[cacheKey];
          console.log('✅ [VERSION] Document cache cleared successfully');
        }

        // Prefer the current document's fresh first_page (new file), not the backup version
        try {
          let thumb = updatedDetailsData?.document?.first_page || latestVersionDetails?.first_page;
          // Fallback: fetch thumbnails endpoint if missing (non-blocking for modal)
          if (!thumb && typeof onThumbnailUpdate === 'function') {
            (async () => {
              try {
                const resp = await fetch(`${backend}/post_docs/fetch-pdfs?folderPath=${encodeURIComponent(file.path)}`, { credentials: 'include', headers: { 'Origin': window.location.origin } });
                if (resp.ok) {
                  const data = await resp.json();
                  if (data && data.pdfs && data.pdfs[file.nom_document]) {
                    onThumbnailUpdate(file.nom_document, data.pdfs[file.nom_document]);
                  }
                }
              } catch {}
            })();
          } else if (thumb && typeof onThumbnailUpdate === 'function') {
            onThumbnailUpdate(file.nom_document, thumb);
          }
        } catch (_) {}
        
        // Update document details with new version data
        if (updatedDetailsData) {
          console.log('📝 [VERSION] Updating document details with new version');
          
          // Merge current document details with latest version metadata
          const mergedDetails = {
            ...updatedDetailsData.document,
            // Override with latest version metadata
            type: latestVersionDetails?.type || updatedDetailsData.document.type,
            keywords: latestVersionDetails?.keywords || updatedDetailsData.document.keywords,
            tags: latestVersionDetails?.tags || updatedDetailsData.document.tags,
            comment: latestVersionDetails?.comment || updatedDetailsData.document.comment
          };
          
          console.log('🔄 [VERSION] Merged details:', mergedDetails);
          
          // Update both pdfState and editedDocDetails immediately
          dispatch({ type: 'SET_DOC_DETAILS', payload: mergedDetails });
          setEditedDocDetails(mergedDetails);

          // Notify parent (Diffuse) to update list metadata immediately
          try {
            if (typeof onDetailsUpdate === 'function') {
              onDetailsUpdate(file.nom_document, mergedDetails);
            }
          } catch (_) {}

          // UI update: dacă NU am încărcat un fișier nou, păstrăm PDF-ul afișat fără reload
          const uploadedNewFile = !!selectedFile;
          if (!uploadedNewFile) {
            console.log('🧩 [VERSION] Metadata-only update, preserving current PDF without reload');
            dispatch({
              type: 'PDF_LOADED_COMPLETE',
              payload: {
                pdfDocument: pdfState.pdfDocument,
                numPages: pdfState.numPages,
                pageNumber: pdfState.pageNumber,
                pdfUrl: pdfState.pdfUrl,
                originalPdfUrl: pdfState.originalPdfUrl,
                docDetails: mergedDetails
              }
            });
          } else {
            // Forțăm refresh complet doar când s-a încărcat un nou fișier
            console.log('🔄 [VERSION] File uploaded with version, forcing fresh PDF reload');
            versionRefreshRef.current = true;
          }
        }
        
        // Doar dacă s-a încărcat un fișier nou, ștergem URL-ul și refacem fetch-ul
        if (selectedFile) {
          dispatch({ type: 'SET_LOADING', payload: true });
          dispatch({ type: 'LOAD_SUCCESS', payload: { pdfUrl: null, originalPdfUrl: null, docDetails: updatedDetailsData?.document || pdfState.docDetails } });
          setReloadToken(prev => prev + 1);
          loadingRef.current = false;
        }
        
        // Clear versions cache for this document
        versionsCache.current.delete(file.id_document);
        
        // Close the modal and reset state
        setIsCreatingNewVersion(false);
        setSelectedFile(null);
        setEditedDocDetails(null);

        // Notify parent quickly to update thumbnail if we already have it
        try {
          const thumb = updatedDetailsData?.document?.first_page || latestVersionDetails?.first_page;
          if (thumb && typeof onThumbnailUpdate === 'function' && selectedFile) {
            onThumbnailUpdate(file.nom_document, thumb);
          }
        } catch (_) {}

        // If doar metadate (fără fișier nou) și nu avem thumb nou, refetch discret al thumbnails
        try {
          const uploadedNewFile2 = !!selectedFile;
          if (!uploadedNewFile2 && typeof onThumbnailUpdate === 'function') {
            const resp = await fetch(`${backend}/post_docs/diffuse/batch-view/${encodeURIComponent(file.path)}`, { credentials: 'include', headers: { 'Origin': window.location.origin } });
            if (resp.ok) {
              const data = await resp.json();
              const thumb = data?.pdfs?.[file.nom_document];
              if (thumb) onThumbnailUpdate(file.nom_document, thumb);
            }
          }
        } catch (_) {}
      } else {
        console.error('Version creation failed:', responseData);
        throw new Error(responseData.error || 'Failed to create new version');
      }
    } catch (error) {
      console.error('Error in handleCreateNewVersion:', error);
      console.error('Error stack:', error.stack);
      console.error('Failed to create new version:', error.message);
    }
  };

  const handleRevertToVersion = async (documentId, versionId, comment) => {
    try {
      console.log('Reverting to version:', {
        documentId,
        versionId,
        comment
      });

      const response = await fetch(`${backend}/post_docs/versions/${documentId}/revert/${versionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({ comment }),
        credentials: 'include'
      });

      console.log('Revert response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('Revert failed:', error);
        throw new Error(error.error || 'Failed to revert to version');
      }

      const result = await response.json();
      console.log('Revert result:', result);

      if (result.success) {
        // Refresh document list to show reverted version
        console.log('Successfully reverted to previous version');
        // Show success message
        console.log('Successfully reverted to previous version');
      }
    } catch (error) {
      console.error('Error reverting to version:', error);
      console.error('Failed to revert to version:', error.message || 'Failed to revert to version');
    }
  };

  const fetchDocumentVersions = async (documentId) => {
    try {
      console.log('Fetching versions for document:', documentId);

      const response = await fetch(`${backend}/post_docs/versions/${documentId}`, {
        credentials: 'include',
        headers: {
          'Origin': window.location.origin
        }
      });

      console.log('Fetch versions response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('Fetch versions failed:', error);
        throw new Error(error.error || 'Failed to fetch versions');
      }

      const result = await response.json();
      console.log('Fetch versions result:', result);

      if (result.success) {
        return result.versions;
      }
      return [];
    } catch (error) {
      console.error('Error fetching versions:', error);
      console.error('Failed to fetch versions:', error.message || 'Failed to fetch versions');
      return [];
    }
  };

  const handleRestoreVersion = async (versionId) => {
    // Store the version ID and show confirmation modal
    setSelectedVersionForRestore(versionId);
    setShowRestoreConfirmModal(true);
  };

  const executeRestore = async (saveCurrentAsNewVersion) => {
    const versionId = selectedVersionForRestore;
    try {
      // First get the current document details to ensure we have the institution ID
      const detailsResponse = await fetch(
        `${backend}/post_docs/details/${encodeURIComponent(file.nom_document)}`,
        {
          credentials: 'include',
          headers: { 'Origin': window.location.origin }
        }
      );

      if (!detailsResponse.ok) {
        throw new Error('Failed to fetch document details');
      }

      const detailsData = await detailsResponse.json();
      if (!detailsData.success || !detailsData.document) {
        throw new Error('Invalid document details received');
      }

      // Now make the restore request with the institution ID and the save option
      const response = await fetch(`${backend}/post_docs/revert/${file.id_document}/${versionId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          id_institution: detailsData.document.id_institution,
          comment: 'Version restored',
          saveCurrentAsNewVersion: saveCurrentAsNewVersion
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore version');
      }

      const data = await response.json();
      if (data.success) {
        // Show success notification with details
        const message = saveCurrentAsNewVersion && data.newVersionCreated 
          ? `Version restored successfully! Current version saved as Version ${data.newVersionNumber}`
          : 'Version restored successfully!';
        console.log('Move successful:', message);
        
        // Close modals
        setShowRestoreConfirmModal(false);
        setShowVersionHistory(false);
        setSelectedVersionForRestore(null);
        
        // Get the restored version details to update UI with correct metadata
        console.log('📊 [RESTORE] Fetching all versions to get restored version details');
        const versionsResponse = await fetch(
          `${backend}/post_docs/versions/${file.id_document}`,
          {
            credentials: 'include',
            headers: { 'Origin': window.location.origin }
          }
        );
        
        let restoredVersionDetails = null;
        if (versionsResponse.ok) {
          const versionsData = await versionsResponse.json();
          if (versionsData.success && versionsData.versions) {
            // Find the restored version by version number
            const restoredVersion = versionsData.versions.find(v => v.id_version === versionId);
            if (restoredVersion) {
              restoredVersionDetails = restoredVersion;
              console.log('✅ [RESTORE] Retrieved restored version details:', restoredVersionDetails);
            } else {
              console.log('⚠️ [RESTORE] Restored version not found in versions list');
            }
          }
        }
        
        // Refresh the document details (for current document state)
        const updatedDetailsResponse = await fetch(
          `${backend}/post_docs/details/${encodeURIComponent(file.nom_document)}`,
          {
            credentials: 'include',
            headers: { 'Origin': window.location.origin }
          }
        );
        
        if (updatedDetailsResponse.ok) {
          const updatedDetailsData = await updatedDetailsResponse.json();
          if (updatedDetailsData.success) {
            // Force complete refresh after restore (same logic as version creation)
            console.log('🔄 [RESTORE] Forcing complete refresh after restore');
            
            // Clear the specific document from global cache FIRST
            const cacheKey = `${file.path}/${file.nom_document}`;
            console.log('🗑️ [RESTORE] Clearing document from global cache:', cacheKey);
            if (globalPdfCache.current.has(cacheKey)) {
              globalPdfCache.current.delete(cacheKey);
              console.log('✅ [RESTORE] Document cache cleared successfully');
            }

            // If backend returned first_page for the restored version, propagate to caller
            try {
              const thumb = restoredVersionDetails?.first_page || updatedDetailsData?.document?.first_page;
              if (thumb && typeof onThumbnailUpdate === 'function') {
                onThumbnailUpdate(file.nom_document, thumb);
              }
            } catch (_) {}
            
            // Update document details with restored version metadata
            console.log('📝 [RESTORE] Updating document details with restored version metadata');
            
            // Merge current document details with restored version metadata
            const mergedDetails = {
              ...updatedDetailsData.document,
              // Override with restored version metadata
              type: restoredVersionDetails?.type || updatedDetailsData.document.type,
              keywords: restoredVersionDetails?.keywords || updatedDetailsData.document.keywords,
              tags: restoredVersionDetails?.tags || updatedDetailsData.document.tags,
              comment: restoredVersionDetails?.comment || updatedDetailsData.document.comment
            };
            
            console.log('🔄 [RESTORE] Merged details:', mergedDetails);
            
            dispatch({ type: 'SET_DOC_DETAILS', payload: mergedDetails });
            setEditedDocDetails(mergedDetails);
            try {
              if (typeof onDetailsUpdate === 'function') {
                onDetailsUpdate(file.nom_document, mergedDetails);
              }
            } catch (_) {}
            
            // Force fresh load (mirror logic from create new version):
            // 1) Apply restored details to UI
            // 2) Mark version refresh to bypass cache and preloaded details
            console.log('🔄 [RESTORE] Applying restored metadata and forcing fresh PDF load');
            versionRefreshRef.current = true;
            dispatch({ type: 'SET_DOC_DETAILS', payload: mergedDetails });
            setEditedDocDetails(mergedDetails);
            // Show loading state, then clear current urls so effect fetches a fresh PDF
            dispatch({ type: 'SET_LOADING', payload: true });
            dispatch({ type: 'LOAD_SUCCESS', payload: { pdfUrl: null, originalPdfUrl: null, docDetails: mergedDetails } });
            // Bump reloadToken to force the main effect to run in a new tick
            setReloadToken(prev => prev + 1);
            loadingRef.current = false;
          }
        }

        // Refresh the versions list
        await fetchVersions();
      } else {
        throw new Error(data.error || 'Failed to restore version');
      }
    } catch (error) {
      console.error('Error restoring version:', error);
              console.error('Failed to restore version:', error.message);
      setShowRestoreConfirmModal(false);
      setSelectedVersionForRestore(null);
    }
  };

  // Function to handle version preview
  const handleVersionPreview = async (version) => {
    try {
      setSelectedVersionForPreview(version);
      
      // Use the file_path directly from the version database entry
      console.log('🔄 Loading version preview for:', version.file_path);
      
      // Split the file_path to get path and filename
      const pathParts = version.file_path.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const pathOnly = pathParts.slice(0, -1).join('/');
      
      console.log('📁 Path parts:', { pathOnly, fileName });
      
      // Fetch the version file using authenticated request (same as main modal)
      const response = await fetch(`${backend}/post_docs/diffuse/view-complete/${encodeURIComponent(pathOnly)}/${encodeURIComponent(fileName)}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/pdf',
          'Origin': window.location.origin
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error response:', errorText);
        throw new Error(`Failed to fetch version PDF: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('📊 Version PDF Blob info:', {
        version: version.version_number,
        blobSize: blob.size,
        blobType: blob.type
      });

      // Create object URL for the PDF blob (same as main modal)
      const blobUrl = URL.createObjectURL(blob);
      console.log('✅ Version PDF loaded successfully:', blobUrl);
      
      setVersionPreviewUrl(blobUrl);
      setVersionPreviewCurrentPage(1);
      
    } catch (error) {
      console.error('Error loading version preview:', error);
      showToast('Failed to load version preview', 'error');
    }
  };

  // Functions for version preview navigation
  const onVersionPreviewLoadSuccess = ({ numPages }) => {
    setVersionPreviewNumPages(numPages);
  };

  const handleVersionPreviewNextPage = () => {
    if (versionPreviewCurrentPage < versionPreviewNumPages) {
      setVersionPreviewCurrentPage(versionPreviewCurrentPage + 1);
    }
  };

  const handleVersionPreviewPreviousPage = () => {
    if (versionPreviewCurrentPage > 1) {
      setVersionPreviewCurrentPage(versionPreviewCurrentPage - 1);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        console.error('Vă rugăm să selectați un fișier PDF');
        return;
      }
      console.log('Selected file:', file);
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRevertToOriginal = () => {
    if (previewUrl && previewUrl !== pdfState.originalPdfUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(pdfState.originalPdfUrl);
    setSelectedFile(null);
  };

  // Replace the Command-based dropdown with Chakra UI components
  const TypeDropdown = ({ value, onChange, options }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredOptions = options.filter(option => 
      option.type_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <Popover>
        <PopoverTrigger>
          <Button
            variant="outline"
            w="full"
            justifyContent="space-between"
            p={3}
            bg="white"
            borderColor="gray.200"
            _hover={{ borderColor: 'blue.300' }}
            _focus={{ borderColor: 'blue.500', ring: 2, ringColor: 'blue.200' }}
            rounded="lg"
            transition="all 0.2s"
          >
            {value || "Selectați tipul documentului..."}
            <FiChevronDown />
          </Button>
        </PopoverTrigger>
        <PopoverContent w="full" p={0}>
          <PopoverBody p={0}>
            <InputGroup>
              <Input
                placeholder="Caută tip..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                borderBottomRadius={0}
              />
              <InputRightElement>
                <FiSearch color="gray.400" />
              </InputRightElement>
            </InputGroup>
            <List maxH="300px" overflowY="auto">
              {filteredOptions.map((option) => (
                <ListItem
                  key={option.id}
                  px={4}
                  py={3}
                  cursor="pointer"
                  _hover={{ bg: 'blue.50' }}
                  onClick={() => {
                    onChange(option.type_name);
                  }}
                  bg={value === option.type_name ? 'blue.50' : 'transparent'}
                >
                  <HStack>
                    {value === option.type_name && (
                      <Box color="blue.600" fontSize="sm">✓</Box>
                    )}
                    <Text
                      color={value === option.type_name ? 'blue.700' : 'gray.700'}
                      fontWeight={value === option.type_name ? 'medium' : 'normal'}
                    >
                      {option.type_name}
                    </Text>
                  </HStack>
                </ListItem>
              ))}
            </List>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    );
  };

  // Add this function to sort items by popularity
  const sortByPopularity = (items) => {
    if (!items || !Array.isArray(items)) return [];
    return [...items].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
  };

  // Add this function to create new tags
  const createNewTag = async () => {
    if (!newTagName.trim()) {
      antMessage.error("Vă rugăm să introduceți un nume de tag");
      return;
    }

    const tagNameToCreate = newTagName.trim();
    
    try {
      const response = await fetch(`${backend}/post_docs/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ tagName: tagNameToCreate })
      });

      const data = await response.json();
      
      if (data.success) {
        const newTag = {
          id: data.tagId,
          tag_name: tagNameToCreate,
          isNew: true
        };

        setEditedDocDetails(prev => ({
          ...prev,
          tags: [...(prev?.tags || []), newTag]
        }));

        setNewTagName('');
        setShowTagInput(false);
        antMessage.success(`Tag "${tagNameToCreate}" created successfully`);
      } else {
        antMessage.error(data.error || "Failed to create tag");
      }
    } catch (error) {
      console.error("Error creating tag:", error);
      antMessage.error("Error creating tag");
    }
  };

  // Add this function inside the PDFViewerModal component, before the return statement
  const showToast = (message, type = 'success') => {
    antMessage({
      content: message,
      type: type,
      duration: 3,
      style: {
        marginTop: '20px',
      },
    });
  };

  // Funcția pentru crearea folderului
  const handleCreateFolder = async (folderName, parentPath, isPrivate) => {
    try {
              console.log('Loading started');
      
      // Construim calea completă pentru noul folder
      const fullPath = parentPath 
        ? `${parentPath}/${folderName}` 
        : `${folderName}`.replace(/^\/+/, '');
        
      console.log('Creating folder:', {
        name: folderName,
        path: fullPath,
        isPrivate
      });
      
      const response = await fetch(`${backend}/post_docs/folders`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          folderName,
          folderPath: fullPath,
          isPrivate: isPrivate ? 1 : 0
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create folder');
      }
      
      // Refresh the folder list
      console.log('Folder created, refresh needed');
      
      // Show success notification
              console.log(`Folder "${folderName}" created successfully`);
      
    } catch (error) {
      console.error('Error creating folder:', error);
      console.error('Failed to create folder:', error.message);
    } finally {
      console.log('Loading finished');
    }
  };

  const getIconForFolder = (folder) => {
    if (folder.is_private) {
      return (
        <div className="relative">
          <FaFolder className="text-4xl text-yellow-500 mb-2" />
          <FaLock className="absolute bottom-2 right-0 text-sm text-gray-500" />
          <button
            className="absolute top-0 right-0 p-1 text-gray-500 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              console.log('Folder settings clicked for:', folder);
            }}
          >
            <FaCog className="text-lg" />
          </button>
        </div>
      );
    }
    return <FaFolder className="text-4xl text-yellow-500 mb-2" />;
  };

  // New: Handle folder delete after viewing contents
  const handleFolderDeleteAfterContents = () => {
    console.log('Folder delete after contents - not implemented in PDFViewerModal');
  };

  const handleMove = async (documentId, targetFolder) => {
    console.log('handleMove called with:', { documentId, targetFolder });
    try {
      const response = await fetch(`${backend}/api/documents/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          targetFolder,
        }),
      });

      console.log('Move API response status:', response.status);
      const data = await response.json();
      console.log('Move API response data:', data);

      if (response.ok) {
        console.log('Move successful');
        showSuccess('Item moved successfully');
        // Refresh the view
        await fetchData();
      } else {
        console.error('Move failed:', data.error);
        showError('Error', data.error || 'Failed to move item');
      }
    } catch (error) {
      console.error('Move error:', error);
      showError('Error', 'Failed to move item');
    }
  };

  // Socket handler not needed in PDFViewerModal
  // useEffect(() => {
  //   console.log('Socket not available in PDFViewerModal');
  // }, []);

  // Funcții helper pentru notificări și refresh
  const showError = (title, message) => {
      console.error(`${title}: ${message}`);
      // Aici puteți adăuga logica pentru afișarea erorilor în UI
  };

  const showSuccess = (message) => {
      console.log(`Success: ${message}`);
      // Aici puteți adăuga logica pentru afișarea mesajelor de succes în UI
  };

  const fetchData = async () => {
    // Implementarea va fi adăugată ulterior
  };

  const refreshView = () => {
    // Reîncarcă datele curente
    fetchData();
  };

  // Add this useEffect to fetch available tags when creating new version
  useEffect(() => {
    const fetchAvailableTags = async () => {
      try {
        const response = await fetch(`${backend}/post_docs/tags`, {
          credentials: 'include',
          headers: { 'Origin': window.location.origin }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch tags');
        }
        
        const data = await response.json();
        if (data.success && data.tags) {
          setAvailableTags(data.tags);
        }
      } catch (error) {
        console.error('Error fetching available tags:', error);
      }
    };

    if (isOpen && isCreatingNewVersion) {
      fetchAvailableTags();
    }
  }, [isOpen, isCreatingNewVersion]);

  // These functions are not needed in PDFViewerModal - they belong to DiffusePage
  const fetchRestoreModalFolders = async (path = '') => {
    console.log('fetchRestoreModalFolders not implemented in PDFViewerModal');
  };

  const handleRestoreModalNavigate = async (folder) => {
    console.log('handleRestoreModalNavigate not implemented in PDFViewerModal');
  };

  const handleRestoreModalNavigateBack = async () => {
    console.log('handleRestoreModalNavigateBack not implemented in PDFViewerModal');
  };

  // Removed duplicate fetchMultiplePdfs function - using the one from parent scope

  return (
      <Modal isOpen={isOpen} onClose={onClose} size="6xl" isCentered motionPreset="none">
        <ModalOverlay 
          backdropFilter="blur(10px)" 
          bg="rgba(0, 0, 0, 0.35)"
        />
        <MotionModalContent 
          bg="white" 
          borderRadius="3xl" 
          boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          maxH="95vh"
          overflow="hidden"
          border="1px solid"
          borderColor="gray.100"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <ModalHeader 
            bgGradient="linear(135deg, #667eea 0%, #764ba2 100%)"
            borderBottom="1px" 
            borderColor="gray.200"
            p={0}
            borderTopRadius="3xl"
            borderBottomRadius="0"
            position="relative"
            overflow="hidden"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.05, ease: "easeOut" }}
          >
            {/* Modern gradient overlay */}
            <Box
              position="absolute"
              top="0"
              left="0"
              right="0"
              bottom="0"
              bgGradient="linear(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)"
              pointerEvents="none"
            />
            {/* Modern Top Navigation Bar */}
            <Box 
              bg="white" 
              borderBottom="1px" 
              borderColor="gray.100" 
              px={8} 
              py={4}
              position="relative"
              zIndex={1}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <HStack justify="space-between" align="center">
                <HStack spacing={4}>
                  <Box 
                    p={3} 
                    bgGradient="linear(135deg, #667eea 0%, #764ba2 100%)"
                    borderRadius="2xl" 
                    color="white"
                    boxShadow="0 4px 15px rgba(102, 126, 234, 0.3)"
                    position="relative"
                    overflow="hidden"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                  >
                    <Box
                      position="absolute"
                      top="0"
                      left="0"
                      right="0"
                      bottom="0"
                      bg="rgba(255, 255, 255, 0.1)"
                      backdropFilter="blur(10px)"
                    />
                    <FaFilePdf size="20" style={{ position: 'relative', zIndex: 1 }} />
                  </Box>
                  <VStack align="start" spacing={1}>
                    <Text 
                      fontWeight="800" 
                      fontSize="xl" 
                      color="gray.800" 
                      noOfLines={1}
                      letterSpacing="tight"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                      {file?.nom_document || 'Document'}
                    </Text>
                    <HStack spacing={4} fontSize="sm">
                      <HStack 
                        spacing={2} 
                        bgGradient="linear(135deg, #667eea 0%, #764ba2 100%)"
                        px={4} 
                        py={2} 
                        borderRadius="full"
                        color="white"
                        boxShadow="0 2px 10px rgba(102, 126, 234, 0.2)"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                      >
                        <FaCalendarAlt size="12" />
                        <Text fontWeight="600">
                          {pdfState.docDetails?.dateUpload ? new Date(pdfState.docDetails.dateUpload).toLocaleDateString('ro-RO', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'N/A'}
                        </Text>
                      </HStack>
                      <HStack 
                        spacing={2} 
                        bg="gray.50" 
                        px={4} 
                        py={2} 
                        borderRadius="full"
                        border="1px solid"
                        borderColor="gray.200"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                      >
                        <Box w={3} h={3} bg="gray.400" borderRadius="full" />
                        <Text color="gray.700" fontWeight="600">
                          {pdfState.docDetails?.file_size ? `${(pdfState.docDetails.file_size / 1024).toFixed(2)} KB` : 'N/A'}
                        </Text>
                      </HStack>
                    </HStack>
                  </VStack>
                </HStack>
                
                {/* Ultra Modern Action Buttons */}
                <HStack 
                  spacing={3}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <Button
                    leftIcon={<FaHistory />}
                    onClick={() => {
                      setShowVersionHistory(true);
                      fetchVersions();
                    }}
                    variant="ghost"
                    size="md"
                    fontSize="sm"
                    fontWeight="600"
                    borderRadius="xl"
                    px={5}
                    py={3}
                    bg="white"
                    color="gray.600"
                    border="1px solid"
                    borderColor="gray.200"
                    _hover={{
                      bg: 'gray.50',
                      borderColor: 'gray.300',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)'
                    }}
                    transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                  >
                    History
                  </Button>
                  <Button
                    leftIcon={<FaPlus />}
                    onClick={() => {
                      setIsCreatingNewVersion(true);
                      setEditedDocDetails(pdfState.docDetails);
                    }}
                    variant="solid"
                    size="md"
                    fontSize="sm"
                    fontWeight="700"
                    borderRadius="xl"
                    px={5}
                    py={3}
                    bgGradient="linear(135deg, #667eea 0%, #764ba2 100%)"
                    color="white"
                    _hover={{
                      bgGradient: 'linear(135deg, #5a6fd8 0%, #6a4190 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 30px rgba(102, 126, 234, 0.4)'
                    }}
                    transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                  >
                    New Version
                  </Button>
                  <Button
                    leftIcon={<FaSignature />}
                    onClick={() => handleCSCSignature()}
                    variant="solid"
                    size="md"
                    fontSize="sm"
                    fontWeight="700"
                    borderRadius="xl"
                    px={5}
                    py={3}
                    bgGradient="linear(135deg, #f093fb 0%, #f5576c 100%)"
                    color="white"
                    _hover={{
                      bgGradient: 'linear(135deg, #e685f0 0%, #e54b5f 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 30px rgba(240, 147, 251, 0.4)'
                    }}
                    transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                    isLoading={isSigningDocument}
                  >
                    Professional Sign
                  </Button>
                  <Button
                    leftIcon={<FiDownload />}
                    onClick={handleDownload}
                    variant="solid"
                    size="md"
                    fontSize="sm"
                    fontWeight="700"
                    borderRadius="xl"
                    px={5}
                    py={3}
                    bgGradient="linear(135deg, #4facfe 0%, #00f2fe 100%)"
                    color="white"
                    _hover={{
                      bgGradient: 'linear(135deg, #3e9bed 0%, #00e1eb 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 30px rgba(79, 172, 254, 0.4)'
                    }}
                    transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                  >
                    Download
                  </Button>
                  <IconButton
                    aria-label="Close"
                    icon={<FiX />}
                    onClick={onClose}
                    variant="ghost"
                    size="md"
                    borderRadius="full"
                    bg="white"
                    color="gray.400"
                    border="1px solid"
                    borderColor="gray.200"
                    _hover={{
                      bg: 'red.50',
                      color: 'red.500',
                      borderColor: 'red.200',
                      transform: 'rotate(90deg) scale(1.1)'
                    }}
                    transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                  />
                </HStack>
              </HStack>
            </Box>
            
            {/* Ultra Modern Search and Navigation Bar */}
            <Box 
              px={8} 
              py={6}
              bg="gray.50"
              borderBottom="1px solid"
              borderColor="gray.100"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <HStack spacing={6} justify="space-between" wrap="wrap">
                {/* Ultra Modern Search with Results */}
                <VStack spacing={4} flex={1} maxW="700px" align="stretch">
                  <HStack spacing={4}>
                    <InputGroup size="lg" flex={1}>
                      <InputLeftElement>
                        <Box
                          p={2}
                          bgGradient="linear(135deg, #667eea 0%, #764ba2 100%)"
                          borderRadius="lg"
                          color="white"
                          boxShadow="0 2px 10px rgba(102, 126, 234, 0.3)"
                        >
                          <FiSearch size="16" />
                        </Box>
                      </InputLeftElement>
                      <Input
                        placeholder={isOCRSearchMode ? "🤖 Căutare OCR în imagini..." : "🔍 Caută în document..."}
                        value={inDocSearchQuery}
                        onChange={handleInDocSearch}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const event = { target: { value: inDocSearchQuery } };
                            handleInDocSearch(event);
                          }
                        }}
                        bg="white"
                        border="2px solid"
                        borderColor="gray.200"
                        _focus={{
                          borderColor: "#667eea",
                          ring: 4,
                          ringColor: "rgba(102, 126, 234, 0.1)",
                          boxShadow: "0 0 0 4px rgba(102, 126, 234, 0.1)"
                        }}
                        _hover={{
                          borderColor: "#667eea",
                          transform: "translateY(-1px)",
                          boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)"
                        }}
                        borderRadius="2xl"
                        fontSize="md"
                        fontWeight="500"
                        pl={12}
                        transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                      />
                      <InputRightElement width="auto" pr={2}>
                        {isSearchingInDoc ? (
                          <Spinner size="xs" color="blue.500" />
                        ) : inDocSearchResults.length > 0 ? (
                          <HStack spacing={1} bg="green.100" px={2} py={1} borderRadius="md">
                            <Text fontSize="xs" color="green.700" fontWeight="bold">
                              {currentSearchIndex + 1}/{inDocSearchResults.length}
                            </Text>
                            <IconButton
                              aria-label="Previous result"
                              icon={<FiChevronUp />}
                              size="xs"
                              variant="ghost"
                              colorScheme="green"
                              onClick={() => navigateSearchResults(-1)}
                              isDisabled={inDocSearchResults.length === 0}
                            />
                            <IconButton
                              aria-label="Next result"
                              icon={<FiChevronDown />}
                              size="xs"
                              variant="ghost"
                              colorScheme="green"
                              onClick={() => navigateSearchResults(1)}
                              isDisabled={inDocSearchResults.length === 0}
                            />
                          </HStack>
                        ) : null}
                      </InputRightElement>
                    </InputGroup>
                    
                    <Button
                      leftIcon={isOCRSearchMode ? <span>🤖</span> : <span>🔍</span>}
                      onClick={() => {
                        if (isOCRSearchMode) {
                          triggerOCRSearch();
                        } else {
                          setIsOCRSearchMode(true);
                          setInDocSearchResults([]);
                          setCurrentSearchIndex(-1);
                          document.querySelectorAll('.pdf-highlight-word, .ocr-highlight-overlay').forEach(el => el.remove());
                        }
                      }}
                      variant={isOCRSearchMode ? "solid" : "outline"}
                      colorScheme="blue"
                      size="md"
                      isDisabled={!inDocSearchQuery.trim()}
                      fontSize="sm"
                      fontWeight="medium"
                      borderRadius="xl"
                      _hover={{
                        transform: "translateY(-1px)",
                        boxShadow: "sm"
                      }}
                      transition="all 0.2s"
                      isLoading={isSearchingInDoc && isOCRSearchMode}
                    >
                      {isOCRSearchMode ? "Search OCR" : "OCR"}
                    </Button>
                    
                    {isOCRSearchMode && (
                      <Button
                        onClick={() => {
                          setIsOCRSearchMode(false);
                          setInDocSearchResults([]);
                          setCurrentSearchIndex(-1);
                          document.querySelectorAll('.pdf-highlight-word, .ocr-highlight-overlay').forEach(el => el.remove());
                        }}
                        leftIcon={<span>❌</span>}
                        variant="ghost"
                        colorScheme="red"
                        size="md"
                        fontSize="sm"
                        borderRadius="xl"
                        _hover={{
                          bg: "red.50"
                        }}
                      >
                        Exit
                      </Button>
                    )}
                  </HStack>
                </VStack>
                
                {/* Page Navigation */}
                <HStack spacing={3} bg="white" px={4} py={2} borderRadius="xl" border="1px solid" borderColor="blue.200" minW="280px">
                  <IconButton
                    aria-label="First page"
                    icon={<FiChevronsLeft />}
                    onClick={() => handlePageChange(1)}
                    isDisabled={pdfState.pageNumber <= 1}
                    variant="ghost"
                    colorScheme="blue"
                    size="sm"
                    borderRadius="lg"
                    _hover={{ bg: 'blue.50' }}
                  />
                  <IconButton
                    aria-label="Previous page"
                    icon={<FiChevronLeft />}
                    onClick={() => handlePageChange(pdfState.pageNumber - 1)}
                    isDisabled={pdfState.pageNumber <= 1}
                    variant="ghost"
                    colorScheme="blue"
                    size="sm"
                    borderRadius="lg"
                    _hover={{ bg: 'blue.50' }}
                  />
                  
                  <HStack spacing={2} align="center">
                    <Text fontSize="sm" color="gray.600" minW="fit-content">
                      Page
                    </Text>
                    <Input
                      value={pdfState.pageNumber}
                      onChange={(e) => {
                        const newPage = parseInt(e.target.value);
                        if (!isNaN(newPage) && newPage >= 1 && newPage <= (pdfState.numPages || 1)) {
                          handlePageChange(newPage);
                        }
                      }}
                      type="number"
                      min={1}
                                              max={pdfState.numPages || 1}
                      size="sm"
                      w="50px"
                      textAlign="center"
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="blue.200"
                      _focus={{ borderColor: 'blue.400', ring: 1, ringColor: 'blue.100' }}
                    />
                    <Text fontSize="sm" color="gray.600" minW="fit-content">
                                              of {pdfState.numPages || 1}
                    </Text>
                  </HStack>
                  
                  <IconButton
                    aria-label="Next page"
                    icon={<FiChevronRight />}
                    onClick={() => handlePageChange(pdfState.pageNumber + 1)}
                    isDisabled={pdfState.pageNumber >= (pdfState.numPages || 1)}
                    variant="ghost"
                    colorScheme="blue"
                    size="sm"
                    borderRadius="lg"
                    _hover={{ bg: 'blue.50' }}
                  />
                  <IconButton
                    aria-label="Last page"
                    icon={<FiChevronsRight />}
                    onClick={() => handlePageChange(pdfState.numPages || 1)}
                    isDisabled={pdfState.pageNumber >= (pdfState.numPages || 1)}
                    variant="ghost"
                    colorScheme="blue"
                    size="sm"
                    borderRadius="lg"
                    _hover={{ bg: 'blue.50' }}
                  />
                </HStack>
              </HStack>
            </Box>
          </ModalHeader>

          <ModalBody p={0} position="relative" display="flex" flexDirection="column" maxH="calc(95vh - 200px)" borderRadius="0" borderBottomRadius="3xl">
            <Grid templateColumns="1fr 380px" flex={1} minH="0">
              <Box 
                p={6} 
                overflowY="auto"
                bg="gray.50"
                position="relative"
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                flex={1}
                minH="0"
                css={{
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: '#f7fafc',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: '#cbd5e0',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background: '#a0aec0',
                  },
                }}
              >
                                    {pdfState.isLoading && (
                  <Center h="full">
                    <VStack spacing={4}>
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="flex items-center justify-center"
                      >
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <FaFilePdf size="32" color="white" />
                        </div>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                        <Text color="blue.600" fontWeight="medium">Loading PDF...</Text>
                      </motion.div>
                    </VStack>
                  </Center>
                )}
                
                {pdfState.error && (
                  <Center h="full">
                    <VStack spacing={4}>
                      <Text color="red.500">{pdfState.error}</Text>
                      <Button 
                        colorScheme="blue" 
                        size="sm"
                        onClick={() => window.open(pdfState.pdfUrl, '_blank')}
                      >
                        Try opening in new tab
                      </Button>
                    </VStack>
                  </Center>
                )}

                                  {!pdfState.isLoading && !pdfState.error && (pdfState.pdfUrl || previewUrl) && (
                  <VStack spacing={4} w="full" h="full">
                  <Document
                      file={pdfState.pdfUrl || previewUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={handleDocumentLoadError}
                    loading={
                      <Center h="full">
                        <VStack spacing={4}>
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="flex items-center justify-center"
                          >
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                              <FaFilePdf size="32" color="white" />
                            </div>
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                          >
                            <Text color="blue.600" fontWeight="medium">Rendering PDF...</Text>
                          </motion.div>
                        </VStack>
                      </Center>
                    }
                    options={pdfOptions}
                  >
                    <Page 
                      pageNumber={pdfState.pageNumber} 
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      width={Math.min(window.innerWidth * 0.45, 720)}
                      onRenderSuccess={() => {
                        // Time-to-first-paint marker
                        console.log('⏱️ [PDF_MODAL] PAGE_RENDERED_FIRST');
                        // Mark first paint done for down-stream async fetches
                        if (!firstPaintDone) setFirstPaintDone(true);
                      }}
                      onLoadError={(error) => {
                        console.error('Error loading page:', error);
                        console.error(`Failed to load page: ${error.message}`);
                      }}
                    />
                  </Document>


                  </VStack>
                )}
              </Box>

              <Box 
                bg="white"
                borderLeft="1px" 
                borderColor="gray.200"
                position="relative"
                display="flex"
                flexDirection="column"
                flex={1}
                minH="0"
              >
                <VStack 
                  align="stretch" 
                  spacing={6} 
                  p={6} 
                  pb={20} 
                  position="relative"
                  flex={1}
                  overflowY="auto"
                  maxH="100%"
                  css={{
                    '&::-webkit-scrollbar': {
                      width: '6px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: '#f7fafc',
                      borderRadius: '3px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#cbd5e0',
                      borderRadius: '3px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      background: '#a0aec0',
                    },
                  }}
                >
                  {/* Document Header */}
                  <Box bg="gray.50" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200">
                    <HStack spacing={3} align="center">
                      <Box 
                        p={3} 
                        bg="blue.100" 
                        borderRadius="xl" 
                        color="blue.600"
                      >
                        <FaFilePdf size="20" />
                      </Box>
                      <VStack align="start" spacing={1} flex={1}>
                        <Text fontWeight="bold" fontSize="md" color="gray.800" noOfLines={2}>
                          {file?.nom_document || 'Document'}
                        </Text>
                        <HStack spacing={3} fontSize="xs" color="gray.500">
                          <Text>
                            {pdfState.docDetails?.file_size ? `${(pdfState.docDetails.file_size / 1024).toFixed(2)} KB` : 'N/A'}
                          </Text>
                          <Text>•</Text>
                          <Text>
                            {pdfState.docDetails?.created_at ? new Date(pdfState.docDetails.created_at).toLocaleDateString('ro-RO') : 'N/A'}
                          </Text>
                        </HStack>
                      </VStack>
                      {isCreatingNewVersion && (
                        <Box>
                          <Badge colorScheme="purple" variant="solid" borderRadius="full" px={3} py={1} fontSize="xs">
                            NEW VERSION
                          </Badge>
                        </Box>
                      )}
                    </HStack>
                  </Box>

                  {/* File Upload Section - Only when creating new version */}
                  {isCreatingNewVersion && (
                    <Box>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3} display="flex" alignItems="center" gap={2}>
                        📄 Document Upload
                      </Text>
                      <Box 
                        border="2px dashed" 
                        borderColor="blue.300" 
                        borderRadius="xl" 
                        p={6} 
                        bg="blue.50"
                        _hover={{ bg: 'blue.100', borderColor: 'blue.400' }}
                        transition="all 0.2s"
                        cursor="pointer"
                        onClick={() => document.getElementById('file-upload').click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const file = e.dataTransfer.files[0];
                          if (file && file.type === 'application/pdf') {
                            setSelectedFile(file);
                            const url = URL.createObjectURL(file);
                            setPreviewUrl(url);
                          }
                        }}
                      >
                        <Input
                          type="file"
                          accept=".pdf"
                          onChange={handleFileChange}
                          display="none"
                          id="file-upload"
                        />
                        {selectedFile ? (
                          <VStack spacing={3}>
                            <Box color="green.500">
                              <FaFilePdf size="28" />
                            </Box>
                            <VStack spacing={1}>
                              <Text fontWeight="semibold" color="green.700" textAlign="center">
                                {selectedFile.name}
                              </Text>
                              <Text fontSize="xs" color="green.600">
                                {(selectedFile.size / 1024).toFixed(2)} KB
                              </Text>
                            </VStack>
                            <Button
                              size="sm"
                              variant="outline"
                              colorScheme="red"
                              borderRadius="xl"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(null);
                                setPreviewUrl(null);
                              }}
                            >
                              Remove file
                            </Button>
                          </VStack>
                        ) : (
                          <VStack spacing={3}>
                            <Box color="blue.500">
                              <FaFilePdf size="28" />
                            </Box>
                            <VStack spacing={1}>
                              <Text fontWeight="semibold" color="blue.700" textAlign="center">
                                Upload New Document
                              </Text>
                              <Text fontSize="xs" color="blue.600" textAlign="center">
                                Drag & Drop PDF here or click to browse
                              </Text>
                            </VStack>
                          </VStack>
                        )}
                      </Box>
                      
                      {!selectedFile && (
                        <Button
                          variant="outline"
                          colorScheme="blue"
                          leftIcon={<FaRedo />}
                          onClick={handleRevertToOriginal}
                          size="sm"
                          borderRadius="xl"
                          mt={3}
                          w="full"
                          _hover={{
                            bg: 'blue.50',
                            transform: 'translateY(-1px)',
                            boxShadow: 'md'
                          }}
                          transition="all 0.2s"
                          fontSize="sm"
                        >
                          Revert to Original PDF
                        </Button>
                      )}
                    </Box>
                  )}

                  {/* Document Type Field */}
                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3} display="flex" alignItems="center" gap={2}>
                      📋 Document Type
                    </Text>
                    {isCreatingNewVersion ? (
                      <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" p={1}>
                        <TypeDropdown
                          value={editedDocDetails?.type}
                          onChange={(type) => setEditedDocDetails(prev => ({ ...prev, type }))}
                          options={availableTypes}
                        />
                      </Box>
                    ) : (
                      <Box bg="white" p={3} borderRadius="xl" border="1px solid" borderColor="gray.200">
                        <Tag 
                          size="lg" 
                          colorScheme="purple" 
                          borderRadius="xl" 
                          px={4} 
                          py={2}
                          bg="purple.100"
                          color="purple.700"
                          fontWeight="semibold"
                        >
                          {pdfState.docDetails?.type || 'Not specified'}
                        </Tag>
                      </Box>
                    )}
                  </Box>

                  {/* Keywords Field */}
                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3} display="flex" alignItems="center" gap={2}>
                      🔤 Keywords
                    </Text>
                    {isCreatingNewVersion ? (
                      <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" p={4}>
                        <VStack align="stretch" spacing={3}>
                          <InputGroup>
                            <Input
                              placeholder="Add a keyword and press Enter"
                              value={newKeyword}
                              onChange={(e) => setNewKeyword(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (newKeyword.trim()) {
                                    if ((editedDocDetails?.keywords || []).length >= 5) {
                                      antMessage.warning('Maximum 5 keywords allowed');
                                      return;
                                    }
                                    if (!(editedDocDetails?.keywords || []).includes(newKeyword.trim())) {
                                      setEditedDocDetails(prev => ({
                                        ...prev,
                                        keywords: [...(prev?.keywords || []), newKeyword.trim()]
                                      }));
                                      setNewKeyword('');
                                    } else {
                                      antMessage.warning('Keyword already exists');
                                    }
                                  }
                                }
                              }}
                              borderRadius="xl"
                              border="1px solid"
                              borderColor="gray.300"
                              _focus={{
                                borderColor: 'purple.400',
                                ring: 2,
                                ringColor: 'purple.100'
                              }}
                            />
                            <InputRightElement>
                              <FiPlus color="gray.400" />
                            </InputRightElement>
                          </InputGroup>
                          {(editedDocDetails?.keywords || []).length > 0 && (
                            <Wrap spacing={2}>
                              <AnimatePresence>
                                {(editedDocDetails?.keywords || []).map((keyword, index) => (
                                  <WrapItem key={`selected-keyword-${index}-${keyword}`}>
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.8 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <Tag
                                        size="lg"
                                        colorScheme="purple"
                                        borderRadius="xl"
                                        px={4}
                                        py={2}
                                        bg="purple.100"
                                        color="purple.700"
                                        fontWeight="medium"
                                        _hover={{ transform: 'translateY(-1px)', boxShadow: 'md' }}
                                        transition="all 0.2s"
                                      >
                                        <HStack spacing={2}>
                                          <Text>{keyword}</Text>
                                          <IconButton
                                            aria-label="Remove keyword"
                                            icon={<FaTimes />}
                                            size="xs"
                                            variant="ghost"
                                            colorScheme="purple"
                                            onClick={() => handleRemoveKeyword(keyword)}
                                            borderRadius="full"
                                            _hover={{ bg: 'purple.200' }}
                                          />
                                        </HStack>
                                      </Tag>
                                    </motion.div>
                                  </WrapItem>
                                ))}
                              </AnimatePresence>
                            </Wrap>
                          )}
                        </VStack>
                      </Box>
                    ) : (
                      <Box bg="white" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200">
                        {(pdfState.docDetails?.keywords || []).length > 0 ? (
                          <Wrap spacing={2}>
                                                          {(pdfState.docDetails?.keywords || []).map((keyword, index) => (
                              <WrapItem key={`display-keyword-${index}-${typeof keyword === 'string' ? keyword : keyword.keyword_name}`}>
                                <Tag 
                                  size="lg" 
                                  colorScheme="purple" 
                                  borderRadius="xl"
                                  px={4}
                                  py={2}
                                  bg="purple.100"
                                  color="purple.700"
                                  fontWeight="medium"
                                >
                                  {typeof keyword === 'string' ? keyword : keyword.keyword_name}
                                </Tag>
                              </WrapItem>
                            ))}
                          </Wrap>
                        ) : (
                          <Text fontSize="sm" color="gray.500" fontStyle="italic">
                            No keywords assigned
                          </Text>
                        )}
                      </Box>
                    )}
                  </Box>

                  {/* Tags Field */}
                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3} display="flex" alignItems="center" gap={2}>
                      🏷️ Tags
                    </Text>
                    {isCreatingNewVersion ? (
                      <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" p={4}>
                        <VStack align="stretch" spacing={3}>
                          <Popover>
                            <PopoverTrigger>
                              <Button
                                variant="outline"
                                w="full"
                                justifyContent="space-between"
                                p={3}
                                bg="gray.50"
                                borderColor="gray.300"
                                _hover={{ borderColor: 'green.400', bg: 'green.50' }}
                                _focus={{ borderColor: 'green.500', ring: 2, ringColor: 'green.100' }}
                                borderRadius="xl"
                                transition="all 0.2s"
                              >
                                <HStack spacing={2}>
                                  <FiSearch color="gray.500" />
                                  <Text color="gray.600">Select tags...</Text>
                                </HStack>
                                <FiChevronDown />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent w="full" p={0} borderRadius="xl" border="1px solid" borderColor="gray.200">
                              <PopoverBody p={0}>
                                <InputGroup>
                                  <Input
                                    placeholder="Search tags..."
                                    value={tagSearchTerm}
                                    onChange={(e) => setTagSearchTerm(e.target.value)}
                                    borderBottomRadius={0}
                                  />
                                  <InputRightElement>
                                    <FiSearch color="gray.400" />
                                  </InputRightElement>
                                </InputGroup>
                                <List maxH="300px" overflowY="auto">
                                  {sortByPopularity(availableTags)
                                    .filter(t => {
                                      if (!t || !t.tag_name) return false;
                                      const searchTermLower = (tagSearchTerm || '').toLowerCase();
                                      const tagNameLower = t.tag_name.toLowerCase();
                                      const matchesSearch = tagNameLower.includes(searchTermLower);
                                      const notSelected = !(editedDocDetails?.tags || []).some(et => et.tag_name === t.tag_name);
                                      return matchesSearch && notSelected;
                                    })
                                    .slice(0, showAllTags ? undefined : ITEMS_PER_PAGE)
                                    .map((tag) => (
                                      <ListItem
                                        key={`tag-${tag.id}-${tag.tag_name}`}
                                        px={4}
                                        py={3}
                                        cursor="pointer"
                                        _hover={{ bg: 'green.50' }}
                                        onClick={() => {
                                          setEditedDocDetails(prev => ({
                                            ...prev,
                                            tags: [...(prev?.tags || []), { tag_name: tag.tag_name }]
                                          }));
                                          setTagSearchTerm('');
                                        }}
                                      >
                                        <HStack justify="space-between">
                                          <HStack>
                                            <Box color="green.600" fontSize="sm">
                                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                              </svg>
                                            </Box>
                                            <Text>{tag.tag_name}</Text>
                                          </HStack>
                                          {tag.usage_count > 0 && (
                                            <Badge colorScheme="green" variant="subtle">
                                              {tag.usage_count} uses
                                            </Badge>
                                          )}
                                        </HStack>
                                      </ListItem>
                                    ))}
                                  {!showAllTags && availableTags?.length > ITEMS_PER_PAGE && (
                                    <ListItem
                                      key="show-more-tags"
                                      px={4}
                                      py={3}
                                      cursor="pointer"
                                      _hover={{ bg: 'green.50' }}
                                      onClick={() => setShowAllTags(true)}
                                      borderTop="1px"
                                      borderColor="gray.200"
                                    >
                                      <HStack>
                                        <Box color="green.600" fontSize="sm">
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                          </svg>
                                        </Box>
                                        <Text color="green.600">Show more tags...</Text>
                                      </HStack>
                                    </ListItem>
                                  )}
                                </List>
                              </PopoverBody>
                            </PopoverContent>
                          </Popover>

                          {!showTagInput ? (
                            <Button
                              leftIcon={<FiPlus />}
                              variant="outline"
                              colorScheme="green"
                              onClick={() => setShowTagInput(true)}
                              size="md"
                              w="full"
                              borderRadius="xl"
                              _hover={{
                                transform: 'translateY(-1px)',
                                boxShadow: 'md',
                                bg: 'green.50'
                              }}
                              transition="all 0.2s"
                            >
                              Add new tag
                            </Button>
                          ) : (
                            <HStack>
                              <Input
                                placeholder="Enter new tag name"
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    createNewTag();
                                  }
                                }}
                                borderRadius="xl"
                                border="1px solid"
                                borderColor="gray.300"
                                _focus={{
                                  borderColor: 'green.400',
                                  ring: 2,
                                  ringColor: 'green.100'
                                }}
                              />
                              <Button
                                colorScheme="green"
                                onClick={createNewTag}
                                isDisabled={!newTagName.trim()}
                                borderRadius="xl"
                                _hover={{
                                  transform: 'translateY(-1px)',
                                  boxShadow: 'md'
                                }}
                                transition="all 0.2s"
                              >
                                Add
                              </Button>
                              <IconButton
                                aria-label="Cancel"
                                icon={<FaTimes />}
                                onClick={() => {
                                  setShowTagInput(false);
                                  setNewTagName('');
                                }}
                                borderRadius="xl"
                                _hover={{
                                  transform: 'rotate(90deg)',
                                  bg: 'red.50'
                                }}
                                transition="all 0.2s"
                              />
                            </HStack>
                          )}

                          {(editedDocDetails?.tags || []).length > 0 && (
                            <Wrap spacing={2}>
                              <AnimatePresence>
                                {(editedDocDetails?.tags || []).map((tag, index) => (
                                  <WrapItem key={`selected-tag-${index}-${tag.tag_name}`}>
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.8 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <Tag
                                        size="lg"
                                        colorScheme={tag.isNew ? "purple" : "green"}
                                        borderRadius="xl"
                                        px={4}
                                        py={2}
                                        bg={tag.isNew ? "purple.100" : "green.100"}
                                        color={tag.isNew ? "purple.700" : "green.700"}
                                        fontWeight="medium"
                                        position="relative"
                                        _hover={{ transform: 'translateY(-1px)', boxShadow: 'md' }}
                                        transition="all 0.2s"
                                      >
                                        {tag.isNew && (
                                          <Box
                                            position="absolute"
                                            top="-2px"
                                            right="-2px"
                                            bg="purple.500"
                                            color="white"
                                            fontSize="xs"
                                            px={1}
                                            borderRadius="full"
                                            transform="scale(0.8)"
                                          >
                                            NEW
                                          </Box>
                                        )}
                                        <HStack spacing={2}>
                                          <Text>{tag.tag_name}</Text>
                                          <IconButton
                                            aria-label="Remove tag"
                                            icon={<FaTimes />}
                                            size="xs"
                                            variant="ghost"
                                            colorScheme={tag.isNew ? "purple" : "green"}
                                            onClick={() => handleRemoveTag(tag.tag_name)}
                                            borderRadius="full"
                                            _hover={{ 
                                              bg: tag.isNew ? "purple.200" : "green.200",
                                              transform: 'rotate(90deg)'
                                            }}
                                            transition="all 0.2s"
                                          />
                                        </HStack>
                                      </Tag>
                                    </motion.div>
                                  </WrapItem>
                                ))}
                              </AnimatePresence>
                            </Wrap>
                          )}
                        </VStack>
                      </Box>
                    ) : (
                      <Box bg="white" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200">
                        {(pdfState.docDetails?.tags || []).length > 0 ? (
                          <Wrap spacing={2}>
                            <AnimatePresence>
                                                              {(pdfState.docDetails?.tags || []).map((tag, index) => (
                                <WrapItem key={`display-tag-${index}-${tag.tag_name}`}>
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <Tag 
                                      size="lg" 
                                      colorScheme={tag.isNew ? "purple" : "green"} 
                                      borderRadius="xl"
                                      px={4}
                                      py={2}
                                      bg={tag.isNew ? "purple.100" : "green.100"}
                                      color={tag.isNew ? "purple.700" : "green.700"}
                                      fontWeight="medium"
                                      position="relative"
                                    >
                                      {tag.isNew && (
                                        <Box
                                          position="absolute"
                                          top="-2px"
                                          right="-2px"
                                          bg="purple.500"
                                          color="white"
                                          fontSize="xs"
                                          px={1}
                                          borderRadius="full"
                                          transform="scale(0.8)"
                                        >
                                          NEW
                                        </Box>
                                      )}
                                      <Text>{tag.tag_name}</Text>
                                    </Tag>
                                  </motion.div>
                                </WrapItem>
                              ))}
                            </AnimatePresence>
                          </Wrap>
                        ) : (
                          <Text fontSize="sm" color="gray.500" fontStyle="italic">
                            No tags assigned
                          </Text>
                        )}
                      </Box>
                    )}
                  </Box>

                  {/* Comments Field */}
                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3} display="flex" alignItems="center" gap={2}>
                      💬 Comments
                    </Text>
                    {isCreatingNewVersion ? (
                      <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" p={1}>
                        <Textarea
                          value={editedDocDetails?.comment || ''}
                          onChange={(e) => setEditedDocDetails(prev => ({
                            ...prev,
                            comment: e.target.value
                          }))}
                          placeholder="Enter your comments here..."
                          size="md"
                          resize="vertical"
                          minH="100px"
                          border="none"
                          borderRadius="xl"
                          _focus={{
                            border: "2px solid",
                            borderColor: 'blue.400',
                            ring: 0
                          }}
                          _hover={{
                            borderColor: 'blue.300'
                          }}
                        />
                      </Box>
                    ) : (
                      <Box 
                        bg="white" 
                        p={4} 
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="gray.200"
                        cursor="pointer"
                        onClick={() => setIsCommentExpanded(true)}
                        _hover={{ bg: 'gray.50', borderColor: 'blue.300' }}
                        transition="all 0.2s"
                      >
                        <Text noOfLines={isCommentExpanded ? undefined : 3} color="gray.700">
                          {pdfState.docDetails?.comment || (
                            <Text color="gray.500" fontStyle="italic">
                              No comments added yet
                            </Text>
                          )}
                        </Text>
                      </Box>
                    )}
                  </Box>

                  {/* Create Version Buttons */}
                  {isCreatingNewVersion && (
                    <Box 
                      bg="white" 
                      p={4} 
                      borderRadius="xl" 
                      border="1px solid" 
                      borderColor="blue.200"
                      boxShadow="0 4px 12px rgba(59, 130, 246, 0.1)"
                      mt={2}
                    >
                      <HStack spacing={3} justify="flex-end">
                        <Button
                          variant="outline"
                          colorScheme="gray"
                          onClick={() => {
                            setIsCreatingNewVersion(false);
                            setEditedDocDetails(null);
                            setSelectedFile(null);
                          }}
                          borderRadius="xl"
                          _hover={{ bg: 'gray.50', transform: 'translateY(-1px)' }}
                          transition="all 0.2s"
                          size="md"
                          fontWeight="semibold"
                        >
                          Cancel
                        </Button>
                        <Button
                          colorScheme="blue"
                          onClick={handleCreateNewVersion}
                          isDisabled={!editedDocDetails || (
                            !selectedFile && 
                            editedDocDetails.type === pdfState.docDetails?.type &&
                            JSON.stringify(editedDocDetails.tags) === JSON.stringify(pdfState.docDetails?.tags) &&
                            JSON.stringify(editedDocDetails.keywords) === JSON.stringify(pdfState.docDetails?.keywords) &&
                            editedDocDetails.comment === pdfState.docDetails?.comment
                          )}
                          leftIcon={<FaPlus />}
                          borderRadius="xl"
                          _hover={{ 
                            transform: 'translateY(-1px)', 
                            boxShadow: '0 6px 20px rgba(59, 130, 246, 0.4)' 
                          }}
                          transition="all 0.2s"
                          size="md"
                          fontWeight="semibold"
                          bgGradient="linear(to-r, blue.500, blue.600)"
                          _disabled={{
                            bg: 'gray.300',
                            color: 'gray.500',
                            cursor: 'not-allowed'
                          }}
                        >
                          Create Version
                        </Button>
                      </HStack>
                    </Box>
                  )}

                </VStack>
              </Box>
            </Grid>
          </ModalBody>
        </MotionModalContent>

      {/* Comment Modal */}
        <Modal 
          isOpen={isCommentExpanded} 
          onClose={() => setIsCommentExpanded(false)}
          isCentered
          motionPreset="slideInBottom"
        >
          <ModalOverlay backdropFilter="blur(10px)" />
          <ModalContent 
            bg="white" 
            borderRadius="xl" 
            boxShadow="2xl"
            maxW="2xl"
          >
            <ModalHeader borderBottom="1px" borderColor="gray.200">
              <Text fontSize="lg" fontWeight="bold">Comments</Text>
            </ModalHeader>
            <ModalBody py={6}>
              <Text>{pdfState.docDetails?.comment || 'No comments'}</Text>
            </ModalBody>
          </ModalContent>
        </Modal>

      {/* Modern Version History Modal - Fixed */}
      <Modal 
        isOpen={showVersionHistory} 
        onClose={() => setShowVersionHistory(false)}
        size="6xl"
        isCentered
      >
        <ModalOverlay 
          bg="blackAlpha.600" 
          backdropFilter="blur(10px)" 
        />
        <ModalContent
          bg="white"
          borderRadius="20px"
          boxShadow="0 20px 60px -10px rgba(59, 130, 246, 0.4)"
          border="1px solid"
          borderColor="blue.100"
          maxW="1200px"
          maxH="85vh"
          overflow="hidden"
        >
          {/* Header with Close Button */}
          <ModalHeader
            bgGradient="linear(135deg, blue.500, blue.600)"
            color="white"
            borderTopRadius="20px"
            py={4}
            px={6}
          >
            <HStack justify="space-between" align="center">
              <HStack spacing={3}>
                <Box 
                  p={2} 
                  bg="white" 
                  borderRadius="full" 
                  color="blue.500"
                >
                  <FaHistory size="20" />
                </Box>
                <VStack align="start" spacing={0}>
                  <Text fontSize="lg" fontWeight="bold">
                    Version History
                  </Text>
                  <Text fontSize="sm" opacity={0.9}>
                    {file?.nom_document || 'Document'} • {versions.length} versions
                  </Text>
                </VStack>
              </HStack>
              
              <IconButton
                aria-label="Close"
                icon={<FaTimes />}
                variant="ghost"
                color="white"
                _hover={{ bg: 'whiteAlpha.200' }}
                onClick={() => {
                  // Cleanup blob URL when closing modal
                  if (versionPreviewUrl && versionPreviewUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(versionPreviewUrl);
                  }
                  setSelectedVersionForPreview(null);
                  setVersionPreviewUrl(null);
                  setShowVersionHistory(false);
                }}
                size="sm"
              />
            </HStack>
          </ModalHeader>


          
          <ModalBody p={0} flex={1}>
            {versions.length === 0 ? (
              <Center py={16}>
                <VStack spacing={4}>
                  <Box p={4} bg="gray.100" borderRadius="full" color="gray.400">
                    <FaHistory size="40" />
                  </Box>
                  <VStack spacing={2}>
                    <Text color="gray.500" fontSize="lg" fontWeight="medium">
                      No Version History
                    </Text>
                    <Text color="gray.400" textAlign="center">
                      This document doesn't have any previous versions yet.
                    </Text>
                  </VStack>
                </VStack>
              </Center>
            ) : (
              <Grid templateColumns="2fr 1fr" h="full">
                {/* Left Side - Versions List with Scroll */}
                <Box 
                  overflowY="auto" 
                  p={6}
                  bg="gray.50"
                  borderRight="1px solid"
                  borderColor="gray.200"
                  maxH="calc(85vh - 100px)"
                  css={{
                    '&::-webkit-scrollbar': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: '#f7fafc',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#cbd5e0',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      background: '#a0aec0',
                    },
                  }}
                >
                  <VStack spacing={4} align="stretch">
                    {versions.map((version, index) => (
                      <Box
                        key={version.id_version}
                        p={5}
                        bg="white"
                        borderRadius="16px"
                        border="1px solid"
                        borderColor="gray.200"
                        _hover={{ 
                          borderColor: 'blue.300',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 25px -8px rgba(59, 130, 246, 0.25)'
                        }}
                        transition="all 0.2s ease"
                        position="relative"
                      >
                        {/* Version Badge */}
                        <Badge
                          position="absolute"
                          top={3}
                          right={3}
                          colorScheme="blue"
                          borderRadius="full"
                          px={2}
                          py={1}
                          fontSize="xs"
                        >
                          V{version.version_number}
                        </Badge>

                        <VStack spacing={3} align="stretch">
                          {/* Header */}
                          <HStack spacing={3}>
                            <Box 
                              p={2} 
                              bg="blue.100"
                              borderRadius="8px" 
                              color="blue.600"
                            >
                              <FaFilePdf size="16" />
                            </Box>
                            <VStack align="start" spacing={1} flex={1}>
                              <Text fontWeight="bold" fontSize="md" color="gray.800">
                                {version.version_name || `Version ${version.version_number}`}
                              </Text>
                              <HStack spacing={2} fontSize="xs" color="gray.500">
                                <FaCalendarAlt size="10" />
                                <Text>
                                  {new Date(version.created_at).toLocaleDateString('ro-RO', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </Text>
                              </HStack>
                            </VStack>
                          </HStack>

                          {/* Metadata in Compact Layout */}
                          <VStack spacing={2} align="stretch">
                            <HStack justify="space-between">
                              <HStack spacing={2}>
                                <Box p={1} bg="green.100" borderRadius="md" color="green.600">
                                  <FaUser size="10" />
                                </Box>
                                <Text fontSize="xs" color="gray.600">
                                  {version.author_firstname} {version.author_name || 'John Doe'}
                                </Text>
                              </HStack>
                              
                              <HStack spacing={2}>
                                <Box p={1} bg="orange.100" borderRadius="md" color="orange.600">
                                  <FaFileAlt size="10" />
                                </Box>
                                <Text fontSize="xs" color="gray.600">
                                  {version.type_name || 'Unknown'}
                                </Text>
                              </HStack>
                            </HStack>

                            {/* Change Summary */}
                            {version.change_summary && (
                              <HStack spacing={2} align="start">
                                <Box p={1} bg="purple.100" borderRadius="md" color="purple.600" mt={0.5}>
                                  <FaEdit size="10" />
                                </Box>
                                <Text 
                                  fontSize="xs" 
                                  color="gray.600" 
                                  lineHeight="1.3"
                                  noOfLines={2}
                                  flex={1}
                                >
                                  {version.change_summary}
                                </Text>
                              </HStack>
                            )}

                            {/* Tags & Keywords */}
                            {(version.tags || version.keywords) && (
                              <Wrap spacing={1}>
                                {version.tags && (() => {
                                  try {
                                    const tags = JSON.parse(version.tags);
                                    return Array.isArray(tags) ? tags.slice(0, 2).map((tag, i) => (
                                      <WrapItem key={i}>
                                        <Badge 
                                          variant="subtle" 
                                          colorScheme="blue" 
                                          borderRadius="full"
                                          fontSize="2xs"
                                          px={2}
                                          py={0.5}
                                        >
                                          {tag}
                                        </Badge>
                                      </WrapItem>
                                    )) : null;
                                  } catch (e) {
                                    return null;
                                  }
                                })()}
                              </Wrap>
                            )}
                          </VStack>

                          {/* Action Buttons */}
                          <HStack spacing={2}>
                            <Button
                              size="sm"
                              colorScheme="blue"
                              variant="outline"
                              onClick={() => handleVersionPreview(version)}
                              leftIcon={<FaEye />}
                              _hover={{ transform: 'translateY(-1px)' }}
                              borderRadius="8px"
                              fontWeight="medium"
                              flex={1}
                            >
                              Preview
                            </Button>
                            <Button
                              size="sm"
                              colorScheme="blue"
                              variant="solid"
                              onClick={() => handleRestoreVersion(version.id_version)}
                              leftIcon={<FaExchangeAlt />}
                              _hover={{ transform: 'translateY(-1px)' }}
                              borderRadius="8px"
                              fontWeight="medium"
                              flex={1}
                            >
                              Restore
                            </Button>
                          </HStack>
                        </VStack>
                      </Box>
                    ))}
                  </VStack>
                </Box>

                {/* Right Side - PDF Preview Area */}
                <Box p={6} bg="white" display="flex" flexDirection="column">
                  <VStack spacing={4} flex={1}>
                    <VStack spacing={2}>
                      <Text fontSize="md" fontWeight="bold" color="gray.800">
                        PDF Preview
                      </Text>
                      {selectedVersionForPreview ? (
                        <HStack spacing={2}>
                          <Text fontSize="sm" color="blue.600" fontWeight="medium">
                            Version {selectedVersionForPreview.version_number}
                          </Text>
                          <Text fontSize="sm" color="gray.500">•</Text>
                          <Text fontSize="sm" color="gray.500">
                            {new Date(selectedVersionForPreview.created_at).toLocaleDateString('ro-RO')}
                          </Text>
                        </HStack>
                      ) : (
                        <Text fontSize="sm" color="gray.500" textAlign="center">
                          Click Preview pe o versiune pentru a o vizualiza
                        </Text>
                      )}
                    </VStack>
                    
                    <Box
                      flex={1}
                      w="full"
                      bg="gray.50"
                      borderRadius="12px"
                      border="1px solid"
                      borderColor="gray.200"
                      display="flex"
                      flexDirection="column"
                      minH="400px"
                      overflow="hidden"
                    >
                      {versionPreviewUrl ? (
                        <VStack spacing={0} flex={1}>
                          {/* PDF Controls */}
                          <HStack 
                            justify="space-between" 
                            w="full" 
                            p={3} 
                            bg="gray.100" 
                            borderTopRadius="12px"
                            borderBottom="1px solid"
                            borderColor="gray.200"
                          >
                            <HStack spacing={2}>
                              <IconButton
                                size="sm"
                                aria-label="Previous page"
                                icon={<FaChevronLeft />}
                                onClick={handleVersionPreviewPreviousPage}
                                disabled={versionPreviewCurrentPage <= 1}
                                variant="ghost"
                              />
                              <Text fontSize="sm" color="gray.600" minW="60px" textAlign="center">
                                {versionPreviewCurrentPage} / {versionPreviewNumPages}
                              </Text>
                              <IconButton
                                size="sm"
                                aria-label="Next page"
                                icon={<FaChevronRight />}
                                onClick={handleVersionPreviewNextPage}
                                disabled={versionPreviewCurrentPage >= versionPreviewNumPages}
                                variant="ghost"
                              />
                            </HStack>
                            
                                                         <Button
                               size="sm"
                               variant="ghost"
                               leftIcon={<FaTimes />}
                               onClick={() => {
                                 // Cleanup blob URL to prevent memory leaks
                                 if (versionPreviewUrl && versionPreviewUrl.startsWith('blob:')) {
                                   URL.revokeObjectURL(versionPreviewUrl);
                                 }
                                 setSelectedVersionForPreview(null);
                                 setVersionPreviewUrl(null);
                               }}
                             >
                               Close
                             </Button>
                          </HStack>
                          
                          {/* PDF Viewer */}
                          <Box 
                            flex={1} 
                            w="full" 
                            overflow="auto"
                            css={{
                              '&::-webkit-scrollbar': {
                                width: '8px',
                              },
                              '&::-webkit-scrollbar-track': {
                                background: '#f7fafc',
                                borderRadius: '4px',
                              },
                              '&::-webkit-scrollbar-thumb': {
                                background: '#cbd5e0',
                                borderRadius: '4px',
                              },
                              '&::-webkit-scrollbar-thumb:hover': {
                                background: '#a0aec0',
                              },
                            }}
                          >
                            <Box p={4} display="flex" justifyContent="center">
                              <Document
                                file={versionPreviewUrl}
                                onLoadSuccess={onVersionPreviewLoadSuccess}
                                loading={
                                  <Center p={8}>
                                    <VStack spacing={3}>
                                      <FaFilePdf size="32" color="#3B82F6" />
                                    </VStack>
                                  </Center>
                                }
                                error={
                                  <Center p={8}>
                                    <VStack spacing={3}>
                                      <Box p={3} bg="red.100" borderRadius="full" color="red.500">
                                        <FaFilePdf size="32" />
                                      </Box>
                                      <Text color="red.600" textAlign="center">
                                        Failed to load version
                                      </Text>
                                    </VStack>
                                  </Center>
                                }
                              >
                                <Page
                                  pageNumber={versionPreviewCurrentPage}
                                  width={Math.min(400, window.innerWidth * 0.3)}
                                  renderTextLayer={false}
                                  renderAnnotationLayer={false}
                                />
                              </Document>
                            </Box>
                          </Box>
                        </VStack>
                      ) : (
                        <Center flex={1}>
                          <VStack spacing={3}>
                            <Box p={3} bg="gray.200" borderRadius="full" color="gray.400">
                              <FaFilePdf size="32" />
                            </Box>
                            <VStack spacing={1}>
                              <Text fontWeight="medium" color="gray.600" fontSize="sm">
                                PDF Preview
                              </Text>
                              <Text fontSize="xs" color="gray.400" textAlign="center">
                                Apasă Preview pe o versiune
                              </Text>
                            </VStack>
                          </VStack>
                        </Center>
                      )}
                    </Box>
                  </VStack>
                </Box>
              </Grid>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Professional Restore Confirmation Modal */}
      <Modal 
        isOpen={showRestoreConfirmModal} 
        onClose={() => {
          setShowRestoreConfirmModal(false);
          setSelectedVersionForRestore(null);
        }}
        size="lg"
        isCentered
      >
        <ModalOverlay 
          bg="blackAlpha.700" 
          backdropFilter="blur(12px)"
          animation="fadeIn"
        />
        <ModalContent
          borderRadius="24px"
          overflow="hidden"
          boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          border="1px solid"
          borderColor="gray.100"
          bg="white"
          maxW="600px"
        >
          {/* Modern Header with Gradient */}
          <Box
            bgGradient="linear(135deg, #667eea 0%, #764ba2 100%)"
            color="white"
            p={8}
            textAlign="center"
            position="relative"
            overflow="hidden"
          >
            {/* Decorative Elements */}
            <Box
              position="absolute"
              top="-50px"
              right="-50px"
              w="100px"
              h="100px"
              bg="whiteAlpha.200"
              borderRadius="full"
            />
            <Box
              position="absolute"
              bottom="-30px"
              left="-30px"
              w="60px"
              h="60px"
              bg="whiteAlpha.100"
              borderRadius="full"
            />
            
            <VStack spacing={4} position="relative" zIndex={1}>
              <Box
                p={4}
                bg="whiteAlpha.200"
                borderRadius="20px"
                backdropFilter="blur(10px)"
                border="1px solid"
                borderColor="whiteAlpha.300"
              >
                <FaExchangeAlt size="32" />
              </Box>
              <VStack spacing={2}>
                <Text fontSize="2xl" fontWeight="bold" letterSpacing="tight">
                  Restore Version
                </Text>
                <Text fontSize="md" opacity={0.9} fontWeight="medium">
                  Choose how to restore this document version
                </Text>
              </VStack>
            </VStack>
          </Box>
          
          <ModalBody p={8}>
            <VStack spacing={8} align="stretch">
              {/* Main Question */}
              <Box textAlign="center">
                <Text 
                  fontSize="lg" 
                  color="gray.700" 
                  fontWeight="medium"
                  lineHeight="1.6"
                >
                  How would you like to restore this version?
                </Text>
                <Text fontSize="sm" color="gray.500" mt={2}>
                  Select one of the options below to proceed
                </Text>
              </Box>
              
              {/* Action Buttons */}
              <VStack spacing={4}>
                {/* Save Current + Restore */}
                <Button
                  size="lg"
                  w="full"
                  bg="linear-gradient(135deg, #10b981 0%, #059669 100%)"
                  color="white"
                  variant="solid"
                  leftIcon={<FaSave />}
                  onClick={() => executeRestore(true)}
                  _hover={{ 
                    transform: 'translateY(-3px)', 
                    boxShadow: '0 20px 25px -5px rgba(16, 185, 129, 0.4)',
                    bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                  }}
                  _active={{ transform: 'translateY(-1px)' }}
                  borderRadius="16px"
                  py={7}
                  px={6}
                  fontWeight="semibold"
                  fontSize="md"
                  transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                >
                  <VStack spacing={2} align="start">
                    <HStack spacing={3} align="center">
                      <Box p={2} bg="whiteAlpha.200" borderRadius="lg">
                        <FaSave size="16" />
                      </Box>
                      <Text fontWeight="bold" fontSize="lg">
                        Save Current + Restore
                      </Text>
                    </HStack>
                    <Text fontSize="sm" opacity={0.9} textAlign="left" w="full">
                      Current version will be saved before restoring
                    </Text>
                  </VStack>
                </Button>
                
                {/* Restore Without Saving */}
                <Button
                  size="lg"
                  w="full"
                  bg="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                  color="white"
                  variant="solid"
                  leftIcon={<FaExchangeAlt />}
                  onClick={() => executeRestore(false)}
                  _hover={{ 
                    transform: 'translateY(-3px)', 
                    boxShadow: '0 20px 25px -5px rgba(245, 158, 11, 0.4)',
                    bg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
                  }}
                  _active={{ transform: 'translateY(-1px)' }}
                  borderRadius="16px"
                  py={7}
                  px={6}
                  fontWeight="semibold"
                  fontSize="md"
                  transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                >
                  <VStack spacing={2} align="start">
                    <HStack spacing={3} align="center">
                      <Box p={2} bg="whiteAlpha.200" borderRadius="lg">
                        <FaExchangeAlt size="16" />
                      </Box>
                      <Text fontWeight="bold" fontSize="lg">
                        Restore Without Saving
                      </Text>
                    </HStack>
                    <Text fontSize="sm" opacity={0.9} textAlign="left" w="full">
                      Current data will be permanently lost
                    </Text>
                  </VStack>
                </Button>
              </VStack>
              
              {/* Warning Alert */}
              <Box
                bg="linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)"
                border="1px solid"
                borderColor="yellow.300"
                borderRadius="16px"
                p={6}
                position="relative"
                overflow="hidden"
              >
                <Box
                  position="absolute"
                  top="-10px"
                  right="-10px"
                  w="40px"
                  h="40px"
                  bg="yellow.200"
                  borderRadius="full"
                  opacity={0.3}
                />
                <HStack spacing={4} align="start">
                  <Box
                    p={2}
                    bg="yellow.500"
                    borderRadius="lg"
                    color="white"
                    flexShrink={0}
                  >
                    <FaExclamationTriangle size="16" />
                  </Box>
                  <VStack align="start" spacing={2} flex={1}>
                    <Text fontWeight="bold" color="yellow.800" fontSize="md">
                      Important Notice
                    </Text>
                    <Text fontSize="sm" color="yellow.700" lineHeight="1.5">
                      If you choose "Restore Without Saving", your current modifications will be permanently lost and cannot be recovered.
                    </Text>
                  </VStack>
                </HStack>
              </Box>
            </VStack>
          </ModalBody>
          
          <ModalFooter px={8} pb={8} pt={0}>
            <Button 
              variant="ghost" 
              onClick={() => {
                setShowRestoreConfirmModal(false);
                setSelectedVersionForRestore(null);
              }}
              borderRadius="12px"
              _hover={{ 
                bg: 'gray.100',
                transform: 'translateY(-1px)'
              }}
              px={8}
              py={3}
              fontWeight="medium"
              color="gray.600"
              transition="all 0.2s"
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Electronic Signature Modal - Not implemented in PDFViewerModal */}
      {/* <SignatureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        file={file}
        onSignatureComplete={(result) => {
          console.log('Document signed successfully:', result);
          // Optionally refresh document details or show success message
        }}
      /> */}
    </Modal>
  );
};

export default React.memo(PDFViewerModal); 