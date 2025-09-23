import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FaSearch, FaTrash, FaEye, FaDownload, FaTags, FaCalendarAlt, FaFilter, FaTimes, FaUser } from 'react-icons/fa';
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
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, DownloadIcon } from '@chakra-ui/icons';
import { Modal as AntModal, Button as AntButton, Typography, Space, Spin, Badge as AntBadge } from 'antd';
import { DownloadOutlined, PrinterOutlined, CloseOutlined, LeftOutlined, RightOutlined, EyeOutlined } from '@ant-design/icons';
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

  // Add toast hook
  const toast = useChakraToast();

  // La prima randare verificăm dacă există o sesiune validă și încărcăm toate documentele
  React.useEffect(() => {
    fetch(`${backend}/admin`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Origin': window.location.origin }
    })
      .then(res => res.json())
      .then(role => {
        // După confirmarea sesiunii, încărcăm toate documentele
        setIsAuthenticated(true); // Marcăm utilizatorul ca autentificat
        loadAllDocuments();
        // Încărcăm și tag-urile disponibile
        loadAvailableTags();
      })
      .catch(err => {
        console.error("SearchPage.js: Error checking session:", err);
      });
  }, []);

  // State variables
  const [open, setOpen] = React.useState(false);
  const [openTags, setOpenTags] = React.useState(false);
  const [tableData, setTableData] = useState([]);
  const [value, setValue] = React.useState("");
  const [searchClicked, setSearchClicked] = useState(false);
  const [nofile, setnofile] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewStatistics, setViewStatistics] = useState([]);

  const docNameRef = useRef(null);
  const keyWordRef = useRef(null);
  const authorRef = useRef(null);

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

  // Add new state for caching
  const [privilegesCache, setPrivilegesCache] = useState({});

  // Move useColorModeValue hook to the top level of the component
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardHoverBg = useColorModeValue('gray.50', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.400');

  // Add showAdvancedFilters state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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
      return <p className="text-center p-4">No results found.</p>;
    }

    return (
      <div className="overflow-hidden bg-white shadow sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {results.map((doc, index) => (
            <li key={index} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{doc.realname || doc.nom_document_original || doc.nom_doc}</h3>
                  {doc.commentaire && (
                    <p className="mt-1 text-sm text-gray-600">
                      Comment: {doc.commentaire}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-gray-600">
                    Type: {doc.type}
                  </p>
                </div>
                <button
                  onClick={() => onView(doc.path.replace(".", "") + "/" + (doc.nom_doc || doc.nom_document), (doc.nom_doc || doc.nom_document))}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  <FaEye className="w-4 h-4 mr-2" /> View
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

  // Update loadAllDocuments function
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

      if (!response.ok) {
        setTableData([]);
        setSearchClicked(true);
        setnofile(true);
        return;
      }

      const results = await response.json();
      const documents = Array.isArray(results) ? results : (results.documents || []);
      
      if (documents && documents.length > 0) {
        // Fetch document details using the cached function
        const documentDetails = await fetchDocumentDetails(documents.map(doc => doc.nom_document));

        // Process documents with the cached details
        const processedDocuments = documents.map(doc => {
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

          tags = tags.map(tag => ({
            id_tag: tag.id_tag || tag.id,
            tag_name: tag.tag_name || tag.name,
            is_predefined: tag.is_predefined || false,
            added_by: tag.added_by || null,
            added_date: tag.added_date || null
          }));

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

          const processedDoc = {
            ...doc,
            tags: tags,
            commentaire: commentaire,
            keywords: keywords,
            type_name: details.type_name || doc.type_name || doc.type || 'Unknown',
            realname: details.nom_document_original || doc.nom_document_original || doc.nom_document
          };

          return processedDoc;
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
      console.error("Error loading documents:", error);
      setTableData([]);
      setSearchClicked(true);
      setnofile(true);
    }
  }, [fetchDocumentDetails]);

  // Update search function to use the same caching mechanism
  const search = useCallback(async () => {
    setIsLoading(true);
    try {
      let filteredResults = [];
      
      if (selectedTags && selectedTags.length > 0) {
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
            author: authorRef.current?.value || '',
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
        } else {
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
            author: authorRef.current?.value || '',
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

          tags = tags.map(tag => ({
            id_tag: tag.id_tag || tag.id,
            tag_name: tag.tag_name || tag.name,
            is_predefined: tag.is_predefined || false,
            added_by: tag.added_by || null,
            added_date: tag.added_date || null
          }));

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
  }, [selectedTags, selectedTypeId, keywords, startDate, endDate, fetchDocumentDetails]);

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

  const closePopup = () => {
    setIsOpen(false);
    setSelectedDocument(null);
    setPageNumber(1);
    setNumPages(null);
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const [selectedDocument, setSelectedDocument] = React.useState(null);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = React.useState(false);

  // Optimized fetchPdfUrl function
  const fetchPdfUrl = async (docPath, docName, versionId = null) => {
    try {
      // Clean up the path and name
      const cleanPath = docPath.replace(/^\/+/, '');
      const cleanName = docName.trim();
      
      // Construct the base URL
      const baseUrl = config.apiUrl;
      
      // Try different paths in sequence
      const pathsToTry = [
        // Try the direct path first
        `${baseUrl}/post_docs/documents/${cleanName}/download`,
        // Try with the full path
        `${baseUrl}/download/${cleanPath}/${cleanName}`,
        // Try with just the filename
        `${baseUrl}/download/${cleanName}`
      ];

      // Add version parameter if needed
      const versionParam = versionId ? `?version=${versionId}` : '';

      for (const path of pathsToTry) {
        try {
          console.log('Trying path:', path);
          const response = await fetch(path + versionParam, {
            credentials: 'include',
            headers: {
              'Accept': 'application/pdf',
              'Origin': config.frontendUrl
            }
          });

          if (!response.ok) {
            console.log('Path failed:', path, 'Status:', response.status);
            continue;
          }

          const blob = await response.blob();
          if (blob.type === 'application/pdf') {
            console.log('Found PDF at path:', path);
            const watermarkedBlob = await addWatermarkToPDF(blob);
            const pdfUrl = URL.createObjectURL(watermarkedBlob);
            setPdfUrl(pdfUrl);
            setPageNumber(1);
            setIsOpen(true);
            return pdfUrl;
          }
        } catch (error) {
          console.error('Error trying path:', path, error);
          continue;
        }
      }

      throw new Error('Could not find the PDF file in any of the expected locations');
    } catch (error) {
      console.error('Error in fetchPdfUrl:', error);
      setErrorMessage(`Failed to load PDF: ${error.message}`);
      setIsOpen(false);
      return null;
    }
  };

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

  const onPageChange = (newPage) => {
    setPageNumber(newPage);
  };

  React.useEffect(() => {
    fetch(`${backend}/list_user`, { credentials: "include" })
      .then(res => res.json())
      .then(valid => {
        const fetched = valid.map(setupuser);
        setUsers(fetched);
      });
  }, []);

  // Optimized document view handler
  const handleDocumentView = async (doc) => {
    try {
      // First fetch document details
      const detailsResponse = await fetch(`${backend}/post_docs/details/${doc.nom_doc}`, {
        credentials: 'include',
        headers: { 'Origin': window.location.origin }
      });
      
      if (!detailsResponse.ok) {
        throw new Error('Failed to fetch document details');
      }

      const details = await detailsResponse.json();
      if (!details.success) {
        throw new Error('Failed to get document details');
      }

      // Log the document view
      await fetch(`${backend}/document_log`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          nom_doc: doc.nom_doc
        })
      });

      // Update the document with the fetched details
      const updatedDoc = {
        ...doc,
        type_name: details.document.type_name,
        openCount: (doc.openCount || 0) + 1,
        lastOpened: new Date().toISOString()
      };

      setSelectedDocument(updatedDoc);
      setIsOpen(true);

      // Fetch and open PDF
      const pdfUrl = await fetchPdfUrl(
        doc.version_path || doc.path.replace(".", "") + "/" + doc.nom_doc,
        doc.nom_doc,
        doc.id_version
      );

      if (!pdfUrl) {
        throw new Error('Failed to load PDF');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      toast({
        title: "Error",
        description: "Failed to open document",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

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

  // Adăugăm funcția pentru a încărca tag-urile disponibile
  const loadAvailableTags = async () => {
    try {
      const response = await fetch(`${backend}/post_docs/tags`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Origin': window.location.origin }
      });

      if (!response.ok) {
        console.error("SearchPage.js: Failed to load tags:", response.status);
        setTags([]); // Ensure tags is an empty array on error
        return;
      }

      const tagsData = await response.json();

      // Ensure we're setting an array to the tags state
      if (Array.isArray(tagsData)) {
        // Check if array items have the expected properties
        if (tagsData.length > 0) {
        }
        setTags(tagsData);
      } else if (tagsData && typeof tagsData === 'object') {
        // If the API returns an object with tags inside a property
        if (tagsData.tags && Array.isArray(tagsData.tags)) {
          setTags(tagsData.tags);
        } else {
          // Try to convert the object to an array if possible
          const extractedTags = Object.values(tagsData).filter(item =>
            item && typeof item === 'object' && (item.id || item.id_tag || item.tag_id) && (item.name || item.tag_name)
          );
          setTags(extractedTags.length > 0 ? extractedTags : []);
        }
      } else {
        console.error("SearchPage.js: Received invalid tags data type:", typeof tagsData);
        setTags([]); // Set empty array as fallback
      }
    } catch (error) {
      console.error("SearchPage.js: Error loading tags:", error);
      setTags([]); // Ensure tags is an empty array on error
    }
  };

  // Update handleTagClick function
  const handleTagClick = (tagName) => {
    // Find the tag object from the available tags
    const tag = tags.find(t => t.name === tagName || t.tag_name === tagName);
    if (tag) {
      const tagId = tag.id || tag.id_tag || tag.tag_id;
      // Toggle the tag selection
      setSelectedTags(prev => {
        const newTags = prev.includes(tagId) 
          ? prev.filter(id => id !== tagId)
          : [...prev, tagId];
        
        // Reset to first page when changing tags
        setCurrentPage(1);
        
        // Trigger search automatically with the new tags
        setIsSearching(true);
        search().finally(() => {
          setIsSearching(false);
        });
        
        return newTags;
      });
    }
  };

  // Update toggleTagSelection function
  const toggleTagSelection = (tagId) => {
    setSelectedTags(prev => {
      const newSelection = prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId];
      
      // Reset to first page when changing tags
      setCurrentPage(1);
      
      // Trigger search automatically with the new selection
      setIsSearching(true);
      search().finally(() => {
        setIsSearching(false);
      });
      
      return newSelection;
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
    // Trigger search automatically
    setIsSearching(true);
    search().finally(() => {
      setIsSearching(false);
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

  // Add this useEffect to fetch keywords when component mounts
  React.useEffect(() => {
    fetchAvailableKeywords();
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

  // Add useEffect to load documents when component mounts
  React.useEffect(() => {
    loadAllDocuments();
  }, [loadAllDocuments]);

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
    if (docNameRef.current) docNameRef.current.value = "";
    if (keyWordRef.current) keyWordRef.current.value = "";
    if (authorRef.current) authorRef.current.value = "";
    setValue("");
    setSelectedTags([]);
    setSelectedKeywords([]);
    setStartDate("");
    setEndDate("");
    setFiltering("");
    setKeywords("");
    setSelectedTypeId(null); // Adăugăm resetarea tipului de document
    setCurrentPage(1); // Reset to first page
    loadAllDocuments();
  };

  // Add handleSearch function inside the component
  const handleSearch = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await search();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Update the PDFViewerModal component
  const PDFViewerModal = ({ isOpen, onClose, pdfUrl, numPages, pageNumber, onPageChange, selectedDocument }) => {
    const [pdfError, setPdfError] = useState(null);
    const [docDetails, setDocDetails] = useState(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const loggedViewRef = useRef(false);

    useEffect(() => {
      let isMounted = true;

      const fetchDocumentDetails = async () => {
        if (!selectedDocument || loggedViewRef.current) return;
        
        setIsLoadingDetails(true);
        try {
          // First fetch document details
          const detailsResponse = await fetch(`${backend}/post_docs/details/${selectedDocument.nom_doc}`, {
            credentials: 'include',
            headers: { 'Origin': window.location.origin }
          });
          
          if (detailsResponse.ok && isMounted) {
            const details = await detailsResponse.json();
            if (details.success) {
              setDocDetails(details.document);
              
              // Log document view only once
              if (!loggedViewRef.current) {
                await fetch(`${backend}/document_log`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ nom_doc: selectedDocument.nom_doc }),
                  credentials: 'include'
                });
                loggedViewRef.current = true;
              }
            }
          }
        } catch (error) {
          console.error('Error fetching document details:', error);
        } finally {
          if (isMounted) {
            setIsLoadingDetails(false);
          }
        }
      };

      if (isOpen) {
        fetchDocumentDetails();
      }

      return () => {
        isMounted = false;
      };
    }, [isOpen, selectedDocument]);

    // Reset loggedViewRef when modal closes
    useEffect(() => {
      if (!isOpen) {
        loggedViewRef.current = false;
      }
    }, [isOpen]);

    const handleDownload = async () => {
      try {
        if (!selectedDocument) return;

        const response = await fetch(`${backend}/post_docs/download/${selectedDocument.nom_doc}`, {
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
        a.download = selectedDocument.originalName || selectedDocument.nom_doc;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Download error:', error);
        toast({
          title: "Error",
          description: "Failed to download file",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    };

    return (
      <AntModal
        visible={isOpen}
        onCancel={onClose}
        footer={null}
        width={1000}
        centered
        className="pdf-viewer-modal"
        closable={false}
        maskClosable={true}
        style={{ maxHeight: '90vh' }}
        styles={{
          body: { padding: '24px' }
        }}
      >
        {selectedDocument && (
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <Title level={4} className="!mb-0">
                {selectedDocument.realname || selectedDocument.nom_document_original || selectedDocument.nom_doc}
              </Title>
              <div className="flex items-center space-x-4">
                <AntButton icon={<DownloadOutlined />} onClick={handleDownload}>Download</AntButton>
                <AntButton icon={<PrinterOutlined />} onClick={() => window.print()}>Print</AntButton>
                <AntButton icon={<CloseOutlined />} onClick={onClose} />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-6">
              <div className="col-span-1">
                {isLoadingDetails ? (
                  <Spin />
                ) : docDetails ? (
                  <div className="space-y-4">
                    <div>
                      <Text strong>Type:</Text>
                      <AntBadge color="blue" text={docDetails.type_name || docDetails.type || 'Unknown'} className="ml-2" />
                    </div>

                    {docDetails.tags && docDetails.tags.length > 0 && (
                      <div>
                        <Text strong className="block mb-2">Tags:</Text>
                        <div className="flex flex-wrap gap-2">
                          {docDetails.tags.map((tag, index) => (
                            <Tag key={index} color="blue">{tag.tag_name || tag.name}</Tag>
                          ))}
                        </div>
                      </div>
                    )}

                    {docDetails.comment && (
                      <div>
                        <Text strong className="block mb-2">Comment:</Text>
                        <Text>{docDetails.comment}</Text>
                      </div>
                    )}

                    {docDetails.keywords && docDetails.keywords.length > 0 && (
                      <div>
                        <Text strong className="block mb-2">Keywords:</Text>
                        <div className="flex flex-wrap gap-2">
                          {docDetails.keywords.map((keyword, index) => (
                            <Tag key={index} color="green">{keyword}</Tag>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <Text strong className="block mb-2">Statistics:</Text>
                      <div className="space-y-2">
                        <div>
                          <EyeOutlined className="mr-2" />
                          <Text>{viewStatistics.open_count} views</Text>
                        </div>
                        <div>
                          <Text>Last opened: {viewStatistics.last_opened ? new Date(viewStatistics.last_opened).toLocaleDateString() : 'Never'}</Text>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Text type="secondary">No additional details available</Text>
                )}
              </div>

              <div className="col-span-3 bg-gray-50 rounded-lg p-4">
            <div className="flex flex-col items-center">
              <Document
                file={pdfUrl}
                onLoadSuccess={({ numPages }) => onPageChange(1, numPages)}
                loading={
                  <div className="flex flex-col items-center justify-center h-64">
                    <Spin size="large" />
                    <Text className="mt-4">Loading PDF...</Text>
                  </div>
                }
                error={
                  <div className="text-center text-red-500">
                    <Text type="danger">Failed to load PDF</Text>
                    <AntButton 
                      type="primary" 
                      onClick={() => setPdfError(null)}
                      className="mt-4"
                    >
                      Try Again
                    </AntButton>
                  </div>
                }
              >
                <Page 
                  pageNumber={pageNumber} 
                  width={600}
                  loading={
                    <div className="flex flex-col items-center justify-center h-64">
                      <Spin size="large" />
                      <Text className="mt-4">Loading page...</Text>
                    </div>
                  }
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>

              {numPages > 0 && (
                <div className="flex items-center justify-center mt-4 space-x-4">
                  <AntButton 
                    icon={<LeftOutlined />} 
                    onClick={() => onPageChange(pageNumber - 1, numPages)}
                    disabled={pageNumber <= 1}
                  >
                    Previous
                  </AntButton>
                  <Text>
                    Page {pageNumber} of {numPages}
                  </Text>
                  <AntButton 
                    icon={<RightOutlined />} 
                    onClick={() => onPageChange(pageNumber + 1, numPages)}
                    disabled={pageNumber >= numPages}
                  >
                    Next
                  </AntButton>
                </div>
              )}
            </div>
                  </div>
            </div>
          </div>
        )}
      </AntModal>
    );
  };

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
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header Section */}
        <MotionBox
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          bgGradient="linear(to-r, blue.500, purple.500)"
          p={6}
          borderRadius="xl"
          boxShadow="lg"
        >
          <Heading
            as="h1"
            size="2xl"
            color="white"
            fontWeight="extrabold"
            textAlign="center"
          >
            Document Search
          </Heading>
          <Text fontSize="xl" color="whiteAlpha.900" mt={2} textAlign="center">
            Find your documents using advanced search filters
          </Text>
        </MotionBox>

        {/* Search Form Card */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          position="relative"
          zIndex={2}
        >
          <Card
            bg={cardBg}
            borderRadius="xl"
            boxShadow="lg"
            _hover={{ transform: 'translateY(-2px)', boxShadow: 'xl' }}
            transition="all 0.3s"
          >
            <CardBody p={4}>
              <form onSubmit={handleSearch}>
                <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={4}>
                  {/* Quick Search Input */}
                  <FormControl gridColumn={{ base: '1', md: '1 / span 2' }}>
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <FaSearch color="gray.300" />
                      </InputLeftElement>
                    <Input
                      ref={docNameRef}
                      type="text"
                        placeholder="Search documents..."
                      focusBorderColor="blue.500"
                      _hover={{ borderColor: 'blue.400' }}
                      transition="all 0.2s"
                        borderRadius="md"
                    />
                    </InputGroup>
                  </FormControl>

                  {/* Document Type Select */}
                  <FormControl>
                    <Select
                      value={selectedTypeId || ''}
                      onChange={(e) => setSelectedTypeId(e.target.value)}
                      placeholder="Document Type"
                      focusBorderColor="blue.500"
                      _hover={{ borderColor: 'blue.400' }}
                      transition="all 0.2s"
                      borderRadius="md"
                      color="gray.700"
                      bg="white"
                      _placeholder={{ color: 'gray.500' }}
                    >
                      <option value="">All Types</option>
                      {documentTypes.map(type => (
                        <option 
                          key={type.id_type} 
                          value={type.id_type}
                          style={{ color: 'gray.700' }}
                        >
                          {type.nom_type || type.type_name || 'Unknown Type'}
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Tags Selector */}
                  <FormControl position="relative" zIndex={9999}>
                    <Popover 
                      isOpen={openTags} 
                      onClose={() => setOpenTags(false)}
                      placement="bottom-start"
                      closeOnBlur={true}
                      strategy="fixed"
                      modifiers={[
                        {
                          name: 'preventOverflow',
                          options: {
                            boundary: 'viewport',
                            padding: 8,
                          },
                        },
                        {
                          name: 'flip',
                          options: {
                            fallbackPlacements: ['bottom-start', 'top-start'],
                          },
                        },
                      ]}
                    >
                      <PopoverTrigger>
                  <Button
                          rightIcon={<FaTags />}
                          w="full"
                          justifyContent="space-between"
                    variant="outline"
                          onClick={() => setOpenTags(!openTags)}
                          _hover={{ bg: 'blue.50', borderColor: 'blue.400' }}
                          transition="all 0.2s"
                          borderRadius="md"
                  >
                    {selectedTags.length > 0
                            ? `${selectedTags.length} tags`
                            : 'Select tags'}
                  </Button>
                </PopoverTrigger>
                      <PopoverContent 
                        maxH="300px" 
                        overflowY="auto"
                        zIndex={9999}
                        boxShadow="xl"
                        border="none"
                        _focus={{ outline: 'none' }}
                        position="relative"
                        onMouseLeave={() => setOpenTags(false)}
                      >
                        <PopoverArrow />
                        <PopoverCloseButton />
                        <PopoverBody p={2}>
                          <VStack align="stretch" spacing={2}>
                            {tags.map(tag => (
                              <Button
                                key={tag.id_tag}
                                variant="ghost"
                                justifyContent="flex-start"
                                leftIcon={
                                  selectedTags.includes(tag.id_tag) ? (
                                    <Box as="span" color="blue.500">✓</Box>
                                  ) : null
                                }
                                onClick={() => toggleTagSelection(tag.id_tag)}
                                _hover={{ bg: 'blue.50' }}
                                transition="all 0.2s"
                                size="sm"
                                borderRadius="md"
                              >
                                {tag.tag_name}
                              </Button>
                            ))}
                          </VStack>
                        </PopoverBody>
                </PopoverContent>
              </Popover>
                  </FormControl>
                </Grid>

                {/* Advanced Filters */}
                <Collapse in={showAdvancedFilters}>
                  <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4} mt={4}>
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
                    <FormControl>
                      <Input
                        ref={authorRef}
                        type="text"
                        placeholder="Author"
                        focusBorderColor="blue.500"
                        _hover={{ borderColor: 'blue.400' }}
                        transition="all 0.2s"
                        borderRadius="md"
                      />
                    </FormControl>
                    <FormControl>
                      <HStack>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          focusBorderColor="blue.500"
                          _hover={{ borderColor: 'blue.400' }}
                          transition="all 0.2s"
                          borderRadius="md"
                        />
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          focusBorderColor="blue.500"
                          _hover={{ borderColor: 'blue.400' }}
                          transition="all 0.2s"
                          borderRadius="md"
                        />
                      </HStack>
                  </FormControl>
                </Grid>
                </Collapse>

                {/* Action Buttons */}
                <Flex justify="space-between" align="center" mt={4}>
                  <Button
                    variant="link"
                    colorScheme="blue"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    leftIcon={showAdvancedFilters ? <FaFilter /> : <FaFilter />}
                  >
                    {showAdvancedFilters ? 'Hide Advanced' : 'Show Advanced'}
                  </Button>
                  <HStack>
                  <Button
                    onClick={handleClear}
                    leftIcon={<FaTrash />}
                    variant="outline"
                    _hover={{ bg: 'gray.100' }}
                    transition="all 0.2s"
                      borderRadius="md"
                  >
                    Clear
                  </Button>
                  <Button
                    type="submit"
                    colorScheme="blue"
                    leftIcon={<FaSearch />}
                    isLoading={isLoading}
                    loadingText="Searching..."
                      _hover={{ transform: 'translateY(-1px)', boxShadow: 'md' }}
                    transition="all 0.2s"
                      borderRadius="md"
                  >
                    Search
                  </Button>
                  </HStack>
                </Flex>
              </form>
            </CardBody>
          </Card>
        </MotionBox>

        {/* Results Section */}
        {searchClicked && !loading && !nofile && (
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {currentItems.map((doc, index) => (
          <MotionBox
                  key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card
              bg={cardBg}
              borderRadius="xl"
              boxShadow="lg"
                    _hover={{ transform: 'translateY(-2px)', boxShadow: 'xl' }}
                    transition="all 0.3s"
                    h="full"
                    display="flex"
                    flexDirection="column"
                    position="relative"
                    overflow="hidden"
                  >
                    {/* Document Type Badge */}
                    <Badge 
                      position="absolute" 
                      top={2} 
                      right={2} 
                      colorScheme="blue" 
                      px={2} 
                      py={0.5} 
                      borderRadius="md"
                      fontSize="xs"
                      zIndex={1}
                    >
                      {doc.type_name || doc.type || 'Unknown'}
                    </Badge>

                    <CardBody p={4}>
                      <VStack align="stretch" spacing={3}>
                        {/* Document Title with Tooltip */}
                        <Tooltip label={doc.nom_document} placement="top">
                          <Heading 
                            size="sm" 
                            noOfLines={1}
                            className="text-gray-800 hover:text-blue-600 transition-colors duration-200"
                          >
                            {doc.nom_document}
                </Heading>
                        </Tooltip>

                        {/* Author Information */}
                        <HStack spacing={2} align="center">
                          <FaUser className="text-gray-400 text-sm" />
                          <Text fontSize="xs" color="gray.500" noOfLines={1}>
                            {doc.prenom} {doc.nom}
                          </Text>
                        </HStack>

                        {/* Upload Date */}
                        <HStack spacing={2} align="center">
                          <FaCalendarAlt className="text-gray-400 text-sm" />
                          <Text fontSize="xs" color="gray.500">
                            {new Date(doc.date_upload).toLocaleDateString()}
                          </Text>
                        </HStack>

                        {/* Keywords */}
                        {doc.mot1 && (
                          <HStack spacing={2} align="center">
                            <FaTags className="text-gray-400 text-sm" />
                            <Flex wrap="wrap" gap={1}>
                              {[doc.mot1, doc.mot2, doc.mot3, doc.mot4, doc.mot5]
                                .filter(Boolean)
                                .map((keyword, index) => (
                                  <Badge 
                                    key={index}
                                    cursor="pointer"
                                    onClick={() => handleKeywordClick(keyword)}
                                    _hover={{ 
                                      transform: 'scale(1.05)', 
                                      boxShadow: 'md',
                                      bg: 'blue.500',
                                      color: 'white'
                                    }}
                                    transition="all 0.2s"
                                    px={2}
                                    py={0.5}
                                    borderRadius="full"
                                    fontSize="2xs"
                                    opacity={0.9}
                                    display="flex"
                                    alignItems="center"
                                    gap={1}
                                    border="1px solid"
                                    borderColor="blue.200"
                                    bg="blue.50"
                                    color="blue.700"
                                  >
                                    <Box as="span" fontSize="2xs">🔍</Box>
                                    {keyword}
                                  </Badge>
                                ))}
                            </Flex>
                          </HStack>
                        )}

                        {/* Comment Section */}
                        {doc.commentaire && (
                          <Box 
                            bg="gray.50"
                            borderRadius="md"
                            p={2}
                            cursor="pointer"
                            onClick={() => {
                              setExpandedComment(doc.commentaire);
                              setShowCommentModal(true);
                            }}
                            _hover={{ bg: 'gray.100' }}
                            transition="all 0.2s"
                          >
                            <Text 
                              fontSize="xs" 
                              color="gray.600" 
                              noOfLines={2}
                              lineHeight="tall"
                            >
                              {doc.commentaire}
                            </Text>
                            <Text 
                              fontSize="2xs" 
                              color="blue.500" 
                              mt={1}
                              textAlign="right"
                            >
                              Read more
                            </Text>
                          </Box>
                        )}

                        {/* Tags Section */}
                        {doc.tags && doc.tags.length > 0 && (
                          <Flex wrap="wrap" gap={1}>
                            {doc.tags.map((tag, tagIndex) => (
                              <Badge 
                                key={tagIndex} 
                                colorScheme="purple"
                                cursor="pointer"
                                onClick={() => {
                                  const tagId = tag.id_tag || tag.id;
                                  if (tagId) {
                                    toggleTagSelection(tagId);
                                  }
                                }}
                                _hover={{ 
                                  transform: 'scale(1.05)', 
                                  boxShadow: 'md',
                                  bg: 'purple.500',
                                  color: 'white'
                                }}
                                transition="all 0.2s"
                                px={2}
                                py={0.5}
                                borderRadius="full"
                                fontSize="2xs"
                                opacity={0.9}
                                display="flex"
                                alignItems="center"
                                gap={1}
                                border="1px solid"
                                borderColor="purple.200"
                                bg="purple.50"
                                color="purple.700"
                              >
                                <Box as="span" fontSize="2xs">#</Box>
                                {tag.tag_name || tag.name}
                              </Badge>
                            ))}
                          </Flex>
                        )}

                        <Divider borderColor="gray.200" />

                        {/* Action Buttons */}
                        <HStack justify="space-between" mt={2}>
                          <HStack spacing={2}>
                            <IconButton
                              icon={<FaEye />}
                              aria-label="View document"
                              onClick={() => handleDocumentView(doc)}
                              variant="ghost"
                              colorScheme="blue"
                              size="sm"
                            />
                            <Text fontSize="xs" color="gray.500">
                              {doc.openCount || 0} views
                            </Text>
                          </HStack>
                          <IconButton
                            icon={<FaDownload />}
                            aria-label="Download document"
                            onClick={() => downloaddoc(doc.nom_doc)}
                            variant="ghost"
                            colorScheme="green"
                            size="sm"
                          />
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                </MotionBox>
                      ))}
            </SimpleGrid>

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

            {/* Enhanced Pagination */}
            <Flex 
              justify="center" 
              align="center" 
              mt={8} 
              gap={4}
              direction={{ base: 'column', md: 'row' }}
            >
                  <HStack spacing={2}>
                    <Button
                  onClick={() => handlePageChange(1)}
                  isDisabled={currentPage === 1}
                      size="sm"
                      variant="outline"
                      _hover={{ bg: 'gray.100' }}
                      transition="all 0.2s"
                  borderRadius="md"
                >
                  First
                </Button>
                <Button
                  onClick={() => handlePageChange(currentPage - 1)}
                  isDisabled={currentPage === 1}
                  size="sm"
                  variant="outline"
                  _hover={{ bg: 'gray.100' }}
                  transition="all 0.2s"
                  borderRadius="md"
                >
                  Previous
                    </Button>
              </HStack>

              <HStack spacing={2}>
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
                          <Text>...</Text>
                    <Button
                            onClick={() => handlePageChange(page)}
                            size="sm"
                            variant={currentPage === page ? "solid" : "outline"}
                            colorScheme={currentPage === page ? "blue" : "gray"}
                            _hover={{ bg: 'gray.100' }}
                            transition="all 0.2s"
                            borderRadius="md"
                          >
                            {page}
                          </Button>
                        </React.Fragment>
                      );
                    }
                    return (
                      <Button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        size="sm"
                        variant={currentPage === page ? "solid" : "outline"}
                        colorScheme={currentPage === page ? "blue" : "gray"}
                        _hover={{ bg: 'gray.100' }}
                        transition="all 0.2s"
                        borderRadius="md"
                      >
                        {page}
                      </Button>
                    );
                  })}
              </HStack>

              <HStack spacing={2}>
                <Button
                  onClick={() => handlePageChange(currentPage + 1)}
                  isDisabled={currentPage === totalPages}
                      size="sm"
                      variant="outline"
                      _hover={{ bg: 'gray.100' }}
                      transition="all 0.2s"
                  borderRadius="md"
                >
                  Next
                    </Button>
                <Button
                  onClick={() => handlePageChange(totalPages)}
                  isDisabled={currentPage === totalPages}
                  size="sm"
                  variant="outline"
                  _hover={{ bg: 'gray.100' }}
                  transition="all 0.2s"
                  borderRadius="md"
                >
                  Last
                    </Button>
                  </HStack>
                </Flex>

            <Text 
              textAlign="center" 
              mt={4} 
              color="gray.500"
              fontSize="sm"
            >
              Showing {startIndex + 1} to {Math.min(endIndex, tableData.length)} of {tableData.length} results
            </Text>
          </MotionBox>
        )}

        {/* PDF Viewer Modal */}
        <PDFViewerModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          pdfUrl={pdfUrl}
          numPages={numPages}
          pageNumber={pageNumber}
          onPageChange={onPageChange}
          selectedDocument={selectedDocument}
        />
      </VStack>
    </Container>
  );
}

const DocumentTagsCell = ({ document, onTagClick }) => {
  // Get tags from the document object
  const tags = document.tags || [];

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