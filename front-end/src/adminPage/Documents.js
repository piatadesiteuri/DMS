import React, { useState, useEffect, useCallback, useRef, useMemo, useReducer } from 'react';
import { createPortal } from 'react-dom';
import { FaFolder, FaFolderOpen, FaFilePdf, FaChevronLeft, FaChevronRight, FaEye, FaDownload, FaExchangeAlt, FaCog, FaEdit, FaTrash, FaPrint, FaExclamationTriangle, FaTimes, FaCalendarAlt, FaFileAlt, FaHistory, FaPlus, FaStar, FaUser, FaLock, FaSearch, FaInfoCircle, FaExclamation, FaBox, FaChevronUp, FaChevronDown, FaSync, FaSort, FaCheck, FaSave, FaRedo, FaPenFancy, FaSignature, FaUndo, FaGlobe, FaRocket } from 'react-icons/fa';
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
import FolderSidebar from '../components/FolderSidebar';
import PDFViewerModal from '../User/PDFViewerModal.jsx';
// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Define motion components
const MotionBox = motion(Box);
const MotionModalContent = motion(ModalContent);
const MotionModalOverlay = motion(ModalOverlay);
const MotionTableRow = motion(Tr);
const MotionFolderCard = motion(Box);

  // Electronic Signature Modal Component
  const SignatureModal = ({ isOpen, onClose, file, onSignatureComplete }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [signatureMethod, setSignatureMethod] = useState('draw'); // 'draw', 'upload', 'text'
    const [signatureData, setSignatureData] = useState(null);
    const [textSignature, setTextSignature] = useState('');
    const [signaturePosition, setSignaturePosition] = useState({ x: 50, y: 50, page: 1 });
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [error, setError] = useState('');

    const clearCanvas = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureData(null);
      }
    };

    const handleMouseDown = (e) => {
      setIsDrawing(true);
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };

    const handleMouseMove = (e) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext('2d');
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx.stroke();
    };

    const handleMouseUp = () => {
      if (isDrawing) {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        setSignatureData(canvas.toDataURL());
      }
    };

    const handleSignDocument = async () => {
      setIsLoading(true);
      setError('');

      try {
        let signature = '';
        
        if (signatureMethod === 'draw' && signatureData) {
          signature = signatureData;
        } else if (signatureMethod === 'text' && textSignature.trim()) {
          signature = textSignature.trim();
        } else {
          setError('Please provide a signature');
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${backend}/api/documents/sign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            documentId: file.id_document,
            documentPath: file.folder_path,
            documentName: file.nom_document,
            signature: signature,
            signatureType: signatureMethod,
            position: signaturePosition,
            timestamp: new Date().toISOString()
          })
        });

        const result = await response.json();

        if (response.ok) {
          antMessage.success('Document signed successfully!');
          onSignatureComplete && onSignatureComplete(result);
          onClose();
        } else {
          setError(result.message || 'Failed to sign document');
        }
      } catch (error) {
        console.error('Error signing document:', error);
        setError('Failed to sign document. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (!isOpen) return null;

    return createPortal(
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gray-900/70 backdrop-blur-lg flex items-center justify-center p-4"
          style={{ zIndex: 1000000 }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <FaSignature className="text-blue-600 text-xl" />
                  <h3 className="text-xl font-semibold text-gray-900">Sign Document</h3>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FaTimes className="text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Sign: <span className="font-medium">{file?.nom_document}</span>
              </p>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-y-auto">
              {/* Signature Method Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Signature Method
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setSignatureMethod('draw')}
                    className={`flex-1 p-3 border-2 rounded-lg transition-all ${
                      signatureMethod === 'draw' 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <FaPenFancy className="mx-auto mb-2" />
                    <div className="text-sm font-medium">Draw</div>
                  </button>
                  <button
                    onClick={() => setSignatureMethod('text')}
                    className={`flex-1 p-3 border-2 rounded-lg transition-all ${
                      signatureMethod === 'text' 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <FaFileAlt className="mx-auto mb-2" />
                    <div className="text-sm font-medium">Type</div>
                  </button>
                </div>
              </div>

              {/* Signature Input Area */}
              {signatureMethod === 'draw' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Draw Your Signature
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={150}
                      className="w-full border border-gray-200 rounded cursor-crosshair bg-white"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    />
                    <div className="flex justify-between items-center mt-3">
                      <p className="text-xs text-gray-500">
                        Click and drag to draw your signature
                      </p>
                      <button
                        onClick={clearCanvas}
                        className="text-sm text-red-600 hover:text-red-800 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {signatureMethod === 'text' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Type Your Full Name
                  </label>
                  <input
                    type="text"
                    value={textSignature}
                    onChange={(e) => setTextSignature(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                    style={{ fontFamily: 'cursive', fontSize: '18px' }}
                  />
                </div>
              )}

              {/* Signature Position */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Signature Position
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Page</label>
                    <input
                      type="number"
                      min="1"
                      value={signaturePosition.page}
                      onChange={(e) => setSignaturePosition(prev => ({ ...prev, page: parseInt(e.target.value) || 1 }))}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">X Position (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={signaturePosition.x}
                      onChange={(e) => setSignaturePosition(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Y Position (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={signaturePosition.y}
                      onChange={(e) => setSignaturePosition(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100">
              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignDocument}
                  disabled={isLoading || (!signatureData && !textSignature.trim())}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Signing...
                    </>
                  ) : (
                    <>
                      <FaSignature />
                      Sign Document
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>,
      document.body
    );
  };

  const FolderMoveModal = ({ isOpen, onClose, onMove, currentFolder, folders, currentPath, setCurrentFolder }) => {
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [folderHistory, setFolderHistory] = useState([]);
    const [error, setError] = useState(null);

  const handleFolderClick = (folder) => {
    // console.log('Folder clicked:', folder);
    setFolderHistory([...folderHistory, selectedFolder]);
    setSelectedFolder(folder);
    setError(null);
  };

  const handleBack = () => {
    if (folderHistory.length > 0) {
      console.log('Navigating back to:', folderHistory[folderHistory.length - 1]);
      const previousFolder = folderHistory[folderHistory.length - 1];
      setSelectedFolder(previousFolder);
      setFolderHistory(folderHistory.slice(0, -1));
      setError(null);
    }
  };

  const handleMove = () => {
    console.log('Move button clicked');
    console.log('Current folder:', currentFolder);
    console.log('Selected folder:', selectedFolder);
    console.log('Current path:', currentPath);

    if (selectedFolder) {
      // Check if trying to move folder to its current location
      if (currentPath === selectedFolder.folder_path) {
        console.log('Error: Cannot move to current location');
        setError('Cannot move folder to its current location');
        return;
      }

      // Check if trying to move a folder into itself or its subfolder
      if (selectedFolder.folder_path.startsWith(currentFolder.folder_path + '/')) {
        console.log('Error: Cannot move into self or subfolder');
        setError('Cannot move a folder into itself or its subfolder');
        return;
      }

      console.log('Moving folder from:', currentFolder.folder_path, 'to:', selectedFolder.folder_path);
      onMove(currentFolder.folder_path, selectedFolder.folder_path);
      onClose();
    } else {
      // If no folder is selected, move to the root level
      console.log('Moving folder to root level');
      onMove(currentFolder.folder_path, '');
      onClose();
    }
  };

  const getCurrentItems = () => {
    const items = !selectedFolder
      ? folders.filter(folder => {
          const pathParts = folder.folder_path.split('/');
          return pathParts.length === 2; // Only folders directly under institution
        })
      : folders.filter(folder => {
          const folderPath = folder.folder_path;
          const parentPath = selectedFolder.folder_path;
          return folderPath.startsWith(parentPath + '/') && 
                 folderPath.split('/').length === parentPath.split('/').length + 1;
        });
    
    console.log('Current items:', items);
    return items;
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-overlay fixed inset-0 bg-gray-900/70 backdrop-blur-lg flex items-center justify-center p-4"
        style={{ 
          zIndex: 999999,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh'
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col mx-6 my-8"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">Move Folder</h3>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FaTimes className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBack}
                disabled={folderHistory.length === 0}
                className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 rounded-full hover:bg-white transition-colors"
              >
                <FaChevronLeft />
              </motion.button>
              <span className="text-gray-600 font-medium">
                {selectedFolder ? selectedFolder.folder_path : 'Root'}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-6 mt-4 p-3 bg-red-50 text-red-600 rounded-lg border border-red-100"
            >
              {error}
            </motion.div>
          )}

          {/* Folder List */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {getCurrentItems.map((folder) => (
                <motion.div
                  key={folder.folder_path}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleFolderClick(folder)}
                  className="flex flex-col items-center p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 mb-3 flex items-center justify-center bg-yellow-50 rounded-full">
                    <FaFolder className="text-2xl text-yellow-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 text-center">
                    {folder.folder_name}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-50 border-t border-gray-100">
            <div className="flex justify-end gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleMove}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Move Here
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

const MoveModal = ({ isOpen, onClose, onMove, currentItem, folders, currentPath, setCurrentFolder }) => {
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderHistory, setFolderHistory] = useState([]);
  const [error, setError] = useState(null);

  const handleFolderClick = (folder) => {
    // console.log('Folder clicked:', folder);
    setFolderHistory([...folderHistory, selectedFolder]);
    setSelectedFolder(folder);
    setError(null);
  };

  const handleBack = () => {
    if (folderHistory.length > 0) {
      console.log('Navigating back to:', folderHistory[folderHistory.length - 1]);
      const previousFolder = folderHistory[folderHistory.length - 1];
      setSelectedFolder(previousFolder);
      setFolderHistory(folderHistory.slice(0, -1));
      setError(null);
    }
  };

  const handleMove = () => {
    if (selectedFolder) {
      // Get the current folder path from the document's path
      const currentFolderPath = currentItem.path; // Folosim path-ul complet al documentului
      
      console.log('Move details:', {
        currentFolderPath,
        selectedFolderPath: selectedFolder.folder_path,
        currentItemPath: currentItem.path
      });

      // Verificăm dacă încercăm să mutăm în același folder
      if (currentFolderPath === selectedFolder.folder_path) {
        setError('Cannot move file to its current location');
        return;
      }

      // Construct the full source path including the document name
      const fullSourcePath = `${currentItem.path}/${currentItem.nom_document}`;
      
      console.log('Moving document from:', fullSourcePath, 'to:', selectedFolder.folder_path);
      onMove(fullSourcePath, selectedFolder.folder_path);
      
      // Show success toast
      antMessage.success({
        content: `Document moved to ${selectedFolder.folder_name} successfully!`,
        duration: 3,
        style: { marginTop: '10vh' }
      });
      
      onClose();
    } else {
      // If no folder is selected, move to the root level
      console.log('Moving document to root level');
      const fullSourcePath = `${currentItem.path}/${currentItem.nom_document}`;
      onMove(fullSourcePath, '');
      
      // Show success toast
      antMessage.success({
        content: `Document moved to Root Directory successfully!`,
        duration: 3,
        style: { marginTop: '10vh' }
      });
      
      onClose();
    }
  };

  const getCurrentItems = () => {
    if (!selectedFolder) {
      // Show only top-level folders
      return folders.filter(folder => {
        const pathParts = folder.folder_path.split('/');
        return pathParts.length === 2; // Only folders directly under institution
      });
    }

    // Get only immediate subfolders of the current folder
    return folders.filter(folder => {
      const folderPath = folder.folder_path;
      return folderPath.startsWith(selectedFolder.folder_path + '/') && 
             folderPath.split('/').length === selectedFolder.folder_path.split('/').length + 1;
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-overlay fixed inset-0 bg-gray-900/70 backdrop-blur-lg flex items-center justify-center p-4"
        style={{ 
          zIndex: 999999,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh'
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col relative mx-6 my-8"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <FaExchangeAlt className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Move Document</h3>
                  <p className="text-sm text-gray-600 mt-1">Choose destination folder for "{currentItem?.nom_document}"</p>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 hover:bg-white/80 rounded-full transition-colors"
              >
                <FaTimes className="text-gray-500" />
              </motion.button>
            </div>
          </div>

          {/* Navigation */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBack}
                disabled={folderHistory.length === 0}
                className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 rounded-full hover:bg-white transition-colors shadow-sm"
              >
                <FaChevronLeft />
              </motion.button>
              <div className="flex items-center gap-2">
                <FaFolder className="text-yellow-500" />
                <span className="text-gray-700 font-medium">
                  {selectedFolder ? selectedFolder.folder_path.split('/').pop() : 'Root Directory'}
                </span>
              </div>
              {selectedFolder && (
                <div className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                  {selectedFolder.folder_path}
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-6 mt-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 flex items-center gap-3"
            >
              <FaExclamationTriangle className="text-red-500" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Folder List */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {getCurrentItems.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <FaFolder className="text-2xl text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg">No folders available</p>
                  <p className="text-gray-400 text-sm mt-1">You can move to root directory using the button below</p>
                </div>
              ) : (
                getCurrentItems.map((folder) => (
                  <motion.div
                    key={folder.folder_path}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleFolderClick(folder)}
                    className="flex flex-col items-center p-5 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 transition-all duration-200 group"
                  >
                    <div className="w-14 h-14 mb-3 flex items-center justify-center bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-full group-hover:from-yellow-200 group-hover:to-yellow-300 transition-all duration-200">
                      <FaFolder className="text-2xl text-yellow-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 text-center group-hover:text-gray-900 transition-colors">
                      {folder.folder_name}
                    </span>
                    <span className="text-xs text-gray-400 mt-1 text-center">
                      {folder.folder_path.split('/').slice(0, -1).join('/')}
                    </span>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-50 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {selectedFolder ? (
                  <span>Moving to: <strong>{selectedFolder.folder_name}</strong></span>
                ) : (
                  <span>Moving to: <strong>Root Directory</strong></span>
                )}
              </div>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="px-5 py-2.5 text-gray-600 hover:text-gray-800 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleMove}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium shadow-lg transition-all duration-200 flex items-center gap-2"
                >
                  <FaExchangeAlt />
                  Move Here
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

// Adăugăm componenta CreateFolderModal
const CreateFolderModal = ({ isOpen, onClose, onCreateFolder, folders, currentPath }) => {
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderName, setFolderName] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [folderHistory, setFolderHistory] = useState([]);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user role when modal opens
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch(`${backend}/api/user/user_info`, {
          credentials: 'include',
          headers: {
            'Origin': window.location.origin
          }
        });
        const data = await response.json();
        setUserRole(data.userRole);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole('user'); // Default to user if fetch fails
      }
    };

    if (isOpen) {
      fetchUserRole();
      setIsPrivate(true);
      setFolderName("");
      setError(null);
    }
  }, [isOpen]);

  // Check if user is admin or superadmin
  const isAdminUser = () => {
    return userRole === 'admin' || userRole === 'superadmin';
  };

  const handleFolderClick = (folder) => {
    setFolderHistory([...folderHistory, selectedFolder]);
    setSelectedFolder(folder);
    setError(null);
  };

  const handleBack = () => {
    if (folderHistory.length > 0) {
      const previousFolder = folderHistory[folderHistory.length - 1];
      setSelectedFolder(previousFolder);
      setFolderHistory(folderHistory.slice(0, -1));
      setError(null);
    }
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      setError("Folder name cannot be empty");
      return;
    }

    // Verificăm dacă numele conține caractere invalide pentru un folder
    if (/[\\/:*?"<>|]/.test(folderName)) {
      setError("Folder name contains invalid characters");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Construim calea completă pentru noul folder
      // Dacă nu avem niciun folder selectat, creăm în Root (nu în currentPath)
      const parentPath = selectedFolder ? selectedFolder.folder_path : null;
      
      await onCreateFolder(folderName, parentPath, isPrivate);
      onClose();
    } catch (error) {
      setError(error.message || "Failed to create folder");
    } finally {
      setIsLoading(false);
    }
  };

  // Truncate text with ellipsis if too long
  const truncateText = (text, maxLength = 20) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const getCurrentItems = () => {
    // Ensure folders is an array
    if (!folders || !Array.isArray(folders)) {
      return [];
    }
    
    if (!selectedFolder) {
      // Show only top-level folders
      return folders.filter(folder => {
        const pathParts = folder.folder_path.split('/');
        return pathParts.length === 2; // Only folders directly under institution
      });
    }

    // Get only immediate subfolders of the current folder
    return folders.filter(folder => {
      const folderPath = folder.folder_path;
      return folderPath.startsWith(selectedFolder.folder_path + '/') && 
             folderPath.split('/').length === selectedFolder.folder_path.split('/').length + 1;
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
        style={{ backdropFilter: 'blur(12px)' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col relative z-[10000]"
        >
                     {/* Modern Header */}
           <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30"
                >
                  <FaFolder className="text-2xl text-white" />
                </motion.div>
                <div>
                  <h3 className="text-2xl font-bold">Creează folder nou</h3>
                  <p className="text-blue-100 text-sm mt-1">Organizează-ți documentele în foldere structurate</p>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose} 
                className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 hover:bg-white/30 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-8 space-y-6 flex-1 overflow-y-auto">
            {/* Compact Location & Folder Name Row */}
            <div className="flex items-center gap-4">
              {/* Location Breadcrumb - Compact */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 flex-shrink-0">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBack}
                  disabled={folderHistory.length === 0}
                  className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:text-gray-400"
                >
                  <FaChevronLeft className="text-xs" />
                </motion.button>
                <div className="text-xs font-medium text-blue-700">
                  📁 {selectedFolder ? truncateText(selectedFolder.folder_path, 15) : 'Root'}
                </div>
              </div>

              {/* Folder Name Input - Compact */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pl-10 text-base transition-all duration-200"
                    placeholder="Numele folderului..."
                    autoFocus
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaFolder className="text-gray-400 text-sm" />
                  </div>
                </div>
              </div>

              {/* Privacy Toggle - Modern */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {isAdminUser() ? (
                  <div className="flex items-center gap-3">
                    {/* Modern Toggle Switch */}
                    <motion.button
                      onClick={() => setIsPrivate(!isPrivate)}
                      className={`relative inline-flex items-center h-8 rounded-full transition-colors duration-300 cursor-pointer ${
                        isPrivate 
                          ? 'bg-blue-600 w-20' 
                          : 'bg-gray-300 w-20'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center"
                        animate={{
                          x: isPrivate ? 44 : 0
                        }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        {isPrivate ? (
                          <FaLock className="text-blue-600 text-xs" />
                        ) : (
                          <FaGlobe className="text-gray-600 text-xs" />
                        )}
                      </motion.div>
                    </motion.button>
                    
                    {/* Status Label */}
                    <motion.div
                      key={isPrivate ? 'private' : 'public'}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`text-sm font-semibold whitespace-nowrap ${
                        isPrivate ? 'text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      {isPrivate ? '🔒 Privat' : '🌐 Public'}
                    </motion.div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {/* Disabled Toggle for Regular Users */}
                    <div className="relative inline-flex items-center h-8 rounded-full bg-blue-600 w-20 cursor-not-allowed opacity-60">
                      <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center">
                        <FaLock className="text-blue-600 text-xs" />
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-blue-700 whitespace-nowrap">
                      🔒 Privat
                    </div>
                  </div>
                )}
                
                {isAdminUser() && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium"
                  >
                    Admin
                  </motion.div>
                )}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-xl flex items-center gap-3"
              >
                <FaExclamationTriangle className="text-red-500 text-lg" />
                <div className="text-sm font-medium">{error}</div>
              </motion.div>
            )}

            {/* Destination Folder Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-700">📂 Foldere disponibile:</div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <FaLock className="text-xs" />
                    <span>Privat</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FaGlobe className="text-xs" />
                    <span>Public</span>
                  </div>
                </div>
              </div>
                             <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-6 h-80 overflow-y-auto border border-gray-200 rounded-lg p-6 bg-white">
                {getCurrentItems().map((item) => (
                                     <motion.button
                     key={item.folder_path}
                     whileHover={{ scale: 1.02 }}
                     whileTap={{ scale: 0.98 }}
                     onClick={() => handleFolderClick(item)}
                     className={`flex flex-col items-center gap-3 p-5 border-2 rounded-lg transition-all duration-200 text-center group relative ${
                       item.is_private 
                         ? 'border-blue-200 hover:bg-blue-50 hover:border-blue-300' 
                         : 'border-blue-300 hover:bg-blue-100 hover:border-blue-400'
                     }`}
                     title={`${item.folder_name} (${item.is_private ? 'Privat' : 'Public'})`}
                   >
                    <div className="relative">
                      <FaFolder className={`text-3xl transition-colors ${
                        item.is_private ? 'text-blue-500 group-hover:text-blue-600' : 'text-blue-600 group-hover:text-blue-700'
                      }`} />
                      {item.is_private ? (
                        <FaLock className="absolute -bottom-1 -right-1 text-xs text-blue-600 bg-white rounded-full p-0.5" />
                      ) : (
                        <FaGlobe className="absolute -bottom-1 -right-1 text-xs text-blue-700 bg-white rounded-full p-0.5" />
                      )}
                    </div>
                                         <span 
                       className="text-sm font-medium text-gray-700 w-full truncate cursor-help"
                       title={item.folder_name}
                     >
                       {truncateText(item.folder_name, 15)}
                     </span>
                    <div className={`text-sm px-3 py-1 rounded-full font-medium ${
                      item.is_private 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-blue-200 text-blue-800'
                    }`}>
                      {item.is_private ? 'Privat' : 'Public'}
                    </div>
                  </motion.button>
                ))}
              </div>
              {getCurrentItems().length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <FaFolder className="text-3xl text-gray-300 mx-auto mb-2" />
                  <p className="text-sm">Nu s-au găsit folderuri în această locație</p>
                </div>
              )}
            </div>
          </div>

          {/* Modern Footer */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-t border-gray-200 flex-shrink-0">
            <div className="flex justify-end gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-200 hover:bg-gray-50 rounded-xl transition-all duration-200 font-medium shadow-sm"
              >
                Anulează
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateFolder}
                disabled={!folderName.trim() || isLoading}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 disabled:opacity-70 transition-all duration-300 font-semibold flex items-center gap-3 shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FaPlus className="text-sm" />
                )}
                {isLoading ? 'Se creează...' : 'Creează folder'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

// New: FolderContentsModal component
const FolderContentsModal = ({ isOpen, onClose, folder, onConfirmDelete }) => {
  const [loading, setLoading] = useState(true);
  const [contents, setContents] = useState(null);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    if (isOpen && folder) {
      fetchFolderContents();
    }
  }, [isOpen, folder]);

  const fetchFolderContents = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${backend}/post_docs/folders/${folder.id}/contents`, {
        credentials: 'include',
        headers: { 'Origin': window.location.origin }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error details:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to fetch folder contents');
      }

      const data = await response.json();
      if (data.success) {
        setContents(data);
      } else {
        throw new Error(data.error || 'Failed to fetch folder contents');
      }
    } catch (error) {
      console.error('Error fetching folder contents:', error);
      setError(error.message || 'An unexpected error occurred while fetching folder contents');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`${backend}/post_docs/folders/${folder.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete folder');
      }

      const result = await response.json();
      if (result.success) {
        onConfirmDelete();
        onClose();
      } else {
        setError(result.error || 'Failed to delete folder');
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      setError(error.message || 'Failed to delete folder');
    }
  };

  const toggleItem = (key) => {
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
         style={{ 
           position: 'fixed',
           top: 0,
           left: 0,
           right: 0,
           bottom: 0,
           width: '100vw',
           height: '100vh'
         }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <FaExclamationTriangle className="text-2xl text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Confirmare ștergere folder
              </h2>
              <p className="text-gray-600 mt-1">
                Acest folder conține elemente care vor fi și ele șterse
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-lg text-red-700 flex items-center gap-3">
              <FaExclamation className="text-2xl" />
              <p>{error}</p>
            </div>
          ) : contents ? (
            <>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 mb-6">
                <div className="flex items-start gap-4">
                  <div className="bg-yellow-200 rounded-full p-3 mt-1">
                    <FaExclamationTriangle className="text-yellow-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">Warning</h3>
                    <p className="text-yellow-700">
                      You are about to delete folder <span className="font-medium">{contents.folderName}</span> and all of its contents.
                      This action cannot be undone.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <div className="bg-yellow-100 py-1 px-3 rounded-full flex items-center gap-1.5 text-sm text-yellow-800">
                        <FaFolder className="text-yellow-600" />
                        <span>{contents.contents.totalFolders} folders</span>
                      </div>
                      <div className="bg-yellow-100 py-1 px-3 rounded-full flex items-center gap-1.5 text-sm text-yellow-800">
                        <FaFilePdf className="text-yellow-600" />
                        <span>{contents.contents.directDocuments} direct documents</span>
                      </div>
                      {contents.contents.nestedDocuments > 0 && (
                        <div className="bg-yellow-100 py-1 px-3 rounded-full flex items-center gap-1.5 text-sm text-yellow-800">
                          <FaFilePdf className="text-yellow-600" />
                          <span>{contents.contents.nestedDocuments} nested documents</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <FaFolder className="text-yellow-500" />
                    <span>Folders</span>
                  </h3>
                  <span className="text-sm bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                    {contents.contents.subfolders.length} item{contents.contents.subfolders.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {contents.contents.subfolders.length === 0 ? (
                  <div className="border border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 flex flex-col items-center justify-center text-gray-500">
                    <FaBox className="text-gray-400 text-2xl mb-2" />
                    <p>No folders found</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {contents.contents.subfolders.map((subfolder, index) => (
                      <div 
                        key={subfolder.id} 
                        className={`
                          ${index !== 0 ? 'border-t border-gray-200' : ''}
                          hover:bg-gray-50 transition-colors
                        `}
                      >
                        <div 
                          className="flex items-center justify-between p-3 cursor-pointer"
                          onClick={() => toggleItem(`folder-${subfolder.id}`)}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <div className="relative">
                              <FaFolder className="text-xl text-yellow-500" />
                              {subfolder.isPrivate && (
                                <FaLock className="absolute -bottom-1 -right-1 text-xs text-gray-600" />
                              )}
                            </div>
                            <span className="font-medium text-gray-700">{subfolder.name}</span>
                          </div>
                          <div className="text-gray-500">
                            {expandedItems[`folder-${subfolder.id}`] ? (
                              <FaChevronUp className="text-sm" />
                            ) : (
                              <FaChevronDown className="text-sm" />
                            )}
                          </div>
                        </div>
                        
                        {expandedItems[`folder-${subfolder.id}`] && (
                          <div className="bg-gray-50 px-3 py-2 border-t border-gray-200">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <FaInfoCircle className="text-blue-500" />
                              <span>Path: {subfolder.path}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete Folder
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
};

const Documents = () => {
  // Utility functions
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // State declarations
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [folderHistory, setFolderHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  const [draggedPosition, setDraggedPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showFolderRenameModal, setShowFolderRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFolderDeleteConfirmModal, setShowFolderDeleteConfirmModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [originalPdfUrl, setOriginalPdfUrl] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [showRecycleBinModal, setShowRecycleBinModal] = useState(false);
  const [deletedItems, setDeletedItems] = useState([]);
  const [selectedDeletedItem, setSelectedDeletedItem] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [activeTab, setActiveTab] = useState('documents');
  const [recycleBinLoading, setRecycleBinLoading] = useState(false);
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showMoveToast, setShowMoveToast] = useState(false);
  const [moveToastMessage, setMoveToastMessage] = useState('');
  const [moveToastType, setMoveToastType] = useState('success');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showFolderContentsModal, setShowFolderContentsModal] = useState(false);
  const [socket, setSocket] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newName, setNewName] = useState('');
  const [restoreModalCurrentFolder, setRestoreModalCurrentFolder] = useState(null);
  const [restoreModalFolderHistory, setRestoreModalFolderHistory] = useState([]);
  const [restoreModalFolders, setRestoreModalFolders] = useState([]);
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false);
  const [restoreConfirmData, setRestoreConfirmData] = useState(null);
  const [showFolderMoveModal, setShowFolderMoveModal] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [sortType, setSortType] = useState('name'); // 'name', 'date', 'size'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const sortButtonRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('title'); // 'title' or 'id'
  
  // Advanced Filter Modal States
  const [showAdvancedFilterModal, setShowAdvancedFilterModal] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    tags: [],
    keywords: [],
    dateRange: { start: '', end: '' },
    documentType: ''
  });
  const [isAdvancedFilterActive, setIsAdvancedFilterActive] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [availableTypes, setAvailableTypes] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [filteredKeywords, setFilteredKeywords] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [isKeywordDropdownOpen, setIsKeywordDropdownOpen] = useState(false);
  const [showSelectedKeywordsModal, setShowSelectedKeywordsModal] = useState(false);
  
  // Advanced Filter Combobox States
  const [keywordSearchTerm, setKeywordSearchTerm] = useState('');
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [filteredAvailableTags, setFilteredAvailableTags] = useState([]);
  const [filteredAvailableKeywords, setFilteredAvailableKeywords] = useState([]);
  const [pdfCache, setPdfCache] = useState(new Map());
  const [isLoadingPdfs, setIsLoadingPdfs] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  
  // Content-based search states
  const [showContentSearchModal, setShowContentSearchModal] = useState(false);
  const [contentSearchQuery, setContentSearchQuery] = useState('');
  const [contentSearchType, setContentSearchType] = useState('smart'); // 'smart', 'text-only', 'ocr-only'
  const [isContentSearching, setIsContentSearching] = useState(false);
  const [contentSearchResults, setContentSearchResults] = useState([]);
  const [isContentFilterActive, setIsContentFilterActive] = useState(false);
  // New state variables for enhanced search functionality
  const [searchProgress, setSearchProgress] = useState({ current: 0, total: 0, processing: '' });
  const [searchFoundResults, setSearchFoundResults] = useState([]);
  const [highlightTerms, setHighlightTerms] = useState([]);
  const [searchResultsMapping, setSearchResultsMapping] = useState({});
  const [targetPageNumber, setTargetPageNumber] = useState(null);
  const [isSearchInProgress, setIsSearchInProgress] = useState(false);
  const [preloadedDocDetails, setPreloadedDocDetails] = useState(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Add this function to handle persistent caching
  const updatePdfCache = (folderPath, pdfs) => {
    // Update in-memory cache
    const newCache = new Map(pdfCache);
    for (const [filename, pdfData] of Object.entries(pdfs)) {
      newCache.set(filename, pdfData);
    }
    setPdfCache(newCache);

    // Update localStorage with error handling and cleanup
    try {
      const storedCache = JSON.parse(localStorage.getItem('pdfCache') || '{}');
      storedCache[folderPath] = pdfs;
      
      // Check if localStorage is getting full and clean old entries
      const cacheSize = JSON.stringify(storedCache).length;
      if (cacheSize > 4 * 1024 * 1024) { // 4MB limit
        console.log('🧹 Cleaning old PDF cache entries...');
        const entries = Object.entries(storedCache);
        // Keep only the 20 most recent entries
        const sortedEntries = entries.sort((a, b) => {
          const aTime = a[1]?.timestamp || 0;
          const bTime = b[1]?.timestamp || 0;
          return bTime - aTime;
        });
        const cleanedCache = Object.fromEntries(sortedEntries.slice(0, 20));
        localStorage.setItem('pdfCache', JSON.stringify(cleanedCache));
        console.log('✅ PDF cache cleaned, kept 20 most recent entries');
      } else {
        localStorage.setItem('pdfCache', JSON.stringify(storedCache));
      }
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('📦 localStorage quota exceeded, clearing old cache entries...');
        // Clear old entries and try again
        try {
          const storedCache = JSON.parse(localStorage.getItem('pdfCache') || '{}');
          const entries = Object.entries(storedCache);
          const sortedEntries = entries.sort((a, b) => {
            const aTime = a[1]?.timestamp || 0;
            const bTime = b[1]?.timestamp || 0;
            return bTime - aTime;
          });
          const cleanedCache = Object.fromEntries(sortedEntries.slice(0, 10));
          cleanedCache[folderPath] = pdfs;
          localStorage.setItem('pdfCache', JSON.stringify(cleanedCache));
          console.log('✅ PDF cache cleaned and updated successfully');
        } catch (retryError) {
          console.error('❌ Failed to update PDF cache after cleanup:', retryError);
          // Keep only in-memory cache
        }
      } else {
        console.error('Error updating PDF cache:', error);
      }
    }
  };

  // Add this function to load cached PDFs
  const loadCachedPdfs = (folderPath) => {
    try {
      const storedCache = JSON.parse(localStorage.getItem('pdfCache') || '{}');
      if (storedCache[folderPath]) {
        const newCache = new Map(pdfCache);
        for (const [filename, pdfData] of Object.entries(storedCache[folderPath])) {
          newCache.set(filename, pdfData);
        }
        setPdfCache(newCache);
        return true;
      }
    } catch (error) {
      console.error('Error loading cached PDFs:', error);
      // Clear corrupted cache
      localStorage.removeItem('pdfCache');
    }
    return false;
  };

  // Cleanup localStorage on component mount
  useEffect(() => {
    try {
      const storedCache = JSON.parse(localStorage.getItem('pdfCache') || '{}');
      const cacheSize = JSON.stringify(storedCache).length;
      
      if (cacheSize > 5 * 1024 * 1024) { // 5MB limit
        console.log('🧹 Initial PDF cache cleanup...');
        const entries = Object.entries(storedCache);
        const sortedEntries = entries.sort((a, b) => {
          const aTime = a[1]?.timestamp || 0;
          const bTime = b[1]?.timestamp || 0;
          return bTime - aTime;
        });
        const cleanedCache = Object.fromEntries(sortedEntries.slice(0, 15));
        localStorage.setItem('pdfCache', JSON.stringify(cleanedCache));
        console.log('✅ Initial PDF cache cleanup completed');
      }
    } catch (error) {
      console.error('Error during initial cache cleanup:', error);
      localStorage.removeItem('pdfCache');
    }
  }, []); // Run only once on mount

  const fetchKeywords = async () => {
    try {
      console.log('Fetching keywords...');
      const response = await fetch(`${backend}/post_docs/keywords`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('Keywords response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Keywords response data:', data);

      // Verificăm dacă avem un răspuns valid cu keywords
      if (!data.success || !Array.isArray(data.keywords)) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format from server');
      }

      // Curățăm și sortăm cuvintele cheie
      const keywordsArray = data.keywords
        .filter(keyword => keyword && typeof keyword === 'string')
        .map(keyword => keyword.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'ro')); // Sortare alfabetică în română

      console.log('Processed keywords:', keywordsArray);
      setKeywords(keywordsArray);
    } catch (error) {
      console.error('Error fetching keywords:', error);
      showError('Error', 'Failed to fetch keywords');
    }
  };

  const handleKeywordSearch = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (searchMode === 'keywords') {
      const filtered = keywords.filter(keyword => 
        keyword.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredKeywords(filtered);
      setIsKeywordDropdownOpen(true);
    }
  };

  const handleKeywordSelect = (keyword) => {
    console.log('Keyword selected:', keyword);
    setSelectedKeywords(prev => {
      if (prev.includes(keyword)) {
        return prev.filter(k => k !== keyword);
      }
      return [...prev, keyword];
    });
    setSearchQuery('');
    setIsKeywordDropdownOpen(false);
  };

  const handleRemoveKeyword = (keywordToRemove) => {
    setSelectedKeywords(prev => prev.filter(k => k !== keywordToRemove));
  };

  // Content-based search functions
  const handleContentSearch = async () => {
    if (!contentSearchQuery.trim()) {
      showError('Error', 'Please enter search terms');
      return;
    }

    setIsContentSearching(true);
    setIsSearchInProgress(true);
    setSearchProgress({ current: 0, total: 0, processing: 'Începem căutarea...' });
    setSearchFoundResults([]);
    
    // Store search terms for highlighting
    const searchTermsArray = contentSearchQuery.split(',').map(term => term.trim().toLowerCase()).filter(Boolean);
    setHighlightTerms(searchTermsArray);

    try {
      console.log('🔍 Starting enhanced content search for:', contentSearchQuery);
      
      const response = await fetch(`${backend}/post_docs/content-search-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          searchTerms: contentSearchQuery,
          folderPath: getCurrentPath(),
          searchType: contentSearchType
        }),
      });

      if (!response.ok) {
        // Fallback to original endpoint if progress endpoint doesn't exist
        const fallbackResponse = await fetch(`${backend}/post_docs/content-search`, {
          method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
          credentials: 'include',
        body: JSON.stringify({
            searchTerms: contentSearchQuery,
            folderPath: getCurrentPath(),
            searchType: contentSearchType
          }),
        });

        if (!fallbackResponse.ok) {
          throw new Error(`HTTP error! status: ${fallbackResponse.status}`);
        }

        const data = await fallbackResponse.json();
      
      if (data.success) {
        console.log('✅ Content search results:', data.results);
        setContentSearchResults(data.results || []);
          
          // Create search results mapping for highlighting
          const resultsMapping = {};
          if (data.results) {
            data.results.forEach(result => {
              if (result.matches) {
                resultsMapping[result.nom_document] = result.matches;
              }
            });
          }
          setSearchResultsMapping(resultsMapping);
          
        setIsContentFilterActive(true);
        setShowContentSearchModal(false);
        const methodInfo = data.extractionMethods ? 
          ` (${data.extractionMethods.text} text, ${data.extractionMethods.ocr} OCR, ${data.extractionMethods.unknown} other)` : '';
          showSuccess(`Găsit ${data.results?.length || 0} documente care conțin termenii căutați${methodInfo}`);
      } else {
        throw new Error(data.error || 'Search failed');
        }
      } else {
        // Handle streaming response for progress tracking
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.trim()) {
                try {
                  const data = JSON.parse(line);
                  
                  if (data.type === 'progress') {
                    setSearchProgress({
                      current: data.current,
                      total: data.total,
                      processing: data.processing || `Procesăm documentul ${data.current}/${data.total}`
                    });
                  } else if (data.type === 'found') {
                    setSearchFoundResults(prev => [...prev, data.document]);
                  } else if (data.type === 'complete') {
                    console.log('✅ Enhanced content search complete:', data.results);
                    setContentSearchResults(data.results || []);
                    
                    // Create search results mapping for highlighting
                    const resultsMapping = {};
                    if (data.results) {
                      data.results.forEach(result => {
                        if (result.matches) {
                          resultsMapping[result.nom_document] = result.matches;
                          console.log(`📄 Mapping for ${result.nom_document}:`, result.matches);
                        }
                      });
                    }
                    console.log('🗺️ Final searchResultsMapping:', resultsMapping);
                    setSearchResultsMapping(resultsMapping);
                    
                    setIsContentFilterActive(true);
                    setShowContentSearchModal(false);
                    const methodInfo = data.extractionMethods ? 
                      ` (${data.extractionMethods.text} text, ${data.extractionMethods.ocr} OCR, ${data.extractionMethods.unknown} other)` : '';
                    showSuccess(`Găsit ${data.results?.length || 0} documente care conțin termenii căutați${methodInfo}`);
                    break;
                  }
                } catch (parseError) {
                  console.warn('Failed to parse progress line:', line, parseError);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (error) {
      console.error('💥 Content search error:', error);
      showError('Eroare Căutare', 'Nu s-a putut căuta în conținutul documentelor');
    } finally {
      setIsContentSearching(false);
      setIsSearchInProgress(false);
      setSearchProgress({ current: 0, total: 0, processing: '' });
    }
  };

  const clearContentSearch = () => {
    setContentSearchResults([]);
    setIsContentFilterActive(false);
    setContentSearchQuery('');
    setContentSearchType('smart');
    setHighlightTerms([]);
    setSearchResultsMapping({});
    setTargetPageNumber(null);
    setSearchFoundResults([]);
  };

  // Advanced Filter Functions
  const fetchAvailableFiltersData = async () => {
    try {
      // Fetch available tags from backend
      const tagsResponse = await fetch(`${backend}/post_docs/tags`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        }
      });

      if (tagsResponse.ok) {
        const tagsData = await tagsResponse.json();
        if (tagsData.success && Array.isArray(tagsData.tags)) {
          const tagNames = tagsData.tags.map(tag => tag.tag_name);
          setAvailableTags(tagNames);
          setFilteredAvailableTags(tagNames);
        }
      }

      // Fetch available document types from backend
      const typesResponse = await fetch(`${backend}/post_docs/document-types`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        }
      });

      if (typesResponse.ok) {
        const typesData = await typesResponse.json();
        if (typesData.success && Array.isArray(typesData.types)) {
          setAvailableTypes(typesData.types.map(type => ({
            id: type.id,
            name: type.type_name
          })));
        }
      }

      // Fetch available keywords from backend
      const keywordsResponse = await fetch(`${backend}/post_docs/keywords`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        }
      });

      if (keywordsResponse.ok) {
        const keywordsData = await keywordsResponse.json();
        if (keywordsData.success && Array.isArray(keywordsData.keywords)) {
          setKeywords(keywordsData.keywords);
          setFilteredKeywords(keywordsData.keywords);
          setFilteredAvailableKeywords(keywordsData.keywords);
        }
      }
    } catch (error) {
      console.error('Error fetching filter data:', error);
    }
  };

  const applyAdvancedFilters = () => {
    const hasFilters = 
      advancedFilters.tags.length > 0 ||
      advancedFilters.keywords.length > 0 ||
      advancedFilters.dateRange.start ||
      advancedFilters.dateRange.end ||
      advancedFilters.documentType;

    setIsAdvancedFilterActive(hasFilters);
    setShowAdvancedFilterModal(false);
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      tags: [],
      keywords: [],
      dateRange: { start: '', end: '' },
      documentType: ''
    });
    setIsAdvancedFilterActive(false);
    setShowAdvancedFilterModal(false);
    // Reset combobox search terms
    setKeywordSearchTerm('');
    setTagSearchTerm('');
    setFilteredAvailableTags(availableTags);
    setFilteredAvailableKeywords(keywords);
  };

  // Filter functions for comboboxes
  const handleKeywordSearchChange = (value) => {
    setKeywordSearchTerm(value);
    const filtered = keywords.filter(keyword =>
      keyword.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredAvailableKeywords(filtered);
  };

  const handleTagSearchChange = (value) => {
    setTagSearchTerm(value);
    const filtered = availableTags.filter(tag =>
      tag.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredAvailableTags(filtered);
  };

  const handleKeywordToggle = (keyword) => {
    setAdvancedFilters(prev => ({
      ...prev,
      keywords: prev.keywords.includes(keyword)
        ? prev.keywords.filter(k => k !== keyword)
        : [...prev.keywords, keyword]
    }));
  };

  const handleTagToggle = (tag) => {
    setAdvancedFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const refreshView = async () => {
    console.log('Refreshing view...');
    try {
      // Reîncarcă lista de foldere
      const response = await fetch(`${backend}/post_docs/folders`);
      const data = await response.json();
      if (response.ok) {
        setFolders(data);
        console.log('Folders refreshed successfully');
      } else {
        console.error('Failed to refresh folders:', data.error);
      }
    } catch (error) {
      console.error('Error refreshing view:', error);
    }
  };

  const handleMoveFolder = async (sourcePath, destinationPath) => {
    console.log('handleMoveFolder called with:', { sourcePath, destinationPath });
    try {
      // Emit socket event for the folder move
      if (socket && socket.connected) {
        console.log('Emitting socket event for folder move');
        const eventData = {
          type: 'move',
          sourcePath,
          targetFolder: destinationPath,
          timestamp: new Date().toISOString()
        };
        socket.emit('fileSystemChange', eventData);
      }

      const response = await fetch(`${backend}/post_docs/folders/move`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourcePath,
          destinationPath,
        }),
      });

      console.log('Move folder API response status:', response.status);
      const data = await response.json();
      console.log('Move folder API response data:', data);

      if (response.ok) {
        console.log('Folder move successful');
        showSuccess('Folder moved successfully');
        
        // Update state instantly without refresh
        const folderName = path.basename(sourcePath);
        const newFolderPath = `${destinationPath}/${folderName}`;
        
        // Update folders state instantly
        setFolders(prevFolders => {
          if (!prevFolders) return [];
          
          const updateFolderPaths = (folders) => {
            return folders.map(folder => {
              if (folder.folder_path === sourcePath) {
                return { ...folder, folder_path: newFolderPath };
              }
              if (folder.folder_path.startsWith(sourcePath + '/')) {
                const relativePath = folder.folder_path.substring(sourcePath.length);
                return { ...folder, folder_path: newFolderPath + relativePath };
              }
              if (folder.children) {
                return { ...folder, children: updateFolderPaths(folder.children) };
              }
              return folder;
            });
          };
          
          return updateFolderPaths(prevFolders);
        });
        
        // Update documents state instantly
        setDocuments(prevDocuments => {
          if (!prevDocuments) return [];
          
          return prevDocuments.map(doc => {
            if (doc.path.startsWith(sourcePath + '/')) {
              const relativePath = doc.path.substring(sourcePath.length);
              return { ...doc, path: newFolderPath + relativePath };
            }
            return doc;
          });
        });
        
        // Update current folder if it was moved
        if (currentFolder && currentFolder.folder_path === sourcePath) {
          setCurrentFolder(prev => ({ ...prev, folder_path: newFolderPath }));
          setCurrentPath(newFolderPath);
        }
      } else {
        console.error('Folder move failed:', data.error);
        showError('Error', data.error || 'Failed to move folder');
      }
    } catch (error) {
      console.error('Folder move error:', error);
      showError('Error', 'Failed to move folder');
    }
  };

  // Restore modal functions
  const fetchRestoreModalFolders = async (path = '') => {
    try {
      console.log('Fetching folders for restore modal:', { path });
      const response = await fetch(`${backend}/post_docs/folders?path=${encodeURIComponent(path)}`, {
        credentials: 'include'
          });

          if (!response.ok) {
        throw new Error('Failed to fetch folders');
          }

          const data = await response.json();
      console.log('Fetched folders for restore modal:', data);

      // Filter folders based on the same criteria as the Move modal
      const filteredFolders = data.folders.filter(folder => {
        const pathParts = folder.folder_path.split('/').filter(Boolean);
        
        // For top-level folders (when no path is specified)
        if (!path) {
          return pathParts.length === 2; // Only show folders directly under institution
        }
        
        // For subfolders (when a path is specified)
        return folder.folder_path.startsWith(path) && 
               folder.folder_path.split('/').filter(Boolean).length === path.split('/').filter(Boolean).length + 1;
      });

      console.log('Filtered folders for restore modal:', filteredFolders);
      setRestoreModalFolders(filteredFolders);
    } catch (error) {
      console.error('Error fetching folders for restore modal:', error);
      showError('Error', 'Failed to fetch folders');
    }
  };

  const handleRestoreModalNavigate = async (folder) => {
    console.log('Navigating to folder in restore modal:', {
      folderName: folder.folder_name,
      folderPath: folder.folder_path
    });
    setRestoreModalFolderHistory(prev => [...prev, restoreModalCurrentFolder]);
    setRestoreModalCurrentFolder(folder);
    await fetchRestoreModalFolders(folder.folder_path);
  };

  const handleRestoreModalNavigateBack = async () => {
    console.log('Navigating back in restore modal');
    const previousFolder = restoreModalFolderHistory[restoreModalFolderHistory.length - 1];
    setRestoreModalFolderHistory(prev => prev.slice(0, -1));
    setRestoreModalCurrentFolder(previousFolder);
    await fetchRestoreModalFolders(previousFolder?.folder_path || '');
  };

  const handleRestoreClick = (item) => {
    console.log('Restore clicked for item:', {
      id: item.id,
      type: item.type,
      name: item.name,
      path: item.path
    });
    setSelectedDeletedItem(item);
    setShowRestoreModal(true);
    fetchRestoreModalFolders();
  };

  const handleFolderDeleteAfterContents = () => {
    if (folderToDelete) {
      handleFolderDeleteConfirm();
    }
  };

  const showSuccess = (message) => {
    antMessage.success({
      content: message,
      duration: 3,
      style: {
        marginTop: '80px',
        zIndex: 9999,
      },
    });
  };

  const showError = (title, message) => {
    antMessage.error({
      content: (
        <div>
          <div style={{ fontWeight: 'bold' }}>{title}</div>
          <div>{message}</div>
        </div>
      ),
      duration: 5,
      style: {
        marginTop: '80px',
        zIndex: 9999,
      },
    });
  };

  // Function to update document path instantly without refresh
  const updateDocumentPathInstantly = (fileName, oldPath, newPath) => {
    // console.log('📄 Updating document path instantly:', { fileName, oldPath, newPath });
    
    setDocuments(prevDocuments => {
      if (!prevDocuments) {
        return [];
      }
      
      const updatedDocuments = prevDocuments.map(doc => {
        if (doc.nom_document === fileName && doc.path === oldPath) {
          // console.log('✅ Updating document:', doc.nom_document, 'from', oldPath, 'to', newPath);
          return { ...doc, path: newPath };
        }
        return doc;
      });
      
      return updatedDocuments;
    });
  };

  // Function to remove document instantly without refresh
  const removeDocumentInstantly = (documentToRemove) => {
    // console.log('🗑️ Removing document instantly:', documentToRemove);
    
    setDocuments(prevDocuments => {
      if (!prevDocuments) return [];
      
      // Filter out undefined/null documents and the target document
      const filteredDocuments = prevDocuments
        .filter(doc => doc && doc.nom_document) // Remove undefined/null documents
        .filter(doc => 
          !(doc.id_document === documentToRemove.id_document || 
            (doc.path === documentToRemove.path && doc.nom_document === documentToRemove.nom_document))
        );
      
      // console.log('Documents after removal:', filteredDocuments.length);
      return filteredDocuments;
    });
  };

  // Function to add document instantly without refresh
  const addDocumentInstantly = (newDocument) => {
    console.log('➕ Adding document instantly:', newDocument);
    
    // Validate the document before adding
    if (!newDocument || !newDocument.nom_document) {
      console.warn('⚠️ Invalid document provided to addDocumentInstantly:', newDocument);
      return;
    }
    
    setDocuments(prevDocuments => {
      if (!prevDocuments) return [newDocument];
      
      // Filter out undefined/null documents first
      const validDocuments = prevDocuments.filter(doc => doc && doc.nom_document);
      
      // Check if document already exists
      const exists = validDocuments.some(doc => 
        doc.id_document === newDocument.id_document || 
        (doc.path === newDocument.path && doc.nom_document === newDocument.nom_document)
      );
      
      if (!exists) {
        // If this is a new document, trigger PDF cache refresh
        if (currentFolder && currentFolder.folder_path) {
          console.log('🔄 New document added, refreshing PDF cache for:', currentFolder.folder_path);
          // Clear cache and fetch new PDFs in background
          setTimeout(() => {
            clearPdfCacheForFolder(currentFolder.folder_path);
            fetchMultiplePdfs(currentFolder.folder_path).catch(error => {
              console.error('Error refreshing PDF cache for new document:', error);
            });
          }, 300);
        }
        
        return [...validDocuments, newDocument];
      }
      
      return validDocuments;
    });
  };

  // Expose function globally for FolderSidebar to use
  window.updateDocumentPathInstantly = updateDocumentPathInstantly;
  
  // Ensure function is exposed when component mounts
  useEffect(() => {
    window.updateDocumentPathInstantly = updateDocumentPathInstantly;
    console.log('🔗 updateDocumentPathInstantly function exposed globally');
    
    return () => {
      delete window.updateDocumentPathInstantly;
    };
  }, []);

  // PDF previews are now handled by the debounced useEffect below
  // This prevents duplicate calls when currentFolder changes

  const handleFolderDeleteConfirm = async () => {
    if (!folderToDelete) return;

    try {
      const response = await fetch(`${backend}/post_docs/folders/${folderToDelete.id}`, {
        method: 'DELETE',
          credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Even if we get a 404, if the folder is in deleted_folders, consider it a success
      const result = await response.json();
      
      // Check if the folder was actually deleted by looking in deleted_folders
      const deletedResponse = await fetch(`${backend}/post_docs/recycle-bin`, {
        credentials: 'include'
      });
      const deletedData = await deletedResponse.json();
      
      // Check if items is an array or an object with folders property
      const itemsArray = Array.isArray(deletedData.items) 
        ? deletedData.items 
        : (deletedData.items?.folders || []);
        
      const wasDeleted = itemsArray.some(item => 
        item.type === 'folder' && item.id === folderToDelete.id
      );

      if (wasDeleted || result.success) {
        // Update local state instantly for smooth UX (no flicker)
        setFolders(prevFolders => {
          if (!prevFolders) return [];
          
          const updateFolders = (items) => {
            if (!items) return [];
            
            return items.map(folder => {
              if (!folder) return null;
              
              if (folder.id === folderToDelete.id) {
                return null; // Remove the deleted folder
              }
              if (folder.children) {
                return {
                  ...folder,
                  children: updateFolders(folder.children)
                };
              }
              return folder;
            }).filter(Boolean); // Remove null items
          };
          return updateFolders(prevFolders);
        });

        // Check if the deleted folder is the current folder
        if (currentFolder && currentFolder.id === folderToDelete.id) {
          console.log('🔄 Deleted folder is current folder, navigating to parent...');
          
          // Navigate back to parent folder
          if (folderHistory.length > 0) {
            const previousFolder = folderHistory[folderHistory.length - 1];
            setCurrentFolder(previousFolder);
            setFolderHistory(folderHistory.slice(0, -1));
            
            // Update current path
            if (previousFolder.folder_path) {
              setCurrentPath(previousFolder.folder_path);
            } else {
              setCurrentPath('');
            }
          } else {
            // If no history, go to root
            setCurrentFolder(null);
            setCurrentPath('');
            setFolderHistory([]);
          }
          
          // Refresh documents to show parent folder content
          await fetchDocuments(true);
        }

        // Show success notification
        showSuccess('Folder moved to recycle bin');
        
        // Reset modal states
        setShowFolderContentsModal(false);
        setFolderToDelete(null);
        
        // Refresh deleted items list in background (no UI impact)
      fetchDeletedItems();
      } else {
        setError(result.error || 'Failed to delete folder');
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      setError(error.message || 'Failed to delete folder');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Fetch user ID from session
  const fetchUserId = async () => {
    try {
      const response = await fetch(`${backend}/session-check`, {
        credentials: 'include',
        headers: { 'Origin': window.location.origin }
      });
      const data = await response.json();
      if (data.valid) {
        setUserId(data.id_user);
      }
    } catch (error) {
      console.error('Error fetching user ID:', error);
    }
  };

  // Fetch folders
  const fetchFolders = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${backend}/post_docs/folders`, {
        credentials: 'include',
        headers: { 'Origin': window.location.origin }
        });

        if (!response.ok) {
        throw new Error('Failed to fetch folders');
        }

        const data = await response.json();
      console.log('📁 Fetched folders data:', data);
      if (data.folders) {
        // Set all folders without filtering by user ID
        console.log('📁 Setting folders:', data.folders);
        setFolders(data.folders);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
      setError('Failed to load folders');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDeletedItems = async () => {
    try {
      setRecycleBinLoading(true);
      const response = await fetch(`${backend}/post_docs/recycle-bin`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch deleted items');
      const data = await response.json();
      if (data.success) {
        setDeletedItems(data.items);
      }
    } catch (error) {
      console.error('Error fetching deleted items:', error);
      showError('Error', 'Failed to fetch deleted items');
    } finally {
      setRecycleBinLoading(false);
    }
  };

  // Fetch documents from current folder - optimized for instant loading
  const fetchDocuments = React.useCallback(async (skipPdfLoad = false) => {
    try {
      // If we have a current folder, fetch only documents from that folder
      if (currentFolder && currentFolder.folder_path) {
        // console.log('📁 Fetching documents from folder:', currentFolder.folder_path);
        
        const response = await fetch(`${backend}/post_docs/documents/folder/${encodeURIComponent(currentFolder.folder_path)}`, {
          credentials: 'include',
          headers: { 'Origin': window.location.origin }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch documents from folder');
        }
        
        const data = await response.json();
        if (data.success && data.documents) {
          // Optimized document processing for instant display
          const processedDocuments = data.documents.map(doc => ({
            id_document: doc.id,
            nom_document: doc.name,
            path: doc.path,
            type_name: doc.type,
            type: doc.type,
            date_upload: doc.uploadDate,
            file_size: doc.file_size || doc.size,
            prenom: doc.uploadedBy?.split(' ')[0] || '',
            nom: doc.uploadedBy?.split(' ')[1] || '',
            tags: doc.tags || [],
            is_deleted: doc.is_deleted,
            mot1: doc.mot1,
            mot2: doc.mot2,
            mot3: doc.mot3,
            mot4: doc.mot4,
            mot5: doc.mot5
          }));
          
          // Set documents immediately for instant UI update
          setDocuments(processedDocuments);
        } else {
          setDocuments([]);
        }
      } else {
        // If no current folder, don't fetch any documents initially
        setDocuments([]);
        return;
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError('Failed to load documents');
      setDocuments([]); // Set empty array on error for instant feedback
    }
  }, [currentFolder?.folder_path]); // Only depend on folder path, not entire object

  // Initialize socket connection
  useEffect(() => {
    const socketInstance = getSocket();
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Socket connected in DiffusePage');
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected in DiffusePage:', reason);
    });

    socketInstance.on('fileSystemUpdate', (data) => {
      console.log('🔄 Received fileSystemUpdate:', data);
      
      // Handle different types of file system updates
      switch (data.type) {
        case 'move':
          // Instant move handling - remove document from source folder immediately
          if (data.documentName && data.sourcePath && currentFolder) {
            const sourceFolderPath = data.sourcePath.split('/').slice(-2, -1)[0]; // Get folder name from path
            if (currentFolder.folder_path === sourceFolderPath) {
              // Remove document instantly from current folder
              removeDocumentInstantly({ nom_document: data.documentName, path: data.sourcePath });
            }
          }
          // Refresh folders in background
          fetchFolders();
          break;
        case 'create_folder':
        case 'remove_folder':
        case 'delete':
        case 'restore':
          // Refresh folders only - documents will be fetched when needed
          fetchFolders();
          break;
        case 'add':
          // For new documents, refresh folders and current folder documents if needed
          console.log('📄 New document added, refreshing current folder');
          fetchFolders();
          
          // If we have a current folder, refresh its documents and PDF cache
          if (currentFolder && currentFolder.folder_path) {
            console.log('🔄 Refreshing documents for folder:', currentFolder.folder_path);
            // Clear old cache and fetch new documents and PDFs
            clearPdfCacheForFolder(currentFolder.folder_path);
            setTimeout(async () => {
              try {
                await fetchDocuments();
                await fetchMultiplePdfs(currentFolder.folder_path);
              } catch (error) {
                console.error('Error refreshing documents for new document:', error);
              }
            }, 500); // Small delay to ensure document is processed
          }
          break;
        default:
      }
    });

    // Add listener for Electron move events
    const handleElectronMove = (event) => {
      console.log('🔄 === REACT: Received electronMove event ===');
      console.log('📦 Event detail:', event.detail);
      
      const { documentName, sourcePath, targetFolder, message } = event.detail;
      
      // Show notification about the move
      showSuccess(message || `Document "${documentName}" moved by Electron app`);
      
      // Instant move handling - remove document from source folder immediately
      if (documentName && sourcePath && currentFolder) {
        const sourceFolderPath = sourcePath.split('/').slice(-2, -1)[0]; // Get folder name from path
        if (currentFolder.folder_path === sourceFolderPath) {
          // Remove document instantly from current folder
          removeDocumentInstantly({ nom_document: documentName, path: sourcePath });
        }
      }
      
      // Refresh folders in background
      fetchFolders();
      
      // Clear any cached PDFs for affected folders
      if (sourcePath) {
        const sourceFolder = sourcePath.split('/').slice(0, -1).join('/');
        clearPdfCacheForFolder(sourceFolder);
      }
      if (targetFolder) {
        clearPdfCacheForFolder(targetFolder);
      }
    };

    // Add event listener for electronMove
    window.addEventListener('electronMove', handleElectronMove);

    return () => {
      socketInstance.off('connect');
      socketInstance.off('disconnect');
      socketInstance.off('fileSystemUpdate');
      window.removeEventListener('electronMove', handleElectronMove);
    };
  }, [fetchFolders, fetchDocuments]);

    const fetchData = async () => {
        await fetchUserId();
        await fetchFolders();
        await fetchAvailableFiltersData();
        // Nu mai facem fetchDocuments aici - se va face doar când se selectează un folder
    };

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    fetchData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []); // Remove dependencies to prevent re-runs

  // Handle folder parameter from URL (for navigation from SearchPage)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const folderParam = urlParams.get('folder');
    
    if (folderParam && folders.length > 0) {
      // console.log('📁 Navigating to folder from URL:', folderParam);
      
      // Find the folder by path
      const targetFolder = folders.find(folder => folder.folder_path === folderParam);
      
      if (targetFolder) {
        // console.log('✅ Found target folder:', targetFolder);
        setCurrentFolder(targetFolder);
        setCurrentPath(targetFolder.folder_path);
        
        // Clear the URL parameter after navigation
        const newUrl = new URL(window.location);
        newUrl.searchParams.delete('folder');
        window.history.replaceState({}, '', newUrl);
      } else {
        // console.log('❌ Folder not found:', folderParam);
      }
    }
  }, [folders.length]); // Only depend on folders.length to prevent excessive re-runs

  // Function to clear cache when documents change
  const clearPdfCacheForFolder = (folderPath) => {
    try {
      const storedCache = JSON.parse(localStorage.getItem('pdfCache') || '{}');
      if (storedCache[folderPath]) {
        delete storedCache[folderPath];
        localStorage.setItem('pdfCache', JSON.stringify(storedCache));
        
        // Clear in-memory cache only for this folder
        const newInMemoryCache = new Map(pdfCache);
        Object.keys(storedCache[folderPath] || {}).forEach(filename => {
          newInMemoryCache.delete(filename);
        });
        setPdfCache(newInMemoryCache);
        
        console.log('🗑️ Cleared PDF cache for folder:', folderPath);
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  // Optimized useEffect for folder navigation - fetch documents and PDFs for specific folder
  useEffect(() => {
    if (!currentFolder?.folder_path) {
      // Dacă nu avem folder selectat, nu afișăm niciun document
      setDocuments([]);
      return;
    }

    // console.log('🚀 Folder navigation effect triggered for:', currentFolder.folder_path);
    
    // Fetch documents and PDFs simultaneously for instant loading
    const loadFolderData = async () => {
      try {
        // Fetch documents and PDFs in parallel for instant loading
        const [documentsResult] = await Promise.all([
          fetchDocuments(),
          // Pre-load PDFs immediately without waiting for documents
          fetchMultiplePdfs(currentFolder.folder_path).catch(() => {
            // Ignore PDF errors - they'll be loaded when documents are ready
          })
        ]);
        
        // If we have documents, ensure PDFs are loaded
        if (documents.length > 0) {
          const hasCachedPdfs = loadCachedPdfs(currentFolder.folder_path);
          const missingPdfs = documents.filter(doc => !pdfCache.has(doc.nom_document));
          
          if (missingPdfs.length > 0 || !hasCachedPdfs) {
            // Load missing PDFs in background
            fetchMultiplePdfs(currentFolder.folder_path).catch(error => {
              console.error('Error loading PDFs:', error);
            });
          }
        }
      } catch (error) {
        console.error('Error in folder navigation effect:', error);
      }
    };

    loadFolderData();
  }, [currentFolder?.folder_path]); // Only depend on folder path

  // Optimized useEffect for Recycle Bin modal - only fetch deleted items when modal opens
  useEffect(() => {
    if (showRecycleBinModal) {
              fetchDeletedItems();
    }
  }, [showRecycleBinModal]);

  const handleNavigate = async (folder) => {
    try {
      // console.log('🚀 handleNavigate called for folder:', folder);
      
      // Update folder history first
      setFolderHistory(prev => [...prev, currentFolder]);
      
      // Set current folder immediately for instant UI response
      setCurrentFolder(folder);
      
      // Reset cache miss tracking for new folder
      if (window.cacheMissLogged) {
        window.cacheMissLogged.clear();
      }
      
      // Pre-load PDFs for adjacent folders in background for instant navigation
      if (folders && folders.length > 0) {
        // Find adjacent folders and pre-load their PDFs
        const findAdjacentFolders = (items, currentPath) => {
          const adjacent = [];
          for (const item of items) {
            if (item.folder_path && item.folder_path !== currentPath) {
              const pathDiff = Math.abs(item.folder_path.split('/').length - currentPath.split('/').length);
              if (pathDiff <= 1) { // Only pre-load immediate neighbors
                adjacent.push(item);
              }
            }
            if (item.children) {
              adjacent.push(...findAdjacentFolders(item.children, currentPath));
            }
          }
          return adjacent.slice(0, 3); // Limit to 3 adjacent folders
        };
        
        const adjacentFolders = findAdjacentFolders(folders, folder.folder_path);
        adjacentFolders.forEach(adjFolder => {
          // Pre-load PDFs in background without blocking
          fetchMultiplePdfs(adjFolder.folder_path).catch(() => {
            // Ignore errors for pre-loading
          });
        });
      }
      
      // Only refresh folder data if we don't have it already
      if (!folders || folders.length === 0) {
        fetch(`${backend}/post_docs/folders`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Origin': window.location.origin
          },
          mode: 'cors'
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch folders: ${response.status} ${response.statusText}`);
          }
          return response.json();
        })
        .then(data => {
          if (!data.success) {
            throw new Error(data.error || 'Failed to fetch folders');
          }

          // Find the current folder in the updated structure
          const findFolder = (items) => {
            for (const item of items) {
              if (item.folder_path === folder.folder_path) {
                return item;
              }
              if (item.type === 'folder' && item.children) {
                const found = findFolder(item.children);
                if (found) return found;
              }
            }
            return null;
          };

          const updatedFolder = findFolder(data.folders);
          
          // Update folders without triggering re-renders
          setFolders(data.folders);
          
          // Update current folder if we found a more complete version
          if (updatedFolder && updatedFolder !== folder) {
            setCurrentFolder(updatedFolder);
          }
        })
        .catch(error => {
          console.error('Error refreshing folder data:', error);
          // Don't show error to user for background operations
        });
      }
      
    } catch (error) {
      console.error('Error navigating to folder:', error);
      setError(error.message);
    }
  };

  const handleNavigateToRoot = async () => {
    // Navigate to root (all documents)
    setCurrentFolder(null);
    setFolderHistory([]);
    // fetchDocuments() se va face automat în useEffect când currentFolder devine null
  };

  const handleNavigateBack = async () => {
    if (folderHistory.length > 0) {
      const previousFolder = folderHistory[folderHistory.length - 1];
      
      // Verificăm dacă folderul anterior există și are proprietatea folder_path
      if (!previousFolder || !previousFolder.folder_path) {
        // Dacă folderul anterior nu există sau nu are path, mergem la root
        await handleNavigateToRoot();
        return;
      }

      // Verificăm dacă folderul anterior există în lista de foldere
      const folderExists = folders.some(folder => 
        folder && folder.folder_path && folder.folder_path === previousFolder.folder_path
      );
      
      if (!folderExists) {
        // Dacă folderul anterior nu există în lista de foldere, mergem la root
        setCurrentFolder(null);
        setFolderHistory([]);
        await fetchFolders();
        return;
      }

      setCurrentFolder(previousFolder);
      setFolderHistory(folderHistory.slice(0, -1));
      
      // Refresh the previous folder data when going back
      await fetchFolders();
      await fetchDocuments(true); // Skip PDF load to avoid duplicate calls
      
      // Also refresh the current folder's content
      try {
        const response = await fetch(`${backend}/post_docs/folders`, {
              credentials: 'include',
          headers: { 'Origin': window.location.origin }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch folders');
        }

        const data = await response.json();
        if (data.folders) {
          // Find the current folder in the updated structure
          const findFolder = (items, path) => {
            for (const item of items) {
              if (item && item.folder_path === path) return item;
              if (item && item.children) {
                const found = findFolder(item.children, path);
                if (found) return found;
              }
            }
            return null;
          };

          // Update the current folder with the latest data
          const updatedFolder = findFolder(data.folders, previousFolder.folder_path);
          if (updatedFolder) {
            setCurrentFolder(updatedFolder);
          }
        }
      } catch (error) {
        console.error('Error refreshing current folder:', error);
      }
    }
  };

  const sortDocuments = (docs) => {
    // Filter out invalid documents before sorting
    const validDocs = docs.filter(doc => doc && doc.nom_document);
    const sortedDocs = [...validDocs];
    const direction = sortDirection === 'asc' ? 1 : -1;

    switch (sortType) {
      case 'name':
        return sortedDocs.sort((a, b) => {
          // Additional safety check
          if (!a.nom_document || !b.nom_document) {
            console.warn('⚠️ Invalid document in sort:', { a, b });
            return 0;
          }
          return direction * a.nom_document.localeCompare(b.nom_document);
        });
      case 'date':
        return sortedDocs.sort((a, b) => 
          direction * (new Date(a.date_upload) - new Date(b.date_upload))
        );
      case 'size':
        return sortedDocs.sort((a, b) => 
          direction * ((a.file_size || 0) - (b.file_size || 0))
        );
      default:
        return sortedDocs;
    }
  };

  const filterAndSortDocuments = React.useCallback((docs) => {
    // Filter out invalid documents first
    let filteredDocs = [...docs].filter(doc => doc && doc.nom_document);
    
    // Apply content-based filter first if active
    if (isContentFilterActive && contentSearchResults.length > 0) {
      const resultIds = contentSearchResults.map(result => result.id_document);
      filteredDocs = filteredDocs.filter(doc => resultIds.includes(doc.id_document));
    }
    
    // Apply advanced filters if active
    if (isAdvancedFilterActive) {
      // Filter by tags
      if (advancedFilters.tags.length > 0) {
        filteredDocs = filteredDocs.filter(doc => {
          const docTags = doc.tags || [];
          return advancedFilters.tags.some(filterTag =>
            docTags.some(docTag => docTag.tag_name === filterTag)
          );
        });
      }
      
      // Filter by keywords
      if (advancedFilters.keywords.length > 0) {
        filteredDocs = filteredDocs.filter(doc => {
          const docKeywords = [
            doc.mot1,
            doc.mot2,
            doc.mot3,
            doc.mot4,
            doc.mot5
          ].filter(Boolean).map(k => k.toLowerCase());
          
          return advancedFilters.keywords.some(filterKeyword =>
            docKeywords.some(keyword => keyword.includes(filterKeyword.toLowerCase()))
          );
        });
      }
      
      // Filter by date range
      if (advancedFilters.dateRange.start || advancedFilters.dateRange.end) {
        filteredDocs = filteredDocs.filter(doc => {
          const docDate = new Date(doc.date_upload);
          const startDate = advancedFilters.dateRange.start ? new Date(advancedFilters.dateRange.start) : null;
          const endDate = advancedFilters.dateRange.end ? new Date(advancedFilters.dateRange.end) : null;
          
          if (startDate && endDate) {
            return docDate >= startDate && docDate <= endDate;
          } else if (startDate) {
            return docDate >= startDate;
          } else if (endDate) {
            return docDate <= endDate;
          }
          return true;
        });
      }
      
      // Filter by document type
      if (advancedFilters.documentType) {
        filteredDocs = filteredDocs.filter(doc => {
          return doc.type && doc.type.toLowerCase() === advancedFilters.documentType.toLowerCase();
        });
      }
    }
    
    // Apply traditional search filters
    if (searchMode === 'id' && searchQuery) {
      filteredDocs = filteredDocs.filter(doc =>
        doc.id_document && doc.id_document.toString().includes(searchQuery)
      );
    } else if (searchMode === 'title' && searchQuery) {
      filteredDocs = filteredDocs.filter(doc => 
        doc.nom_document.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return sortDocuments(filteredDocs);
  }, [isContentFilterActive, contentSearchResults, isAdvancedFilterActive, advancedFilters, searchMode, searchQuery]);

  const getCurrentItems = useMemo(() => {
    // If we're at root level (no current folder)
    if (!currentFolder) {
      // Show only top-level folders
      const rootFolders = folders.filter(folder => {
        const pathParts = folder.folder_path.split('/');
        return pathParts.length === 2; // Only folders directly under institution
      });
      
      return rootFolders.map(folder => ({
        ...folder,
        type: 'folder',
        name: folder.folder_name,
        path: folder.folder_path,
        uniqueId: `folder-${folder.id}`
      }));
    }

    // Get subfolders of current folder
    const subfolders = folders.filter(folder => {
      const folderPath = folder.folder_path;
      const currentPath = currentFolder.folder_path;
      return folderPath.startsWith(currentPath + '/') && 
             folderPath.split('/').length === currentPath.split('/').length + 1;
    });

    // Get documents in current folder, excluding those in recycle bin
    const currentDocuments = documents.filter(doc => {
      const docPath = doc.path;
      const currentPath = currentFolder.folder_path;
      return docPath === currentPath && doc.is_deleted !== 1 && doc.is_deleted !== true;
    });

    // Filter and sort documents
    const filteredAndSortedDocuments = filterAndSortDocuments(currentDocuments);

    const allItems = [
      ...subfolders.map(folder => ({
        ...folder,
        type: 'folder',
        name: folder.folder_name,
        path: folder.folder_path,
        uniqueId: `folder-${folder.id}`
      })),
      ...filteredAndSortedDocuments.map(doc => ({
        ...doc,
        type: 'file',
        name: doc.nom_document,
        path: doc.path,
        id: doc.id_document,
        uniqueId: `file-${doc.id_document}`
      }))
    ];

    return allItems;
  }, [currentFolder?.folder_path, folders, documents, searchQuery, searchMode, selectedKeywords, isContentFilterActive, isAdvancedFilterActive, advancedFilters, contentSearchResults]);

  // New function to get paginated items - Only for documents
  const getPaginatedItems = () => {
    const allItems = getCurrentItems;
    const documentsOnly = allItems.filter(item => item.type === 'file');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return documentsOnly.slice(startIndex, endIndex);
  };

  // Function to get total pages - Only for documents
  const getTotalPages = () => {
    const allItems = getCurrentItems;
    const documentsOnly = allItems.filter(item => item.type === 'file');
    return Math.ceil(documentsOnly.length / itemsPerPage);
  };

  // Reset page when folder changes or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [currentFolder, searchQuery, isAdvancedFilterActive, isContentFilterActive]);

  // Add this function to help with debugging
  useEffect(() => {
  }, [currentFolder, folders, documents]);

  const getCurrentPath = () => {
    if (!currentFolder) {
      return 'Root';
    }
    return currentFolder.folder_path || 'Root';
  };

  const handleDragStart = (e, item) => {
    if (item.type !== 'file') return;
    
    e.stopPropagation();
    setIsDragging(true);
    setDraggedItem(item);
    
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

  const handleDrag = (e) => {
    if (!isDragging || !draggedItem) return;
    
    e.preventDefault();
  };

  const handleDragEnd = (e) => {
    if (!isDragging || !draggedItem) return;
    
    e.preventDefault();
    setIsDragging(false);
    setDraggedItem(null);
    
    // Remove drag image
    const dragImages = document.querySelectorAll('.drag-image');
    dragImages.forEach(img => img.remove());
    
    // Reset visual feedback
    const draggedElement = e.currentTarget;
    draggedElement.style.opacity = '1';
  };

  const handleDragOver = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    if (item.type === 'folder') {
      e.currentTarget.classList.add('bg-blue-50');
    }
  };

  const handleDragLeave = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    if (item.type === 'folder') {
      e.currentTarget.classList.remove('bg-blue-50');
    }
  };

  const showMoveNotification = (message, type = 'success') => {
    setMoveToastMessage(message);
    setMoveToastType(type);
    setShowMoveToast(true);
    setTimeout(() => setShowMoveToast(false), 3000);
  };

  const handleDrop = async (e, targetFolder) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem || draggedItem.type !== 'file') return;
    
    try {
      // Get the source folder path and file name
      const sourceFolderPath = draggedItem.path;
      const fileName = draggedItem.nom_document;

   

      // Check if trying to move file to its current location
      if (sourceFolderPath === targetFolder.folder_path) {
        setError('Cannot move file to its current location');
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Construct the full source path
      const fullSourcePath = `${sourceFolderPath}/${fileName}`;

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
        showMoveNotification(`File moved to "${destinationFolderName}"`);

        // Refresh folders only - documents will be fetched when needed
        await fetchFolders();

        // Update current folder if we're in source or destination folder
        if (currentFolder) {
          const isInSourceFolder = currentFolder.folder_path === sourceFolderPath;
          const isInDestinationFolder = currentFolder.folder_path === targetFolder.folder_path;

          if (isInSourceFolder || isInDestinationFolder) {
            // Refresh the current folder's content
            try {
              const response = await fetch(`${backend}/post_docs/folders`, {
                credentials: 'include',
                headers: { 'Origin': window.location.origin }
              });

              if (!response.ok) {
                throw new Error('Failed to fetch folders');
              }

              const data = await response.json();
              if (data.folders) {
                // Find the current folder in the updated structure
                const findFolder = (items, path) => {
                  for (const item of items) {
                    if (item.folder_path === path) return item;
                    if (item.children) {
                      const found = findFolder(item.children, path);
                      if (found) return found;
                    }
                  }
                  return null;
                };

                // Update the current folder with the latest data
                const updatedFolder = findFolder(data.folders, currentFolder.folder_path);
                if (updatedFolder) {
                  setCurrentFolder(updatedFolder);
                }
              }
            } catch (error) {
              console.error('Error refreshing current folder:', error);
            }
          }
        }
        } else {
        showMoveNotification(data.error || 'Failed to move file', 'error');
      }
    } catch (error) {
      console.error('Error moving file:', error);
      showMoveNotification('Failed to move file: ' + error.message, 'error');
    }
  };

  // Add debouncing to prevent multiple calls
  const fetchMultiplePdfsRef = useRef({});

  // Function to force refresh PDF for a specific document
  const forceRefreshPdfForDocument = async (documentName, folderPath) => {
    try {
      console.log('🔄 Force refreshing PDF for document:', documentName, 'in folder:', folderPath);
      
      // Remove the specific document from cache
      const newCache = new Map(pdfCache);
      newCache.delete(documentName);
      setPdfCache(newCache);
      
      // Fetch the specific PDF
      const response = await fetch(`${backend}/post_docs/diffuse/batch-view/${encodeURIComponent(folderPath)}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch PDF');
      }

      // Update cache with new PDF data
      if (data.pdfs && data.pdfs[documentName]) {
        updatePdfCache(folderPath, { [documentName]: data.pdfs[documentName] });
        console.log('✅ Force refreshed PDF for document:', documentName);
      }
    } catch (error) {
      console.error('Error force refreshing PDF for document:', error);
    }
  };

  const fetchMultiplePdfs = async (folderPath) => {
    try {
      // Check if already fetching this folder
      if (fetchMultiplePdfsRef.current[folderPath]) {
        return;
      }
      
      fetchMultiplePdfsRef.current[folderPath] = true;
      
      // Quick cache check for instant loading
      if (loadCachedPdfs(folderPath)) {
        return pdfCache;
      }

      // Fast fetch without extra checks for instant loading
      const response = await fetch(`${backend}/post_docs/diffuse/batch-view/${encodeURIComponent(folderPath)}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch PDFs: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch PDFs');
      }
      
      // Update cache immediately for instant access
      updatePdfCache(folderPath, data.pdfs);
      
      return data.pdfs;
    } catch (error) {
      console.error('Error fetching PDFs:', error);
      throw error;
    } finally {
      fetchMultiplePdfsRef.current[folderPath] = false;
    }
  };

  const handleFileClick = async (e, file) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent multiple clicks
    if (showPdfModal) {
      return;
    }
    
    try {
      console.log('🖱️ File clicked:', file.nom_document, 'Path:', file.path);
      
      // Check if this file has search results and set target page
      let targetPage = 1;
      if (searchResultsMapping[file.nom_document] && searchResultsMapping[file.nom_document].length > 0) {
        // Sort matches by page number to get the first occurrence
        const sortedMatches = searchResultsMapping[file.nom_document].sort((a, b) => (a.page || 1) - (b.page || 1));
        const firstMatch = sortedMatches[0];
        if (firstMatch.page && firstMatch.page > 0) {
          targetPage = firstMatch.page;
          console.log('🎯 Document has search results, navigating to page:', targetPage, 'from matches:', sortedMatches);
        }
      }
      
      // Set the selected file and target page
    setSelectedFile(file);
      setTargetPageNumber(targetPage);
      setPageNumber(targetPage);
      
      // Pre-load document details before opening modal
      try {
        console.log('🔄 Pre-loading document details for:', file.nom_document);
        const detailsResponse = await fetch(
          `${backend}/post_docs/details/${encodeURIComponent(file.nom_document)}`,
          {
            credentials: 'include',
            headers: { 'Origin': window.location.origin }
          }
        );
        
        if (detailsResponse.ok) {
          const data = await detailsResponse.json();
          if (data.success) {
            console.log('✅ Document details pre-loaded successfully');
            // Store pre-loaded details for modal
            setPreloadedDocDetails(data.document);
          }
        }
      } catch (error) {
        console.error('Error pre-loading document details:', error);
      }
      
      // Open modal after pre-loading
    setShowPdfModal(true);
      
      console.log('🎯 File click complete - state set:', {
        selectedFile: file.nom_document,
        targetPageNumber: targetPage,
        pageNumber: targetPage,
        showPdfModal: true
      });
      
      // Log document view
      await fetch(`${backend}/document_log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nom_doc: file.nom_document }),
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error opening PDF:', error);
      showError('Error', 'Failed to open PDF document');
    }
  };

  const handleSettingsClick = (e, file) => {
    e.stopPropagation();
    setShowSettingsMenu(showSettingsMenu === file.id_document ? null : file.id_document);
    setSelectedFile(file);
  };

  // New: Handle folder settings click
  const handleFolderSettingsClick = (e, folder) => {
    e.stopPropagation();
    setShowSettingsMenu(`folder-${folder.id}`);
  };

  const handleRenameClick = (file) => {
    if (!file || !file.nom_document) {
      console.error('Invalid file or missing nom_document property');
      return;
    }
    
    setSelectedFile(file);
    setNewFileName(file.nom_document.replace('.pdf', ''));
    setShowRenameModal(true);
  };

  // New: Handle folder rename click
  const handleFolderRenameClick = (e, folder) => {
    e.stopPropagation();
    setSelectedFolder(folder);
    setShowRenameModal(true);
  };

  const handleRename = async () => {
    if (!selectedFile || !newFileName) return;

    try {
      const response = await fetch(`${backend}/post_docs/files/rename`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oldPath: selectedFile.path,
          newName: newFileName + '.pdf'
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to rename file');
      }

      const data = await response.json();
      if (data.success) {
        // Update the local state
        setFolders(folders.map(file => 
          file.id_document === selectedFile.id_document 
            ? { ...file, nom_document: newFileName + '.pdf' }
            : file
        ));
        
        // Clear cache for the folder since document name changed
        clearPdfCacheForFolder(selectedFile.path);
        
        setShowRenameModal(false);
        setNewFileName('');
        setSelectedFile(null);
          } else {
        throw new Error(data.error || 'Failed to rename file');
      }
    } catch (error) {
      console.error('Error renaming file:', error);
      setError(error.message);
    }
  };

  // New: Handle folder rename submission
  const handleFolderRename = async () => {
    if (!selectedFolder || !newFolderName || newFolderName.trim() === '') return;

    try {
    

      // Use the fixed rename endpoint
      const response = await fetch(`${backend}/post_docs/folders/rename`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oldPath: selectedFolder.folder_path,
          newName: newFolderName.trim()
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rename folder');
      }

      const data = await response.json();
      if (data.success) {
        // Update the local state
        await fetchFolders();
        await fetchDocuments();
        
        // Show success notification
        showMoveNotification(`Folder renamed to "${newFolderName}"`);
        
        // Reset state
        setShowFolderRenameModal(false);
        setNewFolderName('');
        setSelectedFolder(null);
        setShowSettingsMenu(null);
      } else {
        throw new Error(data.error || 'Failed to rename folder');
      }
    } catch (error) {
      console.error('Error renaming folder:', error);
      setError(error.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteClick = (file) => {
    setFileToDelete(file);
    setShowDeleteConfirmModal(true);
    setShowDeleteModal(false);
  };

  // New: Handle folder delete click
  const handleFolderDeleteClick = (folder) => {
    setFolderToDelete(folder);
    setShowFolderContentsModal(true);
    setShowSettingsMenu(null);
  };

  const handleFolderMoveClick = (folder) => {
    console.log('Folder move clicked:', folder);
    setSelectedFolder(folder);
    setShowFolderMoveModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;

    try {
      // Verificăm dacă fișierul este PDF
      if (!fileToDelete.nom_document.toLowerCase().endsWith('.pdf')) {
        setError('Only PDF files can be deleted');
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Construim path-ul complet al fișierului
      const fullPath = `${fileToDelete.path}/${fileToDelete.nom_document}`;
      
 

      const response = await fetch(`${backend}/post_docs/files/${encodeURIComponent(fullPath)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Check if it's a foreign key constraint error
        if (errorData.error && errorData.error.includes('foreign key constraint')) {
          throw new Error('This document has versions or is referenced by other data. Please contact an administrator to handle this properly.');
        }
        
        throw new Error(errorData.error || 'Failed to delete file');
      }

      const result = await response.json();
      if (result.success) {
        // Update local state instantly for smooth UX (no flicker)
        removeDocumentInstantly(fileToDelete);

        // Clear cache for the folder since document was deleted
        clearPdfCacheForFolder(fileToDelete.path);

        // Show success notification
        showMoveNotification('File moved to recycle bin');
        
        // Reset modal states
        setShowDeleteConfirmModal(false);
        setFileToDelete(null);
        
        // Refresh deleted files list in background (no UI impact)
        fetchDeletedItems();
      } else {
        setError(result.error || 'Failed to delete file');
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      setError(error.message || 'Failed to delete file');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleMoveFile = async (sourcePath, destinationPath) => {
    try {
      
        // Check if we're trying to move to the same folder
      const sourceFolderPath = path.dirname(sourcePath);
      
        
        // Check if paths are identical
      if (sourceFolderPath === destinationPath) {
        setError('Cannot move file to its current location');
        return;
      }

        // First, notify Electron about the move
        if (window.electron) {
            window.electron.send('move-document', {
                sourcePath,
                destinationPath,
                documentId: selectedFile.id_document
            });
        }

        // Emit socket event for the move
        if (socket && socket.connected) {
            const eventData = {
                type: 'move',
                sourcePath,
                targetFolder: destinationPath,
                documentId: selectedFile.id_document,
                timestamp: new Date().toISOString()
            };
            console.log('Event data:', eventData);
            
            socket.emit('fileSystemChange', eventData, (response) => {
                console.log('Server response:', response);
                if (!response || !response.success) {
                    console.error('Server rejected file system change:', response);
                    setError('Failed to update file system');
                }
            });
        } else {
            console.error('Socket not connected or not initialized');
            setError('Connection lost. Please refresh the page.');
      }

      const response = await fetch(`${backend}/post_docs/files/move`, {
        method: 'POST',
            credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourcePath,
          destinationPath
        }),
          });

          if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to move file');
          }

          const data = await response.json();
        console.log('Move response:', data);

        // Show success message
        setSuccess('File moved successfully');
        
        // Refresh the current view
        await fetchFolders();
        await fetchDocuments();

    } catch (error) {
      console.error('Error moving file:', error);
        setError(error.message || 'Failed to move file');
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const closePdfModal = () => {
    setShowPdfModal(false);
    setTargetPageNumber(null);
    
    // Clear any highlighting styles
    setTimeout(() => {
      const highlightedElements = document.querySelectorAll('.pdf-highlight, .pdf-highlight-active, .pdf-ocr-highlight, .pdf-ocr-highlight-active');
      highlightedElements.forEach(element => {
        element.classList.remove('pdf-highlight', 'pdf-highlight-active');
        if (element.classList.contains('pdf-ocr-highlight')) {
          element.remove();
        }
      });
    }, 100);
  };

  const downloaddoc = async (fileName) => {
    try {
      const currentPath = getCurrentPath();
      
      // Show loading toast
      antMessage.loading({
        content: 'Se descarcă documentul...',
        key: 'download',
        duration: 0
      });
      
      // Download using the view endpoint with correct path format
      const response = await fetch(`${backend}/post_docs/diffuse/view/${encodeURIComponent(currentPath)}/${encodeURIComponent(fileName)}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      
      // Append to body, click and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      window.URL.revokeObjectURL(url);

      // Show success toast
      antMessage.success({
        content: 'Document descărcat cu succes!',
        key: 'download',
        duration: 2
      });
    } catch (error) {
      console.error('Download error:', error);
      // Show error toast
      antMessage.error({
        content: 'Nu s-a putut descărca documentul. Vă rugăm să încercați din nou.',
        key: 'download',
        duration: 3
      });
    }
  };

  const handleRestore = async (item, destinationPath) => {
    // Close modal immediately to prevent UI blocking
    setShowRestoreModal(false);
    setSelectedDeletedItem(null);
    setRestoreModalCurrentFolder(null);
    setRestoreModalFolderHistory([]);
    
    try {
      console.log('Starting restore process:', {
        itemId: item.id,
        itemType: item.type,
        itemName: item.name,
        oldPath: item.path,
        destinationPath: destinationPath
      });

      // First, restore the item from recycle bin with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout
      
      let response;
      try {
        response = await fetch(`${backend}/post_docs/recycle-bin/restore/${item.type}/${item.id}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          destinationPath,
          fileName: item.name,
          isFile: item.type === 'file',
          oldPath: item.path
          }),
          signal: controller.signal
      });
        
        clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Restore from recycle bin failed:', error);
        throw new Error(error.error || 'Failed to restore item');
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Operation timed out - please try again');
        }
        throw fetchError;
      }

      const result = await response.json();
      console.log('Restore from recycle bin response:', result);

      if (result.success) {
        // If it's a document, update its path in table_document
        if (item.type === 'file') {
          // Construct the full source path
          const fullSourcePath = `${item.path}/${item.name}`;

          // First, notify Electron about the move
          if (window.electron) {
            console.log('Notifying Electron about file move:', {
              sourcePath: fullSourcePath,
              destinationPath,
              documentId: item.id,
              documentName: item.name
            });

            window.electron.send('move-document', {
              sourcePath: fullSourcePath,
              destinationPath,
              documentId: item.id,
              documentName: item.name,
              isRestore: true
            });
          }

          // Emit socket event for the move
          if (socket && socket.connected) {
            console.log('Emitting socket event for document move');
            const eventData = {
              type: 'move',
              sourcePath: fullSourcePath,
              targetFolder: destinationPath,
              documentId: item.id,
              documentName: item.name,
              isRestore: true,
              timestamp: new Date().toISOString()
            };
            socket.emit('fileSystemChange', eventData);
          }

          // Only move the file if it's not already in the destination
          if (item.path !== destinationPath) {
            const moveController = new AbortController();
            const moveTimeoutId = setTimeout(() => moveController.abort(), 10000); // 10 seconds timeout for move
            
            try {
          const moveResponse = await fetch(`${backend}/post_docs/files/move`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sourcePath: fullSourcePath,
              destinationPath
                }),
                signal: moveController.signal
          });
              
              clearTimeout(moveTimeoutId);

          if (!moveResponse.ok) {
            const moveError = await moveResponse.json();
            console.error('Failed to move file:', {
              status: moveResponse.status,
              statusText: moveResponse.statusText,
              error: moveError
            });
                // Don't throw error for move, just log it since restore was successful
                console.warn('Move operation failed but restore was successful:', moveError);
              } else {
          const moveResult = await moveResponse.json();
          console.log('File move response:', moveResult);
              }
            } catch (moveError) {
              clearTimeout(moveTimeoutId);
              if (moveError.name === 'AbortError') {
                console.warn('Move operation timed out but restore was successful');
              } else {
                console.warn('Move operation failed but restore was successful:', moveError);
              }
            }
          } else {
            console.log('File already in destination, no move needed');
          }
        } else if (item.type === 'folder') {
          // Emit socket event for the folder move
          if (socket && socket.connected) {
            console.log('Emitting socket event for folder move');
            const eventData = {
              type: 'move',
              sourcePath: item.path,
              targetFolder: destinationPath,
              folderId: item.id,
              folderName: item.name,
              isRestore: true,
              timestamp: new Date().toISOString()
            };
            socket.emit('fileSystemChange', eventData);
          }

          // Only move the folder if it's not already in the destination
          if (item.path !== destinationPath) {
            const folderMoveController = new AbortController();
            const folderMoveTimeoutId = setTimeout(() => folderMoveController.abort(), 10000); // 10 seconds timeout for folder move
            
            try {
          const moveResponse = await fetch(`${backend}/post_docs/folders/move`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sourcePath: item.path,
              destinationPath
                }),
                signal: folderMoveController.signal
          });
              
              clearTimeout(folderMoveTimeoutId);

          if (!moveResponse.ok) {
            const moveError = await moveResponse.json();
            console.error('Failed to move folder:', {
              status: moveResponse.status,
              statusText: moveResponse.statusText,
              error: moveError
            });
                // Don't throw error for move, just log it since restore was successful
                console.warn('Move operation failed but restore was successful:', moveError);
              } else {
          const moveResult = await moveResponse.json();
          console.log('Folder move response:', moveResult);
              }
            } catch (moveError) {
              clearTimeout(folderMoveTimeoutId);
              if (moveError.name === 'AbortError') {
                console.warn('Folder move operation timed out but restore was successful');
              } else {
                console.warn('Folder move operation failed but restore was successful:', moveError);
              }
            }
          } else {
            console.log('Folder already in destination, no move needed');
          }
        }

        showSuccess('Item restored successfully');
        
        // Add document back to current folder instantly if it matches
        if (currentFolder && currentFolder.folder_path === destinationPath) {
          addDocumentInstantly(item);
        }
        
        // Refresh data in background
        Promise.all([
          fetchDeletedItems(),
          fetchFolders(),
          fetchDocuments(true) // Skip PDF load to avoid duplicate calls
        ]).catch(error => {
          console.error('Background refresh error:', error);
        });
      } else {
        throw new Error(result.error || 'Failed to restore item');
      }
    } catch (error) {
      console.error('Error in restore process:', error);
      
      // Handle timeout specifically
      if (error.message === 'Operation timed out') {
        showError('Timeout', 'Restore operation took too long. Please try again.');
      } else {
      showError('Error', error.message);
      }
      
      // Reopen modal on error so user can try again
      setShowRestoreModal(true);
      setSelectedDeletedItem(item);
    }
  };

  const handlePermanentDeleteClick = (item) => {
    console.log('Permanent delete clicked for item:', item);
    setSelectedDeletedItem(item);
    setShowPermanentDeleteModal(true);
  };

  const handlePermanentDelete = async (item) => {
    try {
      console.log('Attempting to permanently delete item:', item);
      const response = await fetch(`${backend}/post_docs/recycle-bin/${item.type}/${item.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete item');
      }

      const result = await response.json();
      if (result.success) {
        showSuccess('Element șters permanent');
        setShowPermanentDeleteModal(false);
        setSelectedDeletedItem(null);
        
        // Refresh deleted items list in background (no UI impact)
        fetchDeletedItems();
      } else {
        throw new Error(result.error || 'Failed to delete item');
      }
    } catch (error) {
      console.error('Error permanently deleting item:', error);
      showError('Eroare', error.message);
    }
  };

  const handleStartSyncAgent = async () => {
    try {
      const response = await fetch(`${backend}/api/start-sync-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        showMoveNotification('Sync Agent started successfully');
      } else if (data.error === 'Sync agent is already running') {
        showMoveNotification(
          'Sync Agent is already running. Please check your dock for the Electron icon.',
          'info'
        );
      } else {
        showMoveNotification('Sync Agent: ' + (data.error || 'Failed to start Sync Agent'), 'error');
      }
    } catch (error) {
      console.error('Error starting Sync Agent:', error);
      showMoveNotification('Error starting Sync Agent', 'error');
    }
  };

  // Clean up object URLs when component unmounts
  useEffect(() => {
      return () => {
      pdfCache.forEach(url => URL.revokeObjectURL(url));
    };
  }, [pdfCache]);

  // Add cleanup on component unmount
    useEffect(() => {
    return () => {
      // Clear in-memory cache when component unmounts
      setPdfCache(new Map());
    };
  }, []);

  // Add keyboard shortcuts for modal management
    useEffect(() => {
    const handleKeyDown = (e) => {
      // ESC key to close modals
      if (e.key === 'Escape') {
        if (showRestoreModal) {
          setShowRestoreModal(false);
          setSelectedDeletedItem(null);
          setRestoreModalCurrentFolder(null);
          setRestoreModalFolderHistory([]);
        }
        if (showPermanentDeleteModal) {
          setShowPermanentDeleteModal(false);
          setSelectedDeletedItem(null);
        }
        if (showCreateFolderModal) {
          setShowCreateFolderModal(false);
        }
        if (showFolderRenameModal) {
          setShowFolderRenameModal(false);
          setNewFolderName('');
        }
        if (showRecycleBinModal) {
          setShowRecycleBinModal(false);
        }
      }
      
      // Ctrl+Q to force close all modals
      if (e.ctrlKey && e.key === 'q') {
        setShowRestoreModal(false);
        setShowPermanentDeleteModal(false);
        setShowCreateFolderModal(false);
        setShowFolderRenameModal(false);
        setShowRecycleBinModal(false);
        setSelectedDeletedItem(null);
        setRestoreModalCurrentFolder(null);
        setRestoreModalFolderHistory([]);
        setNewFolderName('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showRestoreModal, showPermanentDeleteModal, showCreateFolderModal, showFolderRenameModal, showRecycleBinModal]);

  return (
    <div className="min-h-screen">
      {/* Modern Sidebar for Folder Management */}
      <FolderSidebar
        currentPath={currentPath}
        folders={folders}
        currentFolder={currentFolder}
        draggedItem={draggedItem}
        isDragging={isDragging}
        onRefreshFolders={fetchFolders}
        onRefreshDocuments={fetchDocuments}
        onFolderSelect={async (folder) => {
          if (!folder || folder.name === 'Root') {
            // Navigate to root (all documents)
            setCurrentFolder(null);
            setCurrentPath('');
            setFolderHistory([]);
          } else {
            // Navigate to specific folder
            setCurrentFolder(folder);
            setCurrentPath(folder.folder_path || folder.name);
            // Add to history
            setFolderHistory(prev => [...prev, folder]);
          }
          // fetchDocuments() se va face automat în useEffect când se schimbă currentFolder
        }}
        onNewFolder={() => setShowCreateFolderModal(true)}
        onDeleteFolder={(folder) => {
          setFolderToDelete(folder);
          setShowFolderDeleteConfirmModal(true);
        }}
        onRenameFolder={(folder) => {
          setSelectedFolder(folder);
          setNewFolderName(folder.folder_name || folder.name);
          setShowFolderRenameModal(true);
        }}
        onTogglePrivate={(folder) => {
          // Toggle private status
          const updatedFolder = { ...folder, is_private: !folder.is_private };
          // Update local state immediately
          setFolders(prevFolders => {
            if (!prevFolders) return [];
            
            const updateFolders = (items) => {
              if (!items) return [];
              
              return items.map(f => {
                if (f.id === folder.id) {
                  return updatedFolder;
                }
                if (f.children) {
                  return {
                    ...f,
                    children: updateFolders(f.children)
                  };
                }
                return f;
              });
            };
            return updateFolders(prevFolders);
          });
          
          // Show notification
          showMoveNotification(`Folder is now ${updatedFolder.is_private ? 'private' : 'public'}`);
        }}
        onNavigateToRecycleBin={() => setShowRecycleBinModal(true)}
        onMoveFolder={handleMoveFolder}
        showSuccess={showSuccess}
        showError={showError}
      />

      {error && (
        <div className="mb-4 mx-6 p-3 bg-red-100 text-red-700 rounded-md shadow-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      ) : (
        <div className="px-8 py-12 ml-80 relative" style={{ maxWidth: 'calc(100vw - 20rem)' }}>
          {/* Documents Section - Only show when inside a folder */}
          {currentFolder && (
            <div className="mt-4">
              {/* Documents Tab Header */}
              <div className="relative max-w-full mx-auto">
                {/* Ultra Modern Tab for Documents - Same as Navbar */}
                <div className="relative overflow-hidden rounded-t-3xl" 
                     style={{
                       background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #2563eb 100%)',
                       boxShadow: '0 20px 40px -12px rgba(59, 130, 246, 0.4)'
                     }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/5"></div>
                  <div className="absolute inset-0 opacity-40" 
                       style={{
                         background: 'radial-gradient(circle at 30% 70%, rgba(59, 130, 246, 0.3) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(37, 99, 235, 0.2) 0%, transparent 50%)'
                       }}></div>
                  <div className="absolute inset-0 backdrop-blur-sm"></div>
                  <div className="relative px-12 py-8">
                    <div className="flex justify-between items-center">
                      {/* Left: Document Icon + Title + Search */}
                      <div className="flex items-center space-x-6">
        <motion.div 
                          whileHover={{ scale: 1.05, rotate: -3 }}
                          className="flex items-center justify-center w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg"
                        >
                          <FaFileAlt className="w-7 h-7 text-white" />
        </motion.div>
                  
                        <div className="flex items-center space-x-6">
                          <h2 className="text-3xl font-bold text-white drop-shadow-lg">Documents</h2>
                          
                          {/* Search Input - Moved here */}
                <div className="relative">
                            <div className="relative flex items-center">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={handleKeywordSearch}
                                onFocus={() => false}
                        placeholder={searchMode === 'title' ? "Search by title..." : "Search by ID..."}
                                className="pl-14 pr-12 py-4 text-base bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl focus:outline-none focus:border-white/50 focus:bg-white/30 transition-all duration-200 w-96 text-white placeholder-white/70 shadow-lg"
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                                <FaSearch className="text-white/70 w-3 h-3" />
                        <motion.button
                                  whileHover={{ scale: 1.1, rotate: 5 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setSearchMode(searchMode === 'title' ? 'id' : 'title');
                            setSearchQuery('');
                            setSelectedKeywords([]);
                            setIsKeywordDropdownOpen(false);
                          }}
                                  className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors duration-200"
                        >
        <motion.div 
                            animate={{ 
                              rotate: searchMode === 'id' ? 180 : 0,
                                      scale: [1, 1.1, 1]
                            }}
                            transition={{ 
                              duration: 0.3,
                              ease: "easeInOut"
                            }}
                          >
                                    <FaExchangeAlt className="text-white w-2 h-2" />
                          </motion.div>
                        </motion.button>
                      </div>
                      {searchQuery && (
          <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          onClick={() => {
                            setSearchQuery('');
                            setIsKeywordDropdownOpen(false);
                          }}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white transition-colors duration-200"
                        >
                          <FaTimes className="w-3 h-3" />
                        </motion.button>
                      )}
                    </div>

                            {searchQuery && (
                <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute -bottom-8 left-0 px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-lg border border-white/30 text-xs font-medium"
                              >
                                🔍 Results for "{searchQuery}"
                              </motion.div>
                            )}
              </div>
            </div>
      </div>

                      {/* Right: Compact Toolbar */}
                      <div className="flex items-center gap-2">
                        {/* Advanced Filter */}
                        <motion.button
                        whileHover={{ 
                            scale: 1.02, 
                            y: -2,
                            boxShadow: "0 12px 24px -8px rgba(255,255,255,0.3)"
                          }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setShowAdvancedFilterModal(true);
                            fetchAvailableFiltersData();
                          }}
                          className={`relative flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden ${
                            isAdvancedFilterActive
                              ? 'text-white'
                              : 'text-white'
                          } border border-white/20`}
                          style={{
                            background: isAdvancedFilterActive 
                              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                              : 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 100%)',
                            backdropFilter: 'blur(16px)',
                            boxShadow: isAdvancedFilterActive
                              ? '0 8px 32px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255,255,255,0.3)'
                              : '0 4px 16px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.3)'
                          }}
                        >
                          <FaCog className="w-3 h-3" />
                          <span>Filter</span>
                          {isAdvancedFilterActive && (
                            <span className="bg-white text-emerald-600 rounded-full text-xs font-bold px-1.5 py-0.5 min-w-[16px] text-center">
                              ✓
                            </span>
                          )}
                        </motion.button>
                        
                        {/* Metadata */}
                        <motion.button
                          whileHover={{ 
                            scale: 1.02, 
                            y: -2,
                            boxShadow: "0 12px 24px -8px rgba(255,255,255,0.3)"
                          }}
                          whileTap={{ scale: 0.98 }}
                        onClick={() => setShowContentSearchModal(true)}
                          className={`relative flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden ${
                          isContentFilterActive
                              ? 'text-white'
                              : 'text-white'
                          } border border-white/20`}
                          style={{
                            background: isContentFilterActive 
                              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                              : 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 100%)',
                            backdropFilter: 'blur(16px)',
                            boxShadow: isContentFilterActive
                              ? '0 8px 32px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255,255,255,0.3)'
                              : '0 4px 16px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.3)'
                          }}
                        >
                          <span>🔍</span>
                          <span>Metadata</span>
                          {isContentFilterActive && (
                            <span className="bg-white text-emerald-600 rounded-full text-xs font-bold px-1.5 py-0.5 min-w-[16px] text-center">
                              {contentSearchResults.length}
                            </span>
                          )}
                            </motion.button>
                        
                        {/* Sort Type */}
                <div className="relative">
                  <motion.button
                    ref={sortButtonRef}
                    whileHover={{ 
                      scale: 1.02, 
                      y: -2,
                      boxShadow: "0 12px 24px -8px rgba(255,255,255,0.3)"
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (!showSortDropdown && sortButtonRef.current) {
                        const rect = sortButtonRef.current.getBoundingClientRect();
                        setDropdownPosition({
                          top: rect.bottom + 8,
                          right: window.innerWidth - rect.right
                        });
                      }
                      setShowSortDropdown(!showSortDropdown);
                    }}
                    className="relative flex items-center gap-2 px-4 py-3 rounded-xl border border-white/20 text-white text-sm font-medium transition-all duration-300 overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 100%)',
                      backdropFilter: 'blur(16px)',
                      boxShadow: '0 4px 16px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.3)'
                    }}
                  >
                            <span>
                              {sortType === 'name' ? '📝' : sortType === 'date' ? '📅' : '📊'}
                    </span>
                            <FaChevronDown className="w-2 h-2" />
                  </motion.button>

                  <AnimatePresence>
                    {showSortDropdown && (
        <motion.div 
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="fixed w-32 bg-white rounded-lg shadow-xl border border-gray-200 py-1"
                        style={{ 
                          zIndex: 9999,
                          top: `${dropdownPosition.top}px`,
                          right: `${dropdownPosition.right}px`
                        }}
                      >
                        <button
                          onClick={() => {
                            setSortType('name');
                            setShowSortDropdown(false);
                          }}
                                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm transition-colors duration-200 ${
                                    sortType === 'name' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700'
                          }`}
                        >
                                  📝 <span>Name</span>
                        </button>
                        <button
                          onClick={() => {
                            setSortType('date');
                            setShowSortDropdown(false);
                          }}
                                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm transition-colors duration-200 ${
                                    sortType === 'date' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700'
                          }`}
                        >
                                  📅 <span>Date</span>
                        </button>
                        <button
                          onClick={() => {
                            setSortType('size');
                            setShowSortDropdown(false);
                          }}
                                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm transition-colors duration-200 ${
                                    sortType === 'size' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700'
                          }`}
                        >
                                  📊 <span>Size</span>
                        </button>
        </motion.div>
      )}
                          </AnimatePresence>
                </div>

                        {/* Sort Direction */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                          className="flex items-center gap-1 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 hover:bg-white/30 transition-all duration-200 text-white text-sm"
                >
          <motion.div 
                    animate={{ rotate: sortDirection === 'desc' ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                            <FaSort className="w-3 h-3" />
                  </motion.div>
                          <span>{sortDirection === 'asc' ? 'A→Z' : 'Z→A'}</span>
                </motion.button>
        </div>
            </div>
          </div>
                </div>
                
                {/* Blue Border Extension */}
                <div className="h-0.5 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600"></div>
            </div>
              
              {/* Documents Content */}
              <div className="bg-white rounded-b-2xl p-16 max-w-full mx-auto shadow-xl" style={{boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)', minHeight: '800px'}}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8" style={{ minHeight: '600px' }}>
                  {getPaginatedItems().length > 0 ? (
                    getPaginatedItems().map((item) => (
        <motion.div 
                  key={item.uniqueId}
                initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
                      whileHover={{ 
                        y: -8, 
                        scale: 1.02,
                        boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.3)"
                      }}
                      style={{ marginBottom: '8px' }}
              whileTap={{ scale: 0.98 }}
                  className="relative group cursor-pointer"
                  onClick={(e) => handleFileClick(e, item)}
                  draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, item)}
              onDragLeave={(e) => handleDragLeave(e, item)}
              onDrop={(e) => handleDrop(e, item)}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <div className="relative w-full h-[560px] rounded-2xl overflow-hidden transition-all duration-500 group-hover:scale-[1.02] group-hover:border-blue-200 group-hover:shadow-2xl"
                           style={{
                             background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)',
                             border: '1px solid #e1e5e9',
                             boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
                           }}>
                        {/* Search Result Indicator */}
                        {searchResultsMapping[item.nom_document] && (
                          <div className="absolute top-3 right-3 z-10">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="bg-yellow-400 text-black px-2 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1"
                            >
                              <FaSearch className="text-xs" />
                              <span>{searchResultsMapping[item.nom_document].length}</span>
                            </motion.div>
                  </div>
                )}
                        
                        {/* PDF Preview Section - Clean design */}
                        <div 
                          className="relative w-full h-80 bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden flex flex-col border-b border-blue-100 cursor-pointer hover:bg-gradient-to-br hover:from-blue-100 hover:to-indigo-100 transition-all duration-300"
                        onClick={(e) => handleFileClick(e, item)}
                      >
                          <div className="w-full h-full flex items-center justify-center p-2">
                            <div className="w-full h-full border border-blue-200 rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm">
                              <div className="w-full h-full flex items-center justify-center p-1">
                        {(() => {
                          // Simple cache check without useMemo in callback
                          const pdfData = pdfCache.get(item.nom_document);
                          // Only log cache misses once per document using a ref
                          if (!pdfData) {
                            // Use a ref to track logged cache misses
                            if (!window.cacheMissLogged) {
                              window.cacheMissLogged = new Set();
                            }
                            if (!window.cacheMissLogged.has(item.nom_document)) {
                              console.log(`🔍 Cache MISS for ${item.nom_document}`);
                              window.cacheMissLogged.add(item.nom_document);
                              
                              // Force load PDFs for this folder if we have a current folder
                              if (currentFolder && currentFolder.folder_path) {
                                console.log(`🔄 Forcing PDF load for folder: ${currentFolder.folder_path}`);
                                
                                // Clear cache first to ensure fresh data
                                clearPdfCacheForFolder(currentFolder.folder_path);
                                
                                // Force refresh PDFs with a small delay
                                setTimeout(() => {
                                  fetchMultiplePdfs(currentFolder.folder_path).catch(error => {
                                    console.error('Error fetching PDFs:', error);
                                  });
                                }, 200);
                              }
                            }
                          }
                          
                          if (pdfData) {
                            // Check if pdfData is a first_page (starts with data:image) or full PDF
                            if (pdfData.startsWith('data:image/')) {
                              // This is a first_page image - display it directly
                              return (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                                  <img 
                                    src={pdfData} 
                                    alt="Document preview" 
                                    className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                                    onError={(e) => {
                                      console.error('Error loading first_page image:', e);
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                </div>
                              );
                            } else {
                              // This is a full PDF - use Document component
                              return (
                                <Document
                                  file={`data:application/pdf;base64,${pdfData}`}
                                  className="w-full h-full"
                                  loading={
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                                      <div className="flex flex-col items-center gap-3">
                                        <FaFilePdf className="text-3xl text-blue-600" />
                                      </div>
                                    </div>
                                  }
                                  error={
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                                      <div className="flex flex-col items-center gap-3">
                                        <FaFilePdf className="text-3xl text-blue-600" />
                                      </div>
                                    </div>
                                  }
                                  onLoadSuccess={({ numPages }) => {
                                    console.log(`PDF loaded successfully with ${numPages} pages`);
                                  }}
                                  onLoadError={(error) => {
                                    console.error('Error loading PDF:', error);
                                  }}
                                >
                                  <Page pageNumber={1} width={240} height={300} />
                                </Document>
                              );
                            }
                          }
                          return (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                                  <div className="flex flex-col items-center gap-3">
                                    <FaFilePdf className="text-3xl text-blue-600" />
                        </div>
                          </div>
                          );
                        })()}
                              </div>
                            </div>
                        </div>
                    </div>

                        {/* Document Info Section - Clean design */}
                        <div className="w-full h-[180px] px-4 py-4 bg-gradient-to-br from-white to-blue-50/30 border-b border-blue-100 group-hover:bg-gradient-to-br group-hover:from-blue-50/50 group-hover:to-white transition-colors duration-300 flex flex-col justify-between">
                      <div>
                        {/* Document ID and Date */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-md">
                          #{item.id_document}
                        </span>
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                          {formatDate(item.date_upload)}
                        </span>
                      </div>
                      
                      {/* Document Name */}
                          <h3 className="text-sm font-semibold text-gray-800 leading-tight mb-3 line-clamp-2" title={item.nom_document}>
                        {item.nom_document}
                      </h3>
                      
                      {/* User who uploaded - Admin only */}
                      {item.user_name && (
                            <div className="mb-3">
                          <span className="inline-block text-xs font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded-md">
                            👤 {item.user_name}
                          </span>
                        </div>
                      )}
                      
                      {/* Document Type */}
                      {item.type_name && (
                            <div className="mb-3">
                          <span className="inline-block text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-md">
                            📄 {item.type_name}
                          </span>
                        </div>
                      )}
                      </div>
                      
                      {/* Tags - Always show at bottom */}
                      <div className="mt-auto">
                        {item.tags && item.tags.length > 0 ? (
                            <div className="relative group/tags">
                              <div className="flex flex-wrap gap-1 cursor-pointer">
                                {item.tags.slice(0, 3).map((tag, index) => (
                                  <span 
                                    key={index} 
                                    className="inline-block text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-md"
                                  >
                                    🏷️ {tag.tag_name}
                                  </span>
                                ))}
                                {item.tags.length > 3 && (
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">+{item.tags.length - 3}</span>
                                )}
                              </div>
                              
                              {/* Hover tooltip for all tags - only on tags section hover */}
                              {item.tags.length > 3 && (
                                <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover/tags:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                                  <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg max-w-xs">
                                    <div className="font-semibold mb-2">Toate tagurile:</div>
                                    <div className="flex flex-wrap gap-1">
                                      {item.tags.map((tag, index) => (
                                        <span 
                                          key={index} 
                                          className="inline-block text-xs font-medium text-green-300 bg-green-900/50 px-2 py-1 rounded-md"
                                        >
                                          {tag.tag_name}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                        ) : (
                          <div className="h-6"></div>
                        )}
                      </div>
                    </div>

                        {/* Action Buttons Section - Clean design */}
                        <div className="w-full grid grid-cols-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-100 group-hover:bg-gradient-to-r group-hover:from-blue-100 group-hover:to-indigo-50 transition-colors duration-300">
                      <button
                    onClick={(e) => {
                      e.stopPropagation();
                          downloaddoc(item.nom_document);
                    }}
                        className="flex flex-col items-center justify-center gap-1 py-3 text-emerald-600 hover:bg-emerald-50 transition-all duration-200 border-r border-blue-100 group"
                  >
                        <FaDownload className="text-sm group-hover:scale-110 transition-transform duration-200" />
                        <span className="text-[10px] font-medium">Download</span>
                      </button>
                      <button
                    onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(item);
                          setShowMoveModal(true);
                        }}
                        className="flex flex-col items-center justify-center gap-1 py-3 text-blue-600 hover:bg-blue-50 transition-all duration-200 border-r border-blue-100 group"
                      >
                        <FaExchangeAlt className="text-sm group-hover:scale-110 transition-transform duration-200" />
                        <span className="text-[10px] font-medium">Move</span>
                      </button>
                      <button
                    onClick={(e) => {
                      e.stopPropagation();
                          handleDeleteClick(item);
                        }}
                            className="flex flex-col items-center justify-center gap-1 py-3 text-rose-600 hover:bg-rose-50 transition-all duration-200 group"
                      >
                        <FaTrash className="text-sm group-hover:scale-110 transition-transform duration-200" />
                        <span className="text-[10px] font-medium">Delete</span>
                      </button>
                    </div>
                  </div>
            </motion.div>
                  ))
                  ) : (
                    <div className="col-span-full flex items-center justify-center" style={{ minHeight: '600px' }}>
                      <div className="text-center">
                        <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <FaFolderOpen className="text-3xl text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Nu există documente</h3>
                        <p className="text-gray-500">Acest folder nu conține documente.</p>
                      </div>
                    </div>
                  )}
            </div>
            
            {/* Ultra Modern Pagination Component */}
            {getTotalPages() > 1 && (
              <div className="mt-12 flex items-center justify-center space-x-3">
                <motion.button
                  whileHover={{ 
                    scale: currentPage === 1 ? 1 : 1.05,
                    y: currentPage === 1 ? 0 : -2
                  }}
                  whileTap={{ scale: currentPage === 1 ? 1 : 0.95 }}
                  onClick={() => {
                    setCurrentPage(Math.max(1, currentPage - 1));
                  }}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-300 ${
                    currentPage === 1
                      ? 'cursor-not-allowed opacity-50'
                          : 'bg-white text-blue-600 hover:bg-blue-50 shadow-sm border border-gray-200'
                  }`}
                >
                  <FaChevronLeft className="w-3 h-3" />
                      <span className="text-sm font-medium">Previous</span>
                </motion.button>
                
                    <div className="flex items-center gap-2">
                      {/* Show limited page numbers with modern styling */}
                      {Array.from({ length: Math.min(5, getTotalPages()) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(getTotalPages() - 4, currentPage - 2)) + i;
                        return (
                  <motion.button
                            key={pageNum}
                            whileHover={{ 
                              scale: 1.1,
                              y: -2
                            }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-300 ${
                              pageNum === currentPage
                                ? 'text-white'
                                : 'text-gray-700 hover:text-white'
                            }`}
                            style={{
                              background: pageNum === currentPage
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                              backdropFilter: 'blur(16px)',
                              border: '1px solid rgba(255,255,255,0.3)',
                              boxShadow: pageNum === currentPage
                                ? '0 8px 32px rgba(102, 126, 234, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                                : '0 4px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.4)'
                            }}
                          >
                            {pageNum}
                  </motion.button>
                        );
                      })}
                    </div>
                
                <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setCurrentPage(Math.min(getTotalPages(), currentPage + 1));
                  }}
                  disabled={currentPage === getTotalPages()}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    currentPage === getTotalPages()
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-blue-600 hover:bg-blue-50 shadow-sm border border-gray-200'
                  }`}
                >
                      <span className="text-sm font-medium">Next</span>
                  <FaChevronRight className="w-3 h-3" />
                </motion.button>
                
                                        <div className="ml-3 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <span className="text-sm text-gray-700">
                        Page <span className="font-semibold text-blue-600">{currentPage}</span> of <span className="font-semibold text-blue-600">{getTotalPages()}</span>
                        <span className="text-gray-500 ml-2">
                          ({getPaginatedItems().length} of {getCurrentItems.filter(item => item.type === 'file').length} documents)
                        </span>
                      </span>
          </div>
              </div>
            )}
            </div>
          </div>
          )}
        </div>
      )}

        {showPdfModal && selectedFile && (
        <PDFViewerModal
          isOpen={showPdfModal}
          onClose={() => {
            setShowPdfModal(false);
            setPreloadedDocDetails(null);
          }}
          file={selectedFile}
          onDownload={downloaddoc}
          highlightTerms={highlightTerms || []}
          searchResultsMapping={searchResultsMapping || {}}
          searchFoundResults={searchFoundResults || []}
          targetPageNumber={targetPageNumber}
          preloadedDocDetails={preloadedDocDetails}
        />
      )}

      <Modal 
        isOpen={showRecycleBinModal} 
        onClose={() => setShowRecycleBinModal(false)}
        size="5xl"
        isCentered
      >
        <MotionModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          backdropFilter="blur(10px)"
          bg="rgba(0, 0, 0, 0.2)"
        />
        <MotionModalContent
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          bg="rgba(255, 255, 255, 0.95)"
          borderRadius="2xl"
          boxShadow="2xl"
          maxH="85vh"
          overflow="hidden"
          backdropFilter="blur(20px)"
          border="1px solid rgba(255, 255, 255, 0.2)"
        >
          <ModalHeader 
            borderBottom="1px" 
            borderColor="rgba(0, 0, 0, 0.1)" 
            pb={4}
            bg="rgba(255, 255, 255, 0.8)"
            backdropFilter="blur(10px)"
          >
            <HStack spacing={4} justify="space-between" w="full">
              <HStack spacing={4}>
                <MotionBox
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  w={12}
                  h={12}
                  borderRadius="xl"
                  bg="linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  boxShadow="0 4px 12px rgba(255, 107, 107, 0.2)"
                >
                  <FaTrash className="text-white text-xl" />
                </MotionBox>
                <VStack align="start" spacing={0}>
                  <Text fontSize="2xl" fontWeight="bold" bgGradient="linear(to-r, #2D3748, #4A5568)" bgClip="text">
                    Coș de reciclare
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    Gestionați elementele șterse
                  </Text>
                </VStack>
              </HStack>
              <IconButton
                aria-label="Close"
                icon={<FiX />}
                variant="ghost"
                colorScheme="gray"
                size="sm"
                onClick={() => setShowRecycleBinModal(false)}
                _hover={{ bg: 'rgba(0, 0, 0, 0.05)' }}
                borderRadius="full"
              />
            </HStack>
          </ModalHeader>

          <ModalBody py={6} overflowY="auto" maxH="calc(85vh - 120px)">
            <Tabs 
              variant="enclosed" 
              onChange={(index) => setActiveTab(index === 0 ? 'documents' : 'folders')}
              colorScheme="blue"
              size="lg"
            >
              <TabList borderBottom="2px" borderColor="rgba(0, 0, 0, 0.1)">
                <Tab 
                  _selected={{ 
                    color: 'blue.500', 
                    borderBottom: '2px', 
                    borderColor: 'blue.500',
                    fontWeight: 'semibold'
                  }}
                  px={6}
                  _hover={{ bg: 'rgba(0, 0, 0, 0.02)' }}
                  transition="all 0.2s"
                >
                  <HStack spacing={2}>
                    <Box 
                      w={6} 
                      h={6} 
                      borderRadius="md" 
                      bg="blue.50" 
                      display="flex" 
                      alignItems="center" 
                      justifyContent="center"
                    >
                      <FaFilePdf className="text-blue.500" />
                    </Box>
                    <Text>Documente</Text>
                  </HStack>
                </Tab>
                <Tab 
                  _selected={{ 
                    color: 'blue.500', 
                    borderBottom: '2px', 
                    borderColor: 'blue.500',
                    fontWeight: 'semibold'
                  }}
                  px={6}
                  _hover={{ bg: 'rgba(0, 0, 0, 0.02)' }}
                  transition="all 0.2s"
                >
                  <HStack spacing={2}>
                    <Box 
                      w={6} 
                      h={6} 
                      borderRadius="md" 
                      bg="blue.50" 
                      display="flex" 
                      alignItems="center" 
                      justifyContent="center"
                    >
                      <FaFolder className="text-blue.500" />
                    </Box>
                    <Text>Foldere</Text>
                  </HStack>
                </Tab>
              </TabList>

              <TabPanels>
                <TabPanel px={0}>
                  {recycleBinLoading ? (
                    <Center py={12}>
                      <Spinner 
                        size="xl" 
                        color="blue.500" 
                        thickness="4px"
                        speed="0.8s"
                      />
                    </Center>
                  ) : deletedItems.standaloneDocuments?.length === 0 ? (
                    <MotionBox
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Center py={12}>
                        <VStack spacing={4}>
                          <Box 
                            w={24} 
                            h={24} 
                            borderRadius="full" 
                            bg="linear-gradient(135deg, #EDF2F7 0%, #E2E8F0 100%)"
                            display="flex" 
                            alignItems="center" 
                            justifyContent="center"
                            boxShadow="0 4px 12px rgba(0, 0, 0, 0.05)"
                          >
                            <FaTrash className="text-gray.400 text-4xl" />
                          </Box>
                          <VStack spacing={2}>
                            <Text color="gray.600" fontSize="lg" fontWeight="medium">
                              Nu există documente șterse
                            </Text>
                            <Text color="gray.400" fontSize="sm">
                              Documentele șterse vor apărea aici
                            </Text>
                          </VStack>
                        </VStack>
                      </Center>
                    </MotionBox>
                  ) : (
                    <Box overflowX="auto">
                      <Table variant="simple">
                        <Thead>
                          <Tr bg="rgba(0, 0, 0, 0.02)">
                            <Th>Nume</Th>
                            <Th>Data ștergerii</Th>
                            <Th>Acțiuni</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          <AnimatePresence>
                            {deletedItems.standaloneDocuments?.map((item, index) => (
                              <MotionTableRow
                                key={item.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.05 }}
                                _hover={{ bg: 'rgba(0, 0, 0, 0.02)' }}
                              >
                                <Td>
                                  <HStack spacing={3}>
                                    <Box 
                                      w={10} 
                                      h={10} 
                                      borderRadius="lg" 
                                      bg="linear-gradient(135deg, #EBF8FF 0%, #BEE3F8 100%)"
                                      display="flex" 
                                      alignItems="center" 
                                      justifyContent="center"
                                      boxShadow="0 2px 8px rgba(66, 153, 225, 0.1)"
                                    >
                                      <FaFilePdf className="text-blue.500" />
                                    </Box>
                                    <VStack align="start" spacing={0}>
                                      <Text fontWeight="medium">{item.name}</Text>
                                      <Text fontSize="sm" color="gray.500">
                                        {item.path}
                                      </Text>
                                    </VStack>
                                  </HStack>
                                </Td>
                                <Td>
                                  <Text color="gray.500">
                                    {new Date(item.deleted_at).toLocaleDateString()}
                                  </Text>
                                </Td>
                                <Td>
                                  <HStack spacing={2}>
                                    <Button
                                      size="sm"
                                      bg="linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)"
                                      color="white"
                                      leftIcon={<FaExchangeAlt />}
                                      onClick={() => handleRestoreClick(item)}
                                      _hover={{ 
                                        bg: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                                        transform: 'translateY(-1px)',
                                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                                      }}
                                      _active={{
                                        bg: 'linear-gradient(135deg, #4338CA 0%, #3730A3 100%)',
                                        transform: 'translateY(0)'
                                      }}
                                      transition="all 0.2s"
                                      borderRadius="xl"
                                      fontWeight="medium"
                                      px={4}
                                      backdropFilter="blur(8px)"
                                      border="1px solid rgba(255, 255, 255, 0.1)"
                                    >
                                      Restaurează
                                    </Button>
                                    <Button
                                      size="sm"
                                      bg="linear-gradient(135deg, #64748B 0%, #475569 100%)"
                                      color="white"
                                      leftIcon={<FaTrash />}
                                      onClick={() => handlePermanentDeleteClick(item)}
                                      _hover={{ 
                                        bg: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
                                        transform: 'translateY(-1px)',
                                        boxShadow: '0 4px 12px rgba(100, 116, 139, 0.2)'
                                      }}
                                      _active={{
                                        bg: 'linear-gradient(135deg, #334155 0%, #1E293B 100%)',
                                        transform: 'translateY(0)'
                                      }}
                                      transition="all 0.2s"
                                      borderRadius="xl"
                                      fontWeight="medium"
                                      px={4}
                                      backdropFilter="blur(8px)"
                                      border="1px solid rgba(255, 255, 255, 0.1)"
                                    >
                                      Șterge
                                    </Button>
                                  </HStack>
                                </Td>
                              </MotionTableRow>
                            ))}
                          </AnimatePresence>
                        </Tbody>
                      </Table>
                    </Box>
                  )}
                </TabPanel>

                <TabPanel px={0}>
                  {recycleBinLoading ? (
                    <Center py={12}>
                      <Spinner 
                        size="xl" 
                        color="blue.500" 
                        thickness="4px"
                        speed="0.8s"
                      />
                    </Center>
                  ) : deletedItems.folders?.length === 0 ? (
                    <MotionBox
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Center py={12}>
                        <VStack spacing={4}>
                          <Box 
                            w={24} 
                            h={24} 
                            borderRadius="full" 
                            bg="linear-gradient(135deg, #EDF2F7 0%, #E2E8F0 100%)"
                            display="flex" 
                            alignItems="center" 
                            justifyContent="center"
                            boxShadow="0 4px 12px rgba(0, 0, 0, 0.05)"
                          >
                            <FaTrash className="text-gray.400 text-4xl" />
                          </Box>
                          <VStack spacing={2}>
                            <Text color="gray.600" fontSize="lg" fontWeight="medium">
                              Nu există foldere șterse
                            </Text>
                            <Text color="gray.400" fontSize="sm">
                              Folderele șterse vor apărea aici
                            </Text>
                          </VStack>
                        </VStack>
                      </Center>
                    </MotionBox>
                  ) : (
                    <Box>
                      <AnimatePresence>
                        {deletedItems.folders?.map((folder, index) => (
                          <MotionFolderCard
                            key={folder.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ 
                              delay: index * 0.05,
                              default: { duration: 0.2 }
                            }}
                            mb={6}
                            p={6}
                            borderRadius="xl"
                            borderWidth="1px"
                            borderColor="rgba(0, 0, 0, 0.1)"
                            bg="rgba(255, 255, 255, 0.8)"
                            _hover={{ 
                              shadow: 'lg',
                              transform: 'translateY(-2px)'
                            }}
                          >
                            <HStack justify="space-between" mb={4}>
                              <HStack spacing={4}>
                                <Box 
                                  w={12} 
                                  h={12} 
                                  borderRadius="xl" 
                                  bg="linear-gradient(135deg, #F3E8FF 0%, #E9D8FD 100%)"
                                  display="flex" 
                                  alignItems="center" 
                                  justifyContent="center"
                                  boxShadow="0 4px 12px rgba(159, 122, 234, 0.1)"
                                >
                                  <FaFolder className="text-blue.500 text-xl" />
                                </Box>
                                <VStack align="start" spacing={1}>
                                  <Text fontSize="lg" fontWeight="bold" bgGradient="linear(to-r, #2D3748, #4A5568)" bgClip="text">
                                    {folder.name}
                                  </Text>
                                  <HStack spacing={2}>
                                    <Text fontSize="sm" color="gray.500">
                                      Șters la {new Date(folder.deleted_at).toLocaleDateString()}
                                    </Text>
                                    <Text fontSize="sm" color="gray.400">•</Text>
                                    <Text fontSize="sm" color="gray.500">
                                      {folder.containedDocuments?.length || 0} documente
                                    </Text>
                                  </HStack>
                                </VStack>
                              </HStack>
                              <HStack spacing={3}>
                                <Button
                                  size="sm"
                                  bg="linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)"
                                  color="white"
                                  leftIcon={<FaExchangeAlt />}
                                  onClick={() => handleRestoreClick(folder)}
                                  _hover={{ 
                                    bg: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                                  }}
                                  _active={{
                                    bg: 'linear-gradient(135deg, #4338CA 0%, #3730A3 100%)',
                                    transform: 'translateY(0)'
                                  }}
                                  transition="all 0.2s"
                                  borderRadius="xl"
                                  fontWeight="medium"
                                  px={4}
                                  backdropFilter="blur(8px)"
                                  border="1px solid rgba(255, 255, 255, 0.1)"
                                >
                                  Restaurează
                                </Button>
                                <Button
                                  size="sm"
                                  bg="linear-gradient(135deg, #64748B 0%, #475569 100%)"
                                  color="white"
                                  leftIcon={<FaTrash />}
                                  onClick={() => handlePermanentDeleteClick(folder)}
                                  _hover={{ 
                                    bg: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 4px 12px rgba(100, 116, 139, 0.2)'
                                  }}
                                  _active={{
                                    bg: 'linear-gradient(135deg, #334155 0%, #1E293B 100%)',
                                    transform: 'translateY(0)'
                                  }}
                                  transition="all 0.2s"
                                  borderRadius="xl"
                                  fontWeight="medium"
                                  px={4}
                                  backdropFilter="blur(8px)"
                                  border="1px solid rgba(255, 255, 255, 0.1)"
                                >
                                  Șterge
                                </Button>
                              </HStack>
                            </HStack>

                            {folder.containedDocuments?.length > 0 && (
                              <Box 
                                mt={4} 
                                p={4} 
                                borderRadius="lg" 
                                bg="rgba(0, 0, 0, 0.02)"
                                borderWidth="1px"
                                borderColor="rgba(0, 0, 0, 0.05)"
                              >
                                <Text fontSize="sm" color="gray.600" mb={3} fontWeight="medium">
                                  Documente conținute ({folder.containedDocuments.length})
                                </Text>
                                <Table variant="simple" size="sm">
                                  <Thead>
                                    <Tr bg="white">
                                      <Th>Nume</Th>
                                      <Th>Data ștergerii</Th>
                                      <Th>Acțiuni</Th>
                                    </Tr>
                                  </Thead>
                                  <Tbody>
                                    {folder.containedDocuments.map((doc) => (
                                      <Tr key={doc.id} _hover={{ bg: 'white' }}>
                                        <Td>
                                          <HStack spacing={2}>
                                            <Box 
                                              w={8} 
                                              h={8} 
                                              borderRadius="md" 
                                              bg="linear-gradient(135deg, #EBF8FF 0%, #BEE3F8 100%)"
                                              display="flex" 
                                              alignItems="center" 
                                              justifyContent="center"
                                              boxShadow="0 2px 8px rgba(66, 153, 225, 0.1)"
                                            >
                                              <FaFilePdf className="text-blue.500 text-sm" />
                                            </Box>
                                            <VStack align="start" spacing={0}>
                                              <Text fontSize="sm" fontWeight="medium">{doc.name}</Text>
                                              <Text fontSize="xs" color="gray.500">
                                                {doc.path}
                                              </Text>
                                            </VStack>
                                          </HStack>
                                        </Td>
                                        <Td>
                                          <Text fontSize="sm" color="gray.500">
                                            {new Date(doc.deleted_at).toLocaleDateString()}
                                          </Text>
                                        </Td>
                                        <Td>
                                          <HStack spacing={2}>
                                            <Button
                                              size="xs"
                                              bg="linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)"
                                              color="white"
                                              leftIcon={<FaExchangeAlt />}
                                              onClick={() => handleRestoreClick(doc)}
                                              _hover={{ 
                                                bg: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                                                transform: 'translateY(-1px)',
                                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                                              }}
                                              _active={{
                                                bg: 'linear-gradient(135deg, #4338CA 0%, #3730A3 100%)',
                                                transform: 'translateY(0)'
                                              }}
                                              transition="all 0.2s"
                                              borderRadius="xl"
                                              fontWeight="medium"
                                              px={3}
                                              backdropFilter="blur(8px)"
                                              border="1px solid rgba(255, 255, 255, 0.1)"
                                            >
                                              Restaurează
                                            </Button>
                                            <Button
                                              size="xs"
                                              bg="linear-gradient(135deg, #64748B 0%, #475569 100%)"
                                              color="white"
                                              leftIcon={<FaTrash />}
                                              onClick={() => handlePermanentDeleteClick(doc)}
                                              _hover={{ 
                                                bg: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
                                                transform: 'translateY(-1px)',
                                                boxShadow: '0 4px 12px rgba(100, 116, 139, 0.2)'
                                              }}
                                              _active={{
                                                bg: 'linear-gradient(135deg, #334155 0%, #1E293B 100%)',
                                                transform: 'translateY(0)'
                                              }}
                                              transition="all 0.2s"
                                              borderRadius="xl"
                                              fontWeight="medium"
                                              px={3}
                                              backdropFilter="blur(8px)"
                                              border="1px solid rgba(255, 255, 255, 0.1)"
                                            >
                                              Șterge
                                            </Button>
                                          </HStack>
                                        </Td>
                                      </Tr>
                                    ))}
                                  </Tbody>
                                </Table>
                              </Box>
                            )}
                          </MotionFolderCard>
                        ))}
                      </AnimatePresence>
                    </Box>
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </MotionModalContent>
      </Modal>

      <AnimatePresence>
        {showRenameModal && selectedFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-800">Rename Document</h3>
                  <button
                    onClick={() => {
                      if (newFileName !== selectedFile.nom_document.replace('.pdf', '')) {
                        setShowCancelConfirm(true);
                      } else {
                        setShowRenameModal(false);
                        setNewFileName('');
                      }
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New name</label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        className="flex-1 p-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter new name"
                        autoFocus
                      />
                      <div className="px-4 py-3 bg-gray-100 text-gray-500 rounded-r-lg border border-l-0 border-gray-300">
                        .pdf
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      if (newFileName !== selectedFile.nom_document.replace('.pdf', '')) {
                        setShowCancelConfirm(true);
                      } else {
                        setShowRenameModal(false);
                        setNewFileName('');
                      }
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  >
                Cancel
                  </button>
                  <button
                    onClick={handleRename}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    Rename
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showCancelConfirm && (
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]"
                >
                  <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-800">Discard Changes?</h3>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  </button>
              </div>

                <p className="text-gray-600 mb-6">
                  You have unsaved changes. Are you sure you want to discard them?
                </p>

                <div className="flex justify-end space-x-3">
              <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                    Keep Editing
              </button>
              <button
                onClick={() => {
                      setShowCancelConfirm(false);
                      setShowRenameModal(false);
                      setNewFileName('');
                }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
              >
                    Discard Changes
              </button>
                  </div>
                </div>
              </motion.div>
          </motion.div>
      )}

      {showMoveModal && selectedFile && (
        <MoveModal
          isOpen={showMoveModal}
          onClose={() => setShowMoveModal(false)}
          onMove={handleMoveFile}
          currentItem={selectedFile}
          folders={folders}
          currentPath={currentFolder?.path || ''}
          setCurrentFolder={setCurrentFolder}
        />
      )}

        {showDeleteConfirmModal && fileToDelete && (
          <Modal isOpen={showDeleteConfirmModal} onClose={() => {
          setShowDeleteConfirmModal(false);
          setFileToDelete(null);
          }} isCentered>
            <ModalOverlay backdropFilter="blur(10px)" />
            <ModalContent 
              bg="white" 
              borderRadius="xl" 
              boxShadow="2xl"
              maxW="500px"
              mx={4}
            >
              <ModalHeader borderBottom="1px" borderColor="gray.200" pb={4}>
                <HStack spacing={3}>
                  <Box 
                    w={8} 
                    h={8} 
                    borderRadius="full" 
                    bg="red.100" 
                    display="flex" 
                    alignItems="center" 
                    justifyContent="center"
            >
                    <FaExclamationTriangle className="text-red-600" />
                  </Box>
                  <Text fontSize="xl" fontWeight="bold">Confirm Delete</Text>
                </HStack>
              </ModalHeader>

              <ModalBody py={6}>
                <VStack spacing={4} align="stretch">
                  <Box bg="red.50" p={4} borderRadius="lg" borderWidth="1px" borderColor="red.100">
                    <HStack spacing={3}>
                      <Box 
                        w={10} 
                        h={10} 
                        borderRadius="lg" 
                        bg="red.100" 
                        display="flex" 
                        alignItems="center" 
                        justifyContent="center"
                      >
                        <FaExclamationTriangle className="text-red-500" />
                      </Box>
                      <Box>
                        <Text fontWeight="medium" color="red.700">Warning</Text>
                        <Text color="red.600" fontSize="sm">This action cannot be undone</Text>
                      </Box>
                    </HStack>
                  </Box>

                  <Box bg="orange.50" p={4} borderRadius="lg" borderWidth="1px" borderColor="orange.200">
                    <HStack spacing={3}>
                      <Box 
                        w={10} 
                        h={10} 
                        borderRadius="lg" 
                        bg="orange.100" 
                        display="flex" 
                        alignItems="center" 
                        justifyContent="center"
                      >
                        <FaHistory className="text-orange-600" />
                      </Box>
                      <Box>
                        <Text fontWeight="medium" color="orange.700">Version History</Text>
                        <Text color="orange.600" fontSize="sm">
                          All versions of this document will also be moved to recycle bin
                        </Text>
                      </Box>
                    </HStack>
                  </Box>

                  <Text color="gray.600">
                    Are you sure you want to delete the file <Text as="span" fontWeight="medium" color="gray.800">{fileToDelete?.nom_document}</Text>?
                  </Text>
            
                  <Box bg="gray.50" p={4} borderRadius="lg" borderWidth="1px" borderColor="gray.200">
                    <HStack spacing={3}>
                      <Box 
                        w={10} 
                        h={10} 
                        borderRadius="lg" 
                        bg="blue.50" 
                        display="flex" 
                        alignItems="center" 
                        justifyContent="center"
                      >
                        <FaFilePdf className="text-blue-500" />
                      </Box>
                      <Box>
                        <Text fontSize="sm" color="gray.500">File Path</Text>
                        <Text fontSize="sm" fontWeight="medium" color="gray.700">{fileToDelete?.path}</Text>
                      </Box>
                    </HStack>
                  </Box>
                </VStack>
              </ModalBody>

              <ModalFooter borderTop="1px" borderColor="gray.200" pt={4}>
                <HStack spacing={3}>
                  <Button
                    variant="ghost"
                  onClick={() => {
                    setShowDeleteConfirmModal(false);
                    setFileToDelete(null);
                  }}
                >
                Cancel
                  </Button>
                  <Button
                    colorScheme="red"
                  onClick={handleDeleteConfirm}
                    leftIcon={<FaTrash />}
                >
                Delete
                  </Button>
                </HStack>
              </ModalFooter>
            </ModalContent>
      </Modal>
        )}

        {showMoveToast && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 25,
              mass: 1
            }}
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 p-4 rounded-xl shadow-lg z-50 ${
              moveToastType === 'success' 
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border border-green-400' 
                : 'bg-gradient-to-r from-red-500 to-red-600 text-white border border-red-400'
            }`}
            style={{
              minWidth: '300px',
              maxWidth: '80vw',
              backdropFilter: 'blur(8px)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-full p-2 ${
                moveToastType === 'success' ? 'bg-green-400' : 'bg-red-400'
              }`}>
              {moveToastType === 'success' ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: [0, 15, -15, 15, 0] }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: [0, 15, -15, 15, 0] }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                </svg>
                  </motion.div>
                )}
              </div>
              <motion.span 
                className="text-sm font-medium tracking-wide"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {moveToastMessage}
              </motion.span>
            </div>
          </motion.div>
        )}

        {showRestoreModal && selectedDeletedItem && (
  <Modal
    isOpen={showRestoreModal}
    onClose={() => {
      setShowRestoreModal(false);
      setSelectedDeletedItem(null);
      setRestoreModalCurrentFolder(null);
      setRestoreModalFolderHistory([]);
    }}
    isCentered
    closeOnEsc={true}
    closeOnOverlayClick={true}
  >
    <ModalOverlay backdropFilter="blur(10px)" />
    <ModalContent 
      bg="white" 
      borderRadius="2xl" 
      boxShadow="0 20px 60px -10px rgba(0, 0, 0, 0.15)"
      maxW="700px"
      minH="600px"
      mx={4}
      border="1px solid"
      borderColor="gray.100"
    >
      <ModalHeader 
        bgGradient="linear(135deg, green.50, green.100)"
        borderBottom="1px" 
        borderColor="green.200" 
        pb={4}
        borderTopRadius="2xl"
      >
        <HStack spacing={3} justify="space-between" w="full">
          <HStack spacing={3}>
            <Box 
              w={10} 
              h={10} 
              borderRadius="xl" 
              bg="white" 
              display="flex" 
              alignItems="center" 
              justifyContent="center"
              boxShadow="0 4px 12px rgba(34, 197, 94, 0.2)"
            >
              <FaExchangeAlt className="text-green-600" size="18" />
            </Box>
            <VStack align="start" spacing={0}>
              <Text fontSize="lg" fontWeight="bold" color="green.800">
                Restore {selectedDeletedItem.type === 'folder' ? 'Folder' : 'Document'}
              </Text>
              <Text fontSize="sm" color="green.600" fontWeight="medium">
                Choose destination location
              </Text>
            </VStack>
          </HStack>
          <IconButton
            aria-label="Close"
            icon={<FaTimes />}
            variant="ghost"
            color="gray.500"
            size="sm"
            borderRadius="full"
            _hover={{ bg: 'white', color: 'gray.700' }}
            onClick={() => {
              setShowRestoreModal(false);
              setSelectedDeletedItem(null);
              setRestoreModalCurrentFolder(null);
              setRestoreModalFolderHistory([]);
            }}
          />
        </HStack>
      </ModalHeader>

      <ModalBody py={6} px={6}>
        <VStack spacing={6}>
          <Box>
            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>Item to restore:</Text>
            <Box 
              bg="gray.50" 
              p={4} 
              borderRadius="xl" 
              borderWidth="1px" 
              borderColor="gray.200"
              _hover={{ bg: 'gray.100', borderColor: 'gray.300' }}
              transition="all 0.2s"
            >
              <HStack spacing={4}>
                <Box 
                  w={12} 
                  h={12} 
                  borderRadius="xl" 
                  bg="blue.100" 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center"
                  boxShadow="0 2px 8px rgba(59, 130, 246, 0.15)"
                >
                  {selectedDeletedItem.type === 'folder' ? (
                    <FaFolder className="text-blue-600" size="20" />
                  ) : (
                    <FaFilePdf className="text-blue-600" size="20" />
                  )}
                </Box>
                <VStack align="start" spacing={1}>
                  <Text fontSize="md" fontWeight="bold" color="gray.800">{selectedDeletedItem.name}</Text>
                  <Text fontSize="sm" color="gray.600">Original path: {selectedDeletedItem.path}</Text>
                </VStack>
              </HStack>
            </Box>
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>Select destination folder:</Text>
            <Box 
              bg="blue.50" 
              p={3} 
              borderRadius="xl" 
              borderWidth="1px" 
              borderColor="blue.200"
              mb={4}
            >
              <HStack spacing={3} justify="space-between">
                <HStack spacing={3}>
              <IconButton
                icon={<FaChevronLeft />}
                size="sm"
                variant="ghost"
                colorScheme="blue"
                    borderRadius="full"
                onClick={handleRestoreModalNavigateBack}
                isDisabled={restoreModalFolderHistory.length === 0}
                    _hover={{ bg: 'blue.100' }}
              />
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" fontWeight="bold" color="blue.800">
                      Current Location
              </Text>
                    <Text fontSize="sm" color="blue.600" noOfLines={1}>
                      {restoreModalCurrentFolder ? restoreModalCurrentFolder.folder_path : 'Root'}
                    </Text>
                    {!restoreModalCurrentFolder && currentFolder && (
                      <Text fontSize="xs" color="green.600" fontWeight="medium">
                        ⚡ Will restore to: {currentFolder.folder_path}
                      </Text>
                    )}
                  </VStack>
            </HStack>
                <Badge colorScheme="blue" variant="subtle" borderRadius="full">
                  {restoreModalFolders.length} folders
                </Badge>
              </HStack>
            </Box>

            <Box 
              h="300px" 
              overflowY="auto" 
              borderWidth="1px" 
              borderColor="gray.200" 
              borderRadius="xl" 
              p={4}
              bg="gray.50"
            >
              <SimpleGrid columns={{ base: 2, sm: 3, md: 4 }} spacing={4}>
              {restoreModalFolders.map((folder) => (
                <Button
                  key={folder.folder_path}
                  onClick={() => handleRestoreModalNavigate(folder)}
                  variant="outline"
                  height="auto"
                  p={4}
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                    gap={3}
                    borderRadius="xl"
                    borderWidth="2px"
                    borderColor="gray.200"
                    bg="white"
                    _hover={{ 
                      bg: 'blue.50', 
                      borderColor: 'blue.300',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(59, 130, 246, 0.15)'
                    }}
                    transition="all 0.2s"
                >
                  <Box position="relative">
                      <FaFolder className="text-4xl text-blue.500" />
                    {folder.is_private && (
                        <Box
                          position="absolute"
                          bottom="-2px"
                          right="-2px"
                          bg="blue.500"
                          color="white"
                          borderRadius="full"
                          p={1}
                          boxShadow="0 2px 4px rgba(0, 0, 0, 0.1)"
                        >
                          <FaLock className="text-xs" />
                        </Box>
                    )}
                  </Box>
                    <Text fontSize="sm" fontWeight="bold" color="gray.800" noOfLines={1}>
                    {folder.folder_name}
                  </Text>
                </Button>
              ))}
            </SimpleGrid>
            </Box>
            {restoreModalFolders.length === 0 && (
              <Center py={12}>
                <VStack spacing={4}>
                  <Box 
                    w={16} 
                    h={16} 
                    borderRadius="full" 
                    bg="gray.100" 
                    display="flex" 
                    alignItems="center" 
                    justifyContent="center"
                  >
                    <FaFolder className="text-2xl text-gray.400" />
                  </Box>
                  <VStack spacing={2}>
                    <Text color="gray.600" fontSize="lg" fontWeight="medium">
                      No folders found
                    </Text>
                    <Text color="gray.500" fontSize="sm" textAlign="center">
                      This location doesn't contain any folders
                    </Text>
                  </VStack>
                </VStack>
              </Center>
            )}
          </Box>
        </VStack>
      </ModalBody>

      <ModalFooter borderTop="1px" borderColor="gray.200" pt={6} pb={6}>
        <VStack spacing={4} w="full">
          {/* Original Location Button */}
          <Button
            variant="outline"
            colorScheme="blue"
            borderRadius="xl"
            px={8}
            py={3}
            fontWeight="bold"
            w="full"
            borderWidth="2px"
            borderColor="blue.300"
            bg="blue.50"
            _hover={{ 
              bg: 'blue.100', 
              borderColor: 'blue.400',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
            }}
            transition="all 0.2s"
            onClick={() => {
              setRestoreConfirmData({
                type: 'original',
                item: selectedDeletedItem,
                destination: selectedDeletedItem.path,
                message: `Are you sure you want to restore "${selectedDeletedItem.name}" to its original location?\n\nLocation: ${selectedDeletedItem.path}`
              });
              setShowRestoreConfirmModal(true);
            }}
            leftIcon={<FaUndo />}
          >
            Restore to original location: {selectedDeletedItem.path}
          </Button>
          
          {/* Action Buttons */}
          <HStack spacing={4} w="full" justify="space-between">
            <Button
              variant="outline"
              colorScheme="gray"
              borderRadius="xl"
              px={8}
              py={3}
              fontWeight="semibold"
              _hover={{ bg: 'gray.50', borderColor: 'gray.300' }}
            onClick={() => {
              setShowRestoreModal(false);
              setSelectedDeletedItem(null);
              setRestoreModalCurrentFolder(null);
              setRestoreModalFolderHistory([]);
            }}
          >
            Cancel
          </Button>
          <Button
            colorScheme="green"
            borderRadius="xl"
            px={8}
            py={3}
            fontWeight="bold"
            bgGradient="linear(to-r, green.500, green.600)"
            _hover={{
              bgGradient: 'linear(to-r, green.600, green.700)',
              transform: 'translateY(-1px)',
              boxShadow: '0 6px 20px rgba(34, 197, 94, 0.4)'
            }}
            transition="all 0.2s"
            isDisabled={!restoreModalCurrentFolder}
            opacity={restoreModalCurrentFolder ? 1 : 0.5}
            onClick={() => {
              if (!restoreModalCurrentFolder) return;
              
              const destinationPath = restoreModalCurrentFolder.folder_path;
              setRestoreConfirmData({
                type: 'current',
                item: selectedDeletedItem,
                destination: destinationPath,
                message: `Are you sure you want to restore "${selectedDeletedItem.name}" to the current location?\n\nLocation: ${destinationPath}`
              });
              setShowRestoreConfirmModal(true);
            }}
            leftIcon={<FaExchangeAlt />}
          >
            {restoreModalCurrentFolder ? 'Restore here' : 'Select a folder to restore here'}
          </Button>
        </HStack>
        </VStack>
      </ModalFooter>
    </ModalContent>
  </Modal>
)}
      </AnimatePresence>

      {/* Restore Confirmation Modal */}
      {showRestoreConfirmModal && restoreConfirmData && (
        <Modal
          isOpen={showRestoreConfirmModal}
          onClose={() => {
            setShowRestoreConfirmModal(false);
            setRestoreConfirmData(null);
          }}
          isCentered
          closeOnEsc={true}
          closeOnOverlayClick={true}
        >
          <ModalOverlay backdropFilter="blur(10px)" />
          <ModalContent 
            bg="white" 
            borderRadius="2xl" 
            boxShadow="0 20px 60px -10px rgba(0, 0, 0, 0.15)"
            maxW="500px"
            mx={4}
            border="1px solid"
            borderColor="gray.100"
          >
            <ModalHeader 
              bgGradient="linear(135deg, blue.50, blue.100)"
              borderBottom="1px" 
              borderColor="blue.200" 
              pb={4}
              borderTopRadius="2xl"
            >
              <HStack spacing={3}>
                <Box 
                  w={10} 
                  h={10} 
                  borderRadius="xl" 
                  bg="white" 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center"
                  boxShadow="0 4px 12px rgba(59, 130, 246, 0.2)"
                >
                  <FaExchangeAlt className="text-blue-600" size="18" />
                </Box>
                <VStack align="start" spacing={0}>
                  <Text fontSize="lg" fontWeight="bold" color="blue.800">
                    Confirm Restore
                  </Text>
                  <Text fontSize="sm" color="blue.600" fontWeight="medium">
                    Please confirm your action
                  </Text>
                </VStack>
              </HStack>
            </ModalHeader>

            <ModalBody py={6} px={6}>
              <VStack spacing={4}>
                <Box 
                  bg="blue.50" 
                  p={4} 
                  borderRadius="xl" 
                  borderWidth="1px" 
                  borderColor="blue.200"
                  w="full"
                >
                  <HStack spacing={4}>
                    <Box 
                      w={12} 
                      h={12} 
                      borderRadius="xl" 
                      bg="blue.100" 
                      display="flex" 
                      alignItems="center" 
                      justifyContent="center"
                      boxShadow="0 2px 8px rgba(59, 130, 246, 0.15)"
                    >
                      {restoreConfirmData.item.type === 'folder' ? (
                        <FaFolder className="text-blue-600" size="20" />
                      ) : (
                        <FaFilePdf className="text-blue-600" size="20" />
                      )}
                    </Box>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="md" fontWeight="bold" color="gray.800">
                        {restoreConfirmData.item.name}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        Destination: {restoreConfirmData.destination}
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
                
                <Text fontSize="sm" color="gray.700" textAlign="center" whiteSpace="pre-line">
                  {restoreConfirmData.message}
                </Text>
              </VStack>
            </ModalBody>

            <ModalFooter borderTop="1px" borderColor="gray.200" pt={6} pb={6}>
              <HStack spacing={4} w="full" justify="space-between">
                <Button
                  variant="outline"
                  colorScheme="gray"
                  borderRadius="xl"
                  px={8}
                  py={3}
                  fontWeight="semibold"
                  _hover={{ bg: 'gray.50', borderColor: 'gray.300' }}
                  onClick={() => {
                    setShowRestoreConfirmModal(false);
                    setRestoreConfirmData(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  colorScheme="blue"
                  borderRadius="xl"
                  px={8}
                  py={3}
                  fontWeight="bold"
                  bgGradient="linear(to-r, blue.500, blue.600)"
                  _hover={{
                    bgGradient: 'linear(to-r, blue.600, blue.700)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 20px rgba(59, 130, 246, 0.4)'
                  }}
                  transition="all 0.2s"
                  onClick={async () => {
                    try {
                      await handleRestore(restoreConfirmData.item, restoreConfirmData.destination);
                      
                      // Close both modals
                      setShowRestoreConfirmModal(false);
                      setRestoreConfirmData(null);
                      setShowRestoreModal(false);
                      setSelectedDeletedItem(null);
                      setRestoreModalCurrentFolder(null);
                      setRestoreModalFolderHistory([]);
                      
                      // Navigate to the destination folder
                      if (restoreConfirmData.type === 'current' && restoreConfirmData.destination) {
                        // Find the folder in the current structure and navigate to it
                        const findAndNavigateToFolder = (folders, targetPath) => {
                          for (const folder of folders) {
                            if (folder.folder_path === targetPath) {
                              setCurrentFolder(folder);
                              setCurrentPath(folder.folder_path);
                              return true;
                            }
                            if (folder.children) {
                              if (findAndNavigateToFolder(folder.children, targetPath)) {
                                return true;
                              }
                            }
                          }
                          return false;
                        };
                        
                        if (!findAndNavigateToFolder(folders, restoreConfirmData.destination)) {
                          // If not found in current structure, refresh and try again
                          await fetchFolders();
                          await fetchDocuments();
                        }
                      }
                      
                    } catch (error) {
                      console.error('Error in restore confirmation:', error);
                      setShowRestoreConfirmModal(false);
                      setRestoreConfirmData(null);
                    }
                  }}
                  leftIcon={<FaExchangeAlt />}
                >
                  Confirm Restore
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {showCreateFolderModal && (
        <CreateFolderModal
          isOpen={showCreateFolderModal}
          onClose={() => setShowCreateFolderModal(false)}
          onCreateFolder={(() => {
            // Definim handleCreateFolder direct în componenta unde este folosită
            const handleCreateFolder = async (folderName, parentPath, isPrivate) => {
              try {
                setLoading(true);
                
                // Construim calea completă pentru noul folder
                // Dacă parentPath este null, creăm în Root (doar numele folderului)
                // Dacă parentPath există, creăm în folderul respectiv
                const fullPath = parentPath 
                  ? `${parentPath}/${folderName}` 
                  : folderName;
                  
                // console.log('Creating folder:', {
                //   name: folderName,
                //   path: fullPath,
                //   parentPath: parentPath,
                //   isPrivate
                // });
                
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
                    parentFolder: parentPath, // Adăugăm și parentFolder pentru claritate
                    isPrivate: isPrivate ? 1 : 0
                  })
                });
                
                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Failed to create folder');
                }
                
                // Refresh the folder list
                await fetchFolders();
                await fetchDocuments();
                
                // Show success notification
                showMoveNotification(`Folder "${folderName}" created successfully`);
                
              } catch (error) {
                console.error('Error creating folder:', error);
                setError(error.message || 'Failed to create folder');
                setTimeout(() => setError(null), 3000);
              } finally {
                setLoading(false);
              }
            };
            return handleCreateFolder;
          })()}
          folders={folders}
          currentPath={currentFolder?.folder_path || ""}
        />
      )}

      {/* New: Folder Rename Modal */}
      <AnimatePresence>
        {showFolderRenameModal && selectedFolder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-800">Rename Folder</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (newFolderName !== selectedFolder.folder_name) {
                        setShowCancelConfirm(true);
                      } else {
                        setShowFolderRenameModal(false);
                        setNewFolderName('');
                      }
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nume folder nou</label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Introdu numele noului folder"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (newFolderName !== selectedFolder.folder_name) {
                        setShowCancelConfirm(true);
                      } else {
                        setShowFolderRenameModal(false);
                        setNewFolderName('');
                      }
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFolderRename();
                    }}
                    disabled={!newFolderName.trim() || newFolderName === selectedFolder.folder_name}
                    className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 ${
                      !newFolderName.trim() || newFolderName === selectedFolder.folder_name ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    Rename
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing modals */}
      {showFolderDeleteConfirmModal && folderToDelete && (
        <Modal isOpen={showFolderDeleteConfirmModal} onClose={() => {
          setShowFolderDeleteConfirmModal(false);
          setFolderToDelete(null);
        }} isCentered>
          <ModalOverlay backdropFilter="blur(10px)" />
          <ModalContent 
            bg="white" 
            borderRadius="xl" 
            boxShadow="2xl"
            maxW="500px"
            mx={4}
          >
            <ModalHeader borderBottom="1px" borderColor="gray.200" pb={4}>
              <HStack spacing={3}>
                <Box 
                  w={8} 
                  h={8} 
                  borderRadius="full" 
                  bg="red.100" 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center"
                >
                  <FaExclamationTriangle className="text-red-600" />
                </Box>
                <Text fontSize="xl" fontWeight="bold">Confirm Delete Folder</Text>
              </HStack>
            </ModalHeader>

            <ModalBody py={6}>
              <VStack spacing={4} align="stretch">
                <Box bg="red.50" p={4} borderRadius="lg" borderWidth="1px" borderColor="red.100">
                  <HStack spacing={3}>
                    <Box 
                      w={10} 
                      h={10} 
                      borderRadius="lg" 
                      bg="red.100" 
                      display="flex" 
                      alignItems="center" 
                      justifyContent="center"
                    >
                      <FaExclamationTriangle className="text-red-500" />
                    </Box>
                    <Box>
                      <Text fontWeight="medium" color="red.700">Warning</Text>
                      <Text color="red.600" fontSize="sm">This action cannot be undone. All contents of this folder will be deleted.</Text>
                    </Box>
                  </HStack>
                </Box>

                <Text color="gray.600">
                  Are you sure you want to delete the folder <Text as="span" fontWeight="medium" color="gray.800">{folderToDelete?.folder_name}</Text>?
                </Text>
          
                <Box bg="gray.50" p={4} borderRadius="lg" borderWidth="1px" borderColor="gray.200">
                  <HStack spacing={3}>
                    <Box 
                      w={10} 
                      h={10} 
                      borderRadius="lg" 
                      bg="blue.50" 
                      display="flex" 
                      alignItems="center" 
                      justifyContent="center"
                    >
                      <FaFolder className="text-blue-500" />
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.500">Folder Path</Text>
                      <Text fontSize="sm" fontWeight="medium" color="gray.700">{folderToDelete?.folder_path}</Text>
                    </Box>
                  </HStack>
                </Box>
              </VStack>
            </ModalBody>

            <ModalFooter borderTop="1px" borderColor="gray.200" pt={4}>
              <HStack spacing={3}>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowFolderDeleteConfirmModal(false);
                    setFolderToDelete(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  colorScheme="red"
                  onClick={handleFolderDeleteConfirm}
                  leftIcon={<FaTrash />}
                >
                  Delete Folder
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* New: Folder Contents Modal */}
      {showFolderContentsModal && folderToDelete && (
        <FolderContentsModal
          isOpen={showFolderContentsModal}
          onClose={() => {
            setShowFolderContentsModal(false);
            setFolderToDelete(null);
          }}
          folder={folderToDelete}
          onConfirmDelete={handleFolderDeleteAfterContents}
        />
      )}

      {showCancelConfirm && (
                <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Rest of the cancel confirm modal */}
                </motion.div>
      )}

      <FolderMoveModal
        isOpen={showFolderMoveModal}
        onClose={() => setShowFolderMoveModal(false)}
        onMove={handleMoveFolder}
        currentFolder={selectedFolder}
        folders={folders}
        currentPath={currentFolder?.path || ''}
        setCurrentFolder={setCurrentFolder}
      />

      {/* Permanent Delete Confirmation Modal */}
      {showPermanentDeleteModal && selectedDeletedItem && (
        <Modal
          isOpen={showPermanentDeleteModal}
          onClose={() => {
            setShowPermanentDeleteModal(false);
            setSelectedDeletedItem(null);
          }}
          isCentered
        >
          <ModalOverlay backdropFilter="blur(10px)" />
          <ModalContent 
            bg="white" 
            borderRadius="xl" 
            boxShadow="2xl"
            maxW="500px"
            mx={4}
          >
            <ModalHeader borderBottom="1px" borderColor="gray.200" pb={4}>
              <HStack spacing={3} justify="space-between" w="full">
                <HStack spacing={3}>
                  <Box 
                    w={8} 
                    h={8} 
                    borderRadius="full" 
                    bg="red.100" 
                    display="flex" 
                    alignItems="center" 
                    justifyContent="center"
                  >
                    <FaTrash className="text-red-600" />
                  </Box>
                  <Text fontSize="xl" fontWeight="bold">Ștergere Permanentă</Text>
                </HStack>
                <IconButton
                  aria-label="Close"
                  icon={<FaTimes />}
                  variant="ghost"
                  colorScheme="gray"
                  size="sm"
                  onClick={() => {
                    setShowPermanentDeleteModal(false);
                    setSelectedDeletedItem(null);
                  }}
                />
              </HStack>
            </ModalHeader>

            <ModalBody py={6}>
              <VStack spacing={4} align="stretch">
                <Box
                  p={4}
                  borderRadius="lg"
                  bg="red.50"
                  borderWidth="1px"
                  borderColor="red.100"
                >
                  <HStack spacing={3}>
                    <Box
                      w="40px"
                      h="40px"
                      borderRadius="lg"
                      bg="red.100"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <FaExclamationTriangle className="text-red-500" />
                    </Box>
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="medium" color="red.700">
                        Atenție
                      </Text>
                      <Text color="red.600">
                        Această acțiune nu poate fi anulată!
                      </Text>
                    </VStack>
                  </HStack>
                </Box>

                <Text color="gray.600">
                  Sigur doriți să ștergeți permanent {selectedDeletedItem.type === 'folder' ? 'folderul' : 'fișierul'}{' '}
                  <Text as="span" fontWeight="medium" color="gray.800">
                    {selectedDeletedItem.name}
                  </Text>
                  ?
                </Text>

                <Box
                  p={4}
                  borderRadius="lg"
                  bg="gray.50"
                  borderWidth="1px"
                  borderColor="gray.100"
                >
                  <HStack spacing={3}>
                    <Box
                      w="40px"
                      h="40px"
                      borderRadius="lg"
                      bg="blue.50"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <FaFolder className="text-blue-500" />
                    </Box>
                    <VStack align="start" spacing={1}>
                      <Text color="gray.500" fontSize="sm">
                        Calea Originală
                      </Text>
                      <Text fontWeight="medium" color="gray.700">
                        {selectedDeletedItem.path}
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              </VStack>
            </ModalBody>

            <ModalFooter borderTop="1px" borderColor="gray.200" pt={4}>
              <HStack spacing={3}>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowPermanentDeleteModal(false);
                    setSelectedDeletedItem(null);
                  }}
                >
                  Anulează
                </Button>
                <Button
                  colorScheme="red"
                  onClick={() => handlePermanentDelete(selectedDeletedItem)}
                  leftIcon={<FaTrash />}
                >
                  Șterge Permanent
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Selected Keywords Modal */}
      <AnimatePresence>
        {showSelectedKeywordsModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowSelectedKeywordsModal(false)}
            >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-96 max-w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Selected Keywords</h3>
                <button
                  onClick={() => setShowSelectedKeywordsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes />
                </button>
                              </div>
              <div className="space-y-2">
                {selectedKeywords.map(keyword => (
                  <motion.div
                    key={keyword}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    className="flex items-center justify-between p-2 bg-blue-50 rounded-lg"
                  >
                                          <span className="text-blue-700">{keyword}</span>
                    <button
                      onClick={() => handleRemoveKeyword(keyword)}
                                              className="text-blue-400 hover:text-blue-600"
                    >
                      <FaTimes />
                    </button>
                  </motion.div>
                ))}
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Search Modal */}
      {showContentSearchModal && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/70 backdrop-blur-lg flex items-center justify-center z-50"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 999999
            }}
            onClick={() => !isSearchInProgress && setShowContentSearchModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl p-8 w-[500px] max-w-[90vw] shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                  <motion.div
                  initial={{ x: -20 }}
                  animate={{ x: 0 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🔍</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Content Search</h3>
                    <p className="text-sm text-gray-500">Search inside PDF documents</p>
                  </div>
                  </motion.div>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => !isSearchInProgress && setShowContentSearchModal(false)}
                  className={`transition-colors ${isSearchInProgress ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <FaTimes size={20} />
                </motion.button>
              </div>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Terms
                  </label>
                  <textarea
                    value={contentSearchQuery}
                    onChange={(e) => setContentSearchQuery(e.target.value)}
                    placeholder="Enter keywords to search for in document content...&#10;Example: Remote Learning, nagaro, internship"
                                            className="w-full h-24 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleContentSearch();
                      }
                    }}
                  />
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-500">
                      Enter keywords separated by commas. Documents containing at least one keyword will be shown.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      <span>🤖</span>
                      <span>OCR technology included - searches text and scanned documents</span>
                    </div>
                  </div>
                </div>

                {/* Search Type Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Search Method
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        value="smart"
                        checked={contentSearchType === 'smart'}
                        onChange={(e) => setContentSearchType(e.target.value)}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900">🤖 Smart Search (Recommended)</div>
                        <div className="text-sm text-gray-500">Automatically detects if document is text or scanned and uses the appropriate method</div>
                    </div>
                    </label>
                    
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        value="text-only"
                        checked={contentSearchType === 'text-only'}
                        onChange={(e) => setContentSearchType(e.target.value)}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                    <div>
                        <div className="font-medium text-gray-900">⚡ Text-Only Search (Fast)</div>
                        <div className="text-sm text-gray-500">Only searches text-based PDFs, ignores scanned documents (very fast)</div>
                    </div>
                    </label>
                    
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        value="ocr-only"
                        checked={contentSearchType === 'ocr-only'}
                        onChange={(e) => setContentSearchType(e.target.value)}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900">🔍 OCR-Only Search (Slow)</div>
                        <div className="text-sm text-gray-500">Uses OCR to search in scanned documents and images (slower but thorough)</div>
                  </div>
                    </label>
                  </div>
                </div>

                {isSearchInProgress && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3"
                  >
                    <div className="space-y-4">
                      {/* Header with spinning icon and percentage */}
                      <div className="flex items-center gap-4">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full flex-shrink-0"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-lg font-bold text-blue-900">
                              Căutare în documente...
                            </span>
                            <span className="text-2xl font-bold text-blue-700">
                              {searchProgress.total > 0 ? Math.round((searchProgress.current / searchProgress.total) * 100) : 0}%
                            </span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="w-full bg-blue-200 rounded-full h-4 mb-3 shadow-inner">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all duration-500 shadow-sm"
                              style={{ 
                                width: `${searchProgress.total > 0 ? (searchProgress.current / searchProgress.total) * 100 : 0}%` 
                              }}
                            />
                          </div>
                          
                          {/* Current processing info */}
                          <div className="text-sm text-blue-700 mb-2">
                            <span className="font-medium">Procesez:</span> {searchProgress.processing || 'Pregătire...'}
                          </div>
                          
                          {/* Documents processed counter */}
                          <div className="text-sm text-blue-600">
                            <span>Documente procesate: {searchProgress.current}/{searchProgress.total}</span>
                          </div>
                        </div>
                      </div>

                      {/* Results found section */}
                      {searchFoundResults.length > 0 && (
                        <div className="bg-white/60 rounded-lg p-4 border border-blue-200">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-green-600 font-bold text-lg">🎯 Rezultate găsite:</span>
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold">
                              {searchFoundResults.length}
                            </span>
                          </div>
                          
                          {/* Count by extraction method */}
                          <div className="flex gap-4 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                              <span className="text-sm font-medium">Text: {searchFoundResults.filter(r => r.extractionMethod === 'text').length}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                              <span className="text-sm font-medium">OCR: {searchFoundResults.filter(r => r.extractionMethod === 'ocr').length}</span>
                            </div>
                          </div>
                          
                          {/* Last found documents */}
                          <div className="space-y-1 max-h-20 overflow-y-auto">
                            {searchFoundResults.slice(-3).map((doc, index) => (
                              <div key={index} className="flex items-center gap-2 text-xs">
                                <span className={`w-2 h-2 rounded-full ${doc.extractionMethod === 'text' ? 'bg-blue-500' : 'bg-orange-500'}`}></span>
                                <span className="truncate font-medium">{doc.nom_document}</span>
                                <span className="text-gray-500">({doc.matchedTerms?.length || 0} match-uri)</span>
                              </div>
                            ))}
                            {searchFoundResults.length > 3 && (
                              <div className="text-xs text-gray-500 italic">
                                +{searchFoundResults.length - 3} documente...
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                </div>
              </motion.div>
                )}

                {isContentFilterActive && !isSearchInProgress && (
              <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="bg-emerald-50 border border-emerald-200 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 text-emerald-700">
                      <FaCheck className="text-sm" />
                      <span className="text-sm font-medium">
                        Filtru activ: {contentSearchResults.length} documente găsite
                      </span>
                    </div>
                    <button
                      onClick={clearContentSearch}
                      className="text-emerald-600 hover:text-emerald-800 text-sm underline mt-1 transition-colors"
                    >
                      Șterge filtrul
                    </button>
                  </motion.div>
                )}

                <div className="flex gap-3 pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                    onClick={handleContentSearch}
                    disabled={isContentSearching || !contentSearchQuery.trim()}
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {isContentSearching ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                        <span>
                          {contentSearchType === 'text-only' ? 'Text Search...' : 
                           contentSearchType === 'ocr-only' ? 'OCR Processing...' : 
                           'Smart Analysis...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <FaSearch />
                        <span>Search Documents</span>
                      </>
                    )}
                </motion.button>
                  
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                    onClick={() => !isSearchInProgress && setShowContentSearchModal(false)}
                    disabled={isSearchInProgress}
                    className={`px-6 py-3 border border-gray-200 rounded-lg font-medium transition-colors ${
                      isSearchInProgress 
                        ? 'text-gray-400 cursor-not-allowed bg-gray-100' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {isSearchInProgress ? 'Căutare în curs...' : 'Anulează'}
                </motion.button>
                </div>

                <p className="text-xs text-gray-400 text-center">
                  Press Ctrl+Enter to search quickly
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
      </AnimatePresence>,
        document.body
      )}

      {/* Advanced Filter Modal */}
      {showAdvancedFilterModal && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/70 backdrop-blur-lg flex items-center justify-center z-50"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 999999
            }}
            onClick={() => setShowAdvancedFilterModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl p-8 w-[600px] max-w-[90vw] max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                  <motion.div
                  initial={{ x: -20 }}
                  animate={{ x: 0 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-slate-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🔧</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Advanced Filter</h3>
                    <p className="text-sm text-gray-500">Filter documents by various criteria</p>
                  </div>
                  </motion.div>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowAdvancedFilterModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimes size={20} />
                </motion.button>
              </div>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
              >
                {/* Tags Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    📍 Filter by Tags
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={tagSearchTerm}
                      onChange={(e) => handleTagSearchChange(e.target.value)}
                      placeholder="Search and select tags..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    {tagSearchTerm && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {filteredAvailableTags.length > 0 ? (
                          filteredAvailableTags.map(tag => (
                            <div
                              key={tag}
                              onClick={() => {
                                handleTagToggle(tag);
                                setTagSearchTerm('');
                                setFilteredAvailableTags(availableTags);
                              }}
                              className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between"
                            >
                              <span className="text-sm text-gray-700">{tag}</span>
                              {advancedFilters.tags.includes(tag) && (
                                <FaCheck className="text-blue-600 text-xs" />
                              )}
                    </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">No tags found</div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Selected Tags */}
                  {advancedFilters.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {advancedFilters.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {tag}
                          <button
                            onClick={() => handleTagToggle(tag)}
                            className="hover:text-blue-900"
                          >
                            <FaTimes className="text-xs" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Keywords Filter */}
                    <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    🔍 Filter by Keywords
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={keywordSearchTerm}
                      onChange={(e) => handleKeywordSearchChange(e.target.value)}
                      placeholder="Search and select keywords..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    {keywordSearchTerm && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {filteredAvailableKeywords.length > 0 ? (
                          filteredAvailableKeywords.map(keyword => (
                            <div
                              key={keyword}
                              onClick={() => {
                                handleKeywordToggle(keyword);
                                setKeywordSearchTerm('');
                                setFilteredAvailableKeywords(keywords);
                              }}
                              className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between"
                            >
                              <span className="text-sm text-gray-700">{keyword}</span>
                              {advancedFilters.keywords.includes(keyword) && (
                                <FaCheck className="text-blue-600 text-xs" />
                              )}
                    </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">No keywords found</div>
                        )}
                  </div>
                    )}
                  </div>
                  {/* Selected Keywords */}
                  {advancedFilters.keywords.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {advancedFilters.keywords.map(keyword => (
                        <span
                          key={keyword}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {keyword}
                          <button
                            onClick={() => handleKeywordToggle(keyword)}
                            className="hover:text-blue-900"
                          >
                            <FaTimes className="text-xs" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    📅 Filter by Upload Date
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">From</label>
                      <input
                        type="date"
                        value={advancedFilters.dateRange.start}
                        onChange={(e) => setAdvancedFilters(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, start: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">To</label>
                      <input
                        type="date"
                        value={advancedFilters.dateRange.end}
                        onChange={(e) => setAdvancedFilters(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, end: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Document Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    📄 Filter by Document Type
                  </label>
                  <select
                    value={advancedFilters.documentType}
                    onChange={(e) => setAdvancedFilters(prev => ({
                      ...prev,
                      documentType: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All document types</option>
                    {availableTypes.map(type => (
                      <option key={type.id} value={type.name}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Active Filters Summary */}
                {isAdvancedFilterActive && (
              <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                  >
                                          <div className="flex items-center gap-2 text-blue-700 mb-2">
                      <FaCheck className="text-sm" />
                      <span className="text-sm font-medium">Active Filters:</span>
                    </div>
                                          <div className="text-xs text-blue-600 space-y-1">
                      {advancedFilters.tags.length > 0 && (
                        <div>Tags: {advancedFilters.tags.join(', ')}</div>
                      )}
                      {advancedFilters.keywords.length > 0 && (
                        <div>Keywords: {advancedFilters.keywords.join(', ')}</div>
                      )}
                      {(advancedFilters.dateRange.start || advancedFilters.dateRange.end) && (
                        <div>
                          Date: {advancedFilters.dateRange.start || 'Any'} to {advancedFilters.dateRange.end || 'Any'}
                        </div>
                      )}
                      {advancedFilters.documentType && (
                        <div>Type: {advancedFilters.documentType}</div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                    onClick={applyAdvancedFilters}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <FaCheck />
                    <span>Apply Filters</span>
                </motion.button>
                  
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                    onClick={clearAdvancedFilters}
                    className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                    Clear All
                </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowAdvancedFilterModal(false)}
                    className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
    </motion.div>
        </AnimatePresence>
        , document.body
      )}
    </div>
  );
};

export default Documents; 
