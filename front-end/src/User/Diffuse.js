import React, { useState, useEffect, useCallback, useRef, useMemo, useReducer } from 'react';
import ReactDOM, { createPortal } from 'react-dom';
import { FaFolder, FaFolderOpen, FaFilePdf, FaChevronLeft, FaChevronRight, FaEye, FaDownload, FaExchangeAlt, FaCog, FaEdit, FaTrash, FaPrint, FaExclamationTriangle, FaTimes, FaCalendarAlt, FaFileAlt, FaHistory, FaPlus, FaStar, FaUser, FaLock, FaSearch, FaInfoCircle, FaExclamation, FaBox, FaChevronUp, FaChevronDown, FaSync, FaSort, FaCheck, FaSave, FaRedo, FaPenFancy, FaSignature, FaUndo, FaFolderPlus } from 'react-icons/fa';
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
import PDFViewerModal from './PDFViewerModal.jsx';
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

    return ReactDOM.createPortal(
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
    console.log('Folder clicked:', folder);
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

  return ReactDOM.createPortal(
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
    console.log('Folder clicked:', folder);
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

  return ReactDOM.createPortal(
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
  const [isPrivate, setIsPrivate] = useState(true); // Mereu activat
  const [folderHistory, setFolderHistory] = useState([]);
  const [error, setError] = useState(null);
  const [showWarning, setShowWarning] = useState(false);

  // Resetăm starea când se deschide modalul
  useEffect(() => {
    if (isOpen) {
      setIsPrivate(true);
      setFolderName("");
      setError(null);
      setShowWarning(false);
    }
  }, [isOpen]);

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

  const handleCreateFolder = () => {
    if (!folderName.trim()) {
      setError("Folder name cannot be empty");
      return;
    }

    // Verificăm dacă numele conține caractere invalide pentru un folder
    if (/[\\/:*?"<>|]/.test(folderName)) {
      setError("Folder name contains invalid characters");
      return;
    }

    // Construim calea completă pentru noul folder
    const parentPath = selectedFolder ? selectedFolder.folder_path : currentPath;
    
    onCreateFolder(folderName, parentPath, isPrivate);
    onClose();
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

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[9999]"
         style={{ 
           position: 'fixed',
           top: 0,
           left: 0,
           right: 0,
           bottom: 0,
           width: '100vw',
           height: '100vh'
         }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white rounded-xl p-6 w-[750px] h-[700px] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FaFolder className="text-2xl text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Creează folder nou</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modern path and folder name input */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Locație și nume folder</label>
          <div className="relative">
            <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all duration-200">
              <button
                onClick={handleBack}
                disabled={folderHistory.length === 0}
                className="p-3 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:text-gray-300 hover:bg-gray-100 rounded-l-xl transition-colors"
              >
                <FaChevronLeft className="text-sm" />
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full p-3 bg-transparent border-0 focus:ring-0 focus:outline-none pl-4 pr-12 text-sm placeholder-gray-400"
                  placeholder={`${selectedFolder ? selectedFolder.folder_path : 'Root'}/`}
                  autoFocus
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                  <div className="relative group/lock">
                    <div className="p-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 transition-colors">
                      <FaLock className="text-emerald-600 text-xs cursor-help" />
                    </div>
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover/lock:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
                      <div className="font-medium">Folder privat (obligatoriu)</div>
                      <div className="text-gray-300">Ca utilizator obișnuit, nu poți crea foldere publice</div>
                      <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md flex items-center gap-3">
            <FaExclamationTriangle className="text-red-500" />
            <div className="text-sm font-medium">{error}</div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto mb-6">
          <div className="text-sm font-semibold text-gray-600 mb-4">Selectați folderul de destinație:</div>
          <div className="space-y-2">
            {getCurrentItems().map((item) => (
              <button
                key={item.folder_path}
                onClick={() => handleFolderClick(item)}
                className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 text-left group"
                title={item.folder_name}
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                    <FaFolder className="text-white text-lg" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                      {item.folder_name}
                    </span>
                    {item.is_private && (
                      <div className="flex-shrink-0">
                        <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center">
                          <FaLock className="text-xs text-emerald-600" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate mt-1 group-hover:text-gray-600 transition-colors">
                    {item.folder_path}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {getCurrentItems().length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <FaFolder className="text-3xl text-gray-400" />
              </div>
              <p className="text-base font-medium text-gray-600 mb-2">Nu s-au găsit folderuri în această locație</p>
              <p className="text-sm text-gray-400">Creează folderul direct în root</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
          >
            Anulează
          </button>
          <button
            onClick={handleCreateFolder}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-70 transition-colors font-medium flex items-center gap-2"
            disabled={!folderName.trim()}
          >
            <FaPlus className="text-sm" />
              Creează folder
          </button>
        </div>
      </motion.div>
    </div>,
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

  return ReactDOM.createPortal(
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

const DiffusePage = () => {
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
  const [autoSelectionDone, setAutoSelectionDone] = useState(false);
  const autoSelectionRef = useRef(false);
  const [userId, setUserId] = useState(null);
  const [userInstitution, setUserInstitution] = useState(null);
  const [isPersonalAccount, setIsPersonalAccount] = useState(false);
  const [showFirstFolderModal, setShowFirstFolderModal] = useState(false);
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
  const [isNavigating, setIsNavigating] = useState(false);
  const [documentCache, setDocumentCache] = useState(new Map()); // Cache for documents by folder path
  // Suppress self-induced socket refreshes for a short window after local actions
  const suppressSocketPathsRef = useRef(new Set());
  const processedMoveEvents = useRef(new Set());
  const addSocketSuppression = React.useCallback((fullPath, folderPath) => {
    try {
      if (!fullPath && !folderPath) return;
      const s = suppressSocketPathsRef.current;
      if (fullPath) s.add(String(fullPath));
      if (folderPath) s.add(String(folderPath));
      setTimeout(() => { try { s.delete(String(fullPath)); } catch {} }, 2000);
      if (folderPath) setTimeout(() => { try { s.delete(String(folderPath)); } catch {} }, 2000);
    } catch {}
  }, []);
  const [preloadedFolders, setPreloadedFolders] = useState(new Set()); // Track preloaded folders
  
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

  // Navigation tracing helpers
  const navSeqRef = useRef(0);
  const currentNavRef = useRef(null);
  const logNav = (phase, details = undefined) => {
    const id = currentNavRef.current?.id ?? '-';
    try {
      if (details !== undefined) {
        console.log(`[NAV ${id}] ${phase}:`, details);
      } else {
        console.log(`[NAV ${id}] ${phase}`);
      }
    } catch {
      console.log(`[NAV ${id}] ${phase}`);
    }
  };
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Update in-memory PDF cache only (disable persistent localStorage to avoid quota and flicker)
  const updatePdfCache = (folderPath, pdfs) => {
    const newCache = new Map(pdfCache);
    for (const [filename, pdfData] of Object.entries(pdfs)) {
      newCache.set(filename, pdfData);
    }
    setPdfCache(newCache);
    // Intentionally skip localStorage persistence for stability and performance
  };

  // Load cached PDFs (persistent cache disabled → always false)
  const loadCachedPdfs = () => false;

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
  const updateDocumentPathInstantly = (fileName, oldPath, newPath, fullDoc = null) => {
    console.log('📄 Updating document path instantly:', {
      fileName,
      oldPath,
      newPath
    });
    
    // Capture full source doc to preserve metadata (id, tags, dates)
    let movedDocFull = null;

    // Update documents state
    setDocuments(prevDocuments => {
      if (!prevDocuments) {
        console.log('No documents to update');
        return [];
      }
      
      console.log('Current documents count:', prevDocuments.length);
      
      const updatedDocuments = prevDocuments.map(doc => {
        if (doc.nom_document === fileName && doc.path === oldPath) {
          const base = fullDoc && Object.keys(fullDoc).length > 0 ? fullDoc : doc;
          const merged = { ...base, path: newPath };
          movedDocFull = merged;
          console.log('✅ Updating document:', doc.nom_document, 'from', oldPath, 'to', newPath);
          return merged;
        }
        return doc;
      });
      
      console.log('Updated documents count:', updatedDocuments.length);
      return updatedDocuments;
    });

    // Update document cache for both old and new paths
    setDocumentCache(prevCache => {
      const newCache = new Map(prevCache);
      
      // Remove from old path cache
      if (newCache.has(oldPath)) {
        const oldPathDocs = newCache.get(oldPath).filter(doc => 
          !(doc.nom_document === fileName && doc.path === oldPath)
        );
        newCache.set(oldPath, oldPathDocs);
        console.log('🗑️ Removed document from old path cache:', oldPath);
      }
      
      // Add/update in new path cache
      const newDocEntry = movedDocFull || (fullDoc ? { ...fullDoc, path: newPath } : { nom_document: fileName, path: newPath });
      const existingNewPathDocs = newCache.get(newPath) || [];
      if (!existingNewPathDocs.some(doc => doc.nom_document === fileName)) {
        newCache.set(newPath, [...existingNewPathDocs, newDocEntry]);
        console.log('➕ Added document to new path cache:', newPath);
      } else {
        newCache.set(
          newPath,
          existingNewPathDocs.map(doc => (doc.nom_document === fileName ? { ...doc, ...(fullDoc || {}), path: newPath } : doc))
        );
      }

      // Mark target folder as recently invalidated to force full HTTP reconciliation on first entry
      try {
        const norm = (p) => (p || '').replace(/\\/g, '/').toLowerCase();
        window.recentlyInvalidatedFolders = window.recentlyInvalidatedFolders || new Set();
        window.recentlyInvalidatedFolders.add(norm(newPath));
      } catch {}
      
      return newCache;
    });

    // Force re-render of current documents if we're in the affected folder
    if (currentFolder && (currentFolder.folder_path === oldPath || currentFolder.folder_path === newPath)) {
      console.log('🔄 Force re-render for current folder after move');
      // Trigger a small delay to ensure state updates are processed
      setTimeout(() => {
        if (currentFolder.folder_path === oldPath) {
          // We're in the source folder - documents should be removed
          setDocuments(prev => prev.filter(doc => !(doc.nom_document === fileName && doc.path === oldPath)));
        } else if (currentFolder.folder_path === newPath) {
          // We're in the destination folder - documents should be added
          // This will be handled by the cache update above
        }
      }, 100);
    }
  };

  // Function to remove document instantly without refresh
  const removeDocumentInstantly = (documentToRemove) => {
    console.log('🗑️ Removing document instantly:', documentToRemove);
    
    setDocuments(prevDocuments => {
      if (!prevDocuments) return [];
      
      // Filter out undefined/null documents and the target document
      const filteredDocuments = prevDocuments
        .filter(doc => doc && doc.nom_document) // Remove undefined/null documents
        .filter(doc => 
          !(doc.id_document === documentToRemove.id_document || 
            (doc.path === documentToRemove.path && doc.nom_document === documentToRemove.nom_document))
        );
      
      console.log('Documents after removal:', filteredDocuments.length);
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
        return [...validDocuments, newDocument];
      }
      
      return validDocuments;
    });

    // Also update the document cache for the destination folder so future cache hits include it
    try {
      const folderPath = newDocument.path;
      setDocumentCache(prev => {
        const newCache = new Map(prev);
        const existing = (newCache.get(folderPath) || []).filter(d => d && d.nom_document);
        const already = existing.some(d => 
          d.id_document === newDocument.id_document ||
          (d.path === newDocument.path && d.nom_document === newDocument.nom_document)
        );
        if (!already) {
          newCache.set(folderPath, [...existing, newDocument]);
        }
        return newCache;
      });
    } catch {}
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

  // Check if user has institution or is personal account
  const checkUserInstitution = async () => {
    try {
      const response = await fetch(`${backend}/api/user/institution`, {
        credentials: 'include',
        headers: { 'Origin': window.location.origin }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserInstitution(data.institution);
        setIsPersonalAccount(false);
        console.log('User has institution:', data.institution);
      } else if (response.status === 404) {
        // User doesn't have institution - personal account
        setUserInstitution(null);
        setIsPersonalAccount(true);
        console.log('User is personal account (no institution)');
      }
    } catch (error) {
      console.error('Error checking user institution:', error);
      // Assume personal account if error
      setUserInstitution(null);
      setIsPersonalAccount(true);
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
        
        // Auto-select folder logic based on account type
        const urlParams = new URLSearchParams(window.location.search);
        const hasUrlParams = urlParams.get('folder') || urlParams.get('page') || urlParams.get('highlight') || urlParams.get('docId');
        
        if (!autoSelectionRef.current && !currentFolder && !hasUrlParams) {
          autoSelectionRef.current = true; // Mark as done immediately to prevent multiple calls
          
          if (isPersonalAccount) {
            // For personal accounts, show first folder modal if no folders exist
            if (data.folders.length === 0) {
              console.log('🎯 Personal account with no folders - showing first folder modal');
              setShowFirstFolderModal(true);
            } else {
              // Auto-select first folder for personal account
              console.log('🎯 Auto-selecting first folder for personal account');
              const targetFolder = data.folders[0];
              setCurrentFolder(targetFolder);
              setCurrentPath(targetFolder.folder_path || targetFolder.name);
              setAutoSelectionDone(true);
            }
          } else {
            // For institutional accounts, auto-select AICIC folder
            if (data.folders.length > 0) {
              // Look for AICIC folder specifically
              const aicicFolder = data.folders.find(folder => 
                folder.folder_name === 'AICIC' || 
                folder.folder_path?.includes('AICIC') ||
                folder.name === 'AICIC'
              );
              
              const targetFolder = aicicFolder || data.folders[0]; // Fallback to first folder if AICIC not found
              console.log('🎯 Auto-selecting folder:', targetFolder.folder_name || targetFolder.name);
              setCurrentFolder(targetFolder);
              setCurrentPath(targetFolder.folder_path || targetFolder.name);
              setAutoSelectionDone(true); // Mark auto-selection as done
            }
          }
          
          // Fetch documents for the auto-selected folder immediately
          try {
            await fetchDocuments(true); // Skip PDF load initially to avoid multiple refreshes
          } catch (error) {
            console.error('Error fetching documents for auto-selected folder:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
      setError('Failed to load folders');
    } finally {
      setLoading(false);
    }
  }, []); // Remove currentFolder dependency to prevent multiple calls

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

  // Enhanced fetchDocuments with caching and pre-loading support
  const fetchDocuments = React.useCallback(async (folderPath = null, skipPdfLoad = false, forceRefresh = false) => {
    const targetFolderPath = folderPath || currentFolder?.folder_path;
    const targetFolderId = currentFolder?.id;
    
    // Skip if no valid folder path
    if (!targetFolderPath || targetFolderPath === true) {
      logNav('DOC_SKIP_NO_PATH', { targetFolderPath });
      return;
    }
    
    logNav('DOC_FLOW_ENTER', { targetFolderPath, skipPdfLoad, forceRefresh });
    
    // Check cache first (unless force refresh is requested)
    if (!forceRefresh && documentCache.has(targetFolderPath)) {
      logNav('DOC_CACHE_HIT', { targetFolderPath });
      setDocuments(documentCache.get(targetFolderPath));
      return;
    }
    
    try {
      if (!skipPdfLoad) {
        // Only set loading if we do NOT have cached content for the target folder
        if (!documentCache.has(targetFolderPath)) {
          setIsLoadingDocuments(true);
        }
      }
      logNav('DOC_FETCH_HTTP', { targetFolderPath });
      
      if (targetFolderPath) {
        const response = await fetch(`${backend}/post_docs/documents/folder/${encodeURIComponent(targetFolderPath)}`, {
          credentials: 'include',
          headers: { 'Origin': window.location.origin }
        });
        
        if (!response.ok) {
          const err = new Error('Failed to fetch documents from folder');
          logNav('DOC_FETCH_HTTP_FAIL', { status: response.status });
          throw err;
        }
        
        const data = await response.json();
        
        // Check if the folder hasn't changed during the request (only for current folder)
        if (!folderPath && (currentFolder?.folder_path !== targetFolderPath || currentFolder?.id !== targetFolderId)) {
          logNav('DOC_STALE_RESPONSE_IGNORED', { currentPath: currentFolder?.folder_path, targetFolderPath });
          return;
        }
        
        if (data.success && data.documents) {
          logNav('DOC_FETCH_OK', { count: data.documents.length });
          // Map documents with all required fields
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
          
          // Cache the documents
          setDocumentCache(prev => new Map(prev).set(targetFolderPath, processedDocuments));
          
          // Only update current documents if this is for the current folder
          if (!folderPath) {
            // Keep existing UI visible while replacing state to avoid flicker
            setDocuments(prev => {
              // If prev equals processed (by shallow metrics), return prev to avoid reflow
              if (Array.isArray(prev) && prev.length === processedDocuments.length) {
                let same = true;
                for (let i = 0; i < prev.length; i++) {
                  if (prev[i]?.id_document !== processedDocuments[i]?.id_document || prev[i]?.nom_document !== processedDocuments[i]?.nom_document) { 
                    same = false; break; 
                  }
                }
                if (same) return prev;
              }
              return processedDocuments;
            });
          }
          
          logNav('DOC_STATE_APPLIED', { count: processedDocuments.length });
        } else {
          const emptyArray = [];
          setDocumentCache(prev => new Map(prev).set(targetFolderPath, emptyArray));
          if (!folderPath) {
            setDocuments(emptyArray);
          }
          logNav('DOC_EMPTY', { targetFolderPath });
        }
      } else {
        const emptyArray = [];
        if (!folderPath) {
          setDocuments(emptyArray);
        }
        logNav('DOC_NO_FOLDER');
      }
      
    } catch (error) {
      console.error('Error fetching documents:', error);
      if (!folderPath) {
        setError('Failed to load documents');
        setDocuments([]);
      }
      logNav('DOC_ERROR', error?.message || String(error));
    } finally {
      if (!skipPdfLoad) {
        setIsLoadingDocuments(false);
      }
      logNav('DOC_FLOW_EXIT');
    }
  }, [currentFolder, documentCache]);

  // Pre-load documents for a folder (for hover effects)
  const preloadDocuments = React.useCallback(async (folderPath) => {
    if (preloadedFolders.has(folderPath) || documentCache.has(folderPath)) {
      return; // Already preloaded or cached
    }
    
    console.log('🔄 Pre-loading documents for folder:', folderPath);
    setPreloadedFolders(prev => new Set(prev).add(folderPath));
    
    try {
      await fetchDocuments(folderPath, true); // Skip loading state
      console.log('✅ Pre-loaded documents for folder:', folderPath);
    } catch (error) {
      console.error('Error pre-loading documents:', error);
      setPreloadedFolders(prev => {
        const newSet = new Set(prev);
        newSet.delete(folderPath);
        return newSet;
      });
    }
  }, [fetchDocuments, preloadedFolders, documentCache]);

  // Expose preloadDocuments globally for FolderSidebar
  React.useEffect(() => {
    window.preloadDocuments = preloadDocuments;
    return () => {
      delete window.preloadDocuments;
    };
  }, [preloadDocuments]);

  // Helper to normalize folder path keys (case-insensitive, slash-normalized)
  const normalizeFolderPathKey = React.useCallback((p) => (p || '').replace(/\\/g, '/').toLowerCase(), []);

  // Function to clear document cache for a specific folder
  const clearDocumentCache = React.useCallback((folderPath) => {
    console.log('🗑️ Clearing document cache for folder:', folderPath);
    const normalizedKey = normalizeFolderPathKey(folderPath);
    setDocumentCache(prev => {
      const newCache = new Map(prev);
      // Delete by exact key if present
      newCache.delete(folderPath);
      // Also delete any entry whose normalized key matches (handles case differences)
      try {
        for (const existingKey of Array.from(newCache.keys())) {
          if (normalizeFolderPathKey(existingKey) === normalizedKey) {
            newCache.delete(existingKey);
          }
        }
      } catch {}
      return newCache;
    });
    
    // 🆕 MARK FOLDER FOR FORCED REFRESH: Track recently invalidated folders (store normalized)
    window.recentlyInvalidatedFolders = window.recentlyInvalidatedFolders || new Set();
    window.recentlyInvalidatedFolders.add(normalizedKey);
    
    // Remove from set after 5 seconds
    setTimeout(() => {
      if (window.recentlyInvalidatedFolders) {
        window.recentlyInvalidatedFolders.delete(normalizedKey);
      }
    }, 5000);
  }, [normalizeFolderPathKey]);

  // Expose clearDocumentCache globally for FolderSidebar
  React.useEffect(() => {
    window.clearDocumentCache = clearDocumentCache;
    return () => {
      delete window.clearDocumentCache;
    };
  }, [clearDocumentCache]);

  // Helper: extract folder path from absolute FS path in socket payload
  const extractFolderPathFromFsPath = React.useCallback((fsPath) => {
    if (typeof fsPath !== 'string') return null;
    const marker = '/uploads/';
    const idx = fsPath.indexOf(marker);
    if (idx === -1) return null;
    const after = fsPath.substring(idx + marker.length);
    const lastSlash = after.lastIndexOf('/');
    if (lastSlash === -1) return null;
    return after.substring(0, lastSlash); // e.g., "Scoala Dabuleni/GERTE"
  }, []);

  const shouldRefreshForSocketEvent = React.useCallback((data) => {
    // Refresh only if current folder is impacted
    const currentPath = currentFolder?.folder_path;
    if (!currentPath) return false;
    const candidate = extractFolderPathFromFsPath(data?.targetPath || data?.sourcePath);
    if (candidate && candidate === currentPath) return true;
    // Fallback: compare by last segment name if provided
    if (data?.targetFolder && currentPath.endsWith(`/${data.targetFolder}`)) return true;
    return false;
  }, [currentFolder?.folder_path, extractFolderPathFromFsPath]);

  // NORMALIZE DOCUMENT NAME - Remove .pdf extension for consistent comparison
  const normalizeDocumentName = (name) => {
    if (!name || name === 'unknown') return 'unknown';
    return name.toLowerCase().replace(/\.pdf$/i, '');
  };

  // UNIFIED MOVE HANDLER - Single entry point for ALL move events (React, Sync Agent, Backend)
  const handleUnifiedMoveEvent = (data, sourceFolder, targetFolder, documentName) => {
    
    const normalizedDocName = normalizeDocumentName(documentName);
    
    // ENHANCED DEDUPLICATION - Use document name and folders, ignore timestamp
    const moveKey = `move_${normalizedDocName}_${sourceFolder}_${targetFolder}`;
    const pathMoveKey = `move_path_${sourceFolder}_${targetFolder}`;
    
    // Check if we're already processing this move
    if (processedMoveEvents.current.has(moveKey)) {
      console.log('🎯 [UNIFIED MOVE] Skipping duplicate move operation:', moveKey);
      return;
    }
    
    // Add to processed set
    processedMoveEvents.current.add(moveKey);
    processedMoveEvents.current.add(pathMoveKey);
    
    // Clean up after 3 seconds
    setTimeout(() => {
      processedMoveEvents.current.delete(moveKey);
      processedMoveEvents.current.delete(pathMoveKey);
    }, 3000);
    
    console.log('🎯 [UNIFIED MOVE] Processing move operation:', {
      documentName: normalizedDocName,
      sourceFolder,
      targetFolder,
      currentFolder: currentFolder?.folder_path,
      eventType: data?.eventType || 'unknown',
      moveKey
    });

    // CACHE INVALIDATION - Mark affected folders as stale; avoid clearing target cache to preserve full list
    try {
      const currentPathNorm = currentFolder?.folder_path?.replace(/\\/g, '/').toLowerCase();
      const markStale = (folder) => {
        if (!folder) return;
        window.recentlyInvalidatedFolders = window.recentlyInvalidatedFolders || new Set();
        window.recentlyInvalidatedFolders.add(folder);
      };
      if (sourceFolder) {
        if (currentPathNorm === sourceFolder) {
          // Keep cache, just mark stale; UI is updated optimistically below
          markStale(sourceFolder);
        } else {
          clearPdfCacheForFolder(sourceFolder);
          clearDocumentCache(sourceFolder);
          console.log('🎯 [UNIFIED MOVE] Cleared cache for source folder:', sourceFolder);
        }
      }
      if (targetFolder) {
        // Never clear target cache; only mark as stale so we keep full list and append
        markStale(targetFolder);
      }
    } catch (error) {
      console.log('🎯 [UNIFIED MOVE] Cache clear error:', error?.message);
    }

    // OPTIMISTIC UI UPDATE - Instant feedback, no flicker
    // NO HTTP here – we only update the UI locally and mark folders stale. Navigation will fetch.
    // Normalize current folder path for comparison
    const currentFolderPath = currentFolder?.folder_path?.toLowerCase().replace(/\\/g, '/');
    
    // If event has unknown document name, skip creating placeholders to avoid unknown.pdf/invalid date
    if (normalizedDocName === 'unknown') {
      // We already marked caches stale above; rely on background reconciliation
      console.log('🎯 [UNIFIED MOVE] Skipping placeholder for unknown document name');
      return;
    }

    // Update UI optimist numai dacă suntem în folderul afectat – fără fetch
    if (sourceFolder && currentFolderPath === sourceFolder) {
      console.log('🎯 [UNIFIED MOVE] Optimistic update for source (remove doc)');
      setDocuments(prev => prev.filter(d => normalizeDocumentName(d.nom_document) !== normalizedDocName));
    } else if (targetFolder && currentFolderPath === targetFolder) {
      console.log('🎯 [UNIFIED MOVE] Optimistic update for target (add metadata-preserving placeholder)');
      setDocuments(prev => {
        const alreadyExists = Array.isArray(prev) && prev.some(d => normalizeDocumentName(d.nom_document) === normalizedDocName);
        if (alreadyExists) return prev;

        const originalFileName = data?.documentName || `${normalizedDocName}.pdf`;
        // Try to reuse the full doc from source cache to keep id/tags/dates
        let sourceList = null;
        try {
          // Find cache entry by normalized key
          for (const [key, list] of (documentCache || new Map()).entries()) {
            if ((key || '').replace(/\\/g, '/').toLowerCase() === (sourceFolder || '')) {
              sourceList = list;
              break;
            }
          }
        } catch {}
        const fromSource = Array.isArray(sourceList)
          ? sourceList.find(d => (d?.nom_document || '').toLowerCase() === originalFileName.toLowerCase())
          : null;

        const optimisticDoc = fromSource
          ? { ...fromSource, path: currentFolder?.folder_path }
          : {
              id_document: -Date.now(),
              nom_document: `${normalizedDocName}.pdf`,
              path: currentFolder?.folder_path,
              type_name: 'Official Document',
              type: 'Official Document',
              date_upload: new Date().toISOString(),
              file_size: 0,
              prenom: '',
              nom: '',
              tags: []
            };

        return [optimisticDoc, ...(prev || [])];
      });
    }

    // PURE OPTIMISTIC UPDATES - Zero refresh, fluid UI
    console.log('🎯 [UNIFIED MOVE] Document moved optimistically - no refresh needed');
    
    // ✅ MARK DOCUMENT AS RECENTLY MOVED TO PREVENT ADD EVENTS
    // Only mark if we have a valid document name
    if (normalizedDocName && normalizedDocName !== 'unknown') {
      const recentMoveKey = `recent_move_${normalizedDocName}`;
      processedMoveEvents.current.add(recentMoveKey);
      
      // Clean up the recent move marker after 5 seconds
      setTimeout(() => {
        processedMoveEvents.current.delete(recentMoveKey);
      }, 5000);
    }
  };

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
      console.log('🔄 [SOCKET] Received fileSystemUpdate:', data);
      
      // UNIFIED MOVE EVENT PROCESSING - Single operation for all move events
      if (data.type === 'move') {
        // Create a unified key that ignores eventType differences
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
          let normalized = path.replace(/\\/g, '/').toLowerCase();
          
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
        
        // Extract document name from sourcePath if documentName is unknown
        let docName = documentName;
        if (!docName || docName === 'unknown') {
          const fileName = sourcePath?.split('/').pop();
          if (fileName && fileName.includes('.')) {
            docName = fileName;
          }
        }
        
        const normalizedDocName = normalizeDocumentName(docName);
        const sourceFolder = normalizePath(sourcePath);
        const targetFolder = normalizePath(targetPath);
        
        // Create unified move key WITHOUT timestamp for better deduplication
        const unifiedMoveKey = `unified_move_${normalizedDocName}_${sourceFolder}_${targetFolder}`;
        
        // Only skip if this is a true duplicate (same event type and source/target)
        // Allow different event types for the same move operation
        const eventType = data.eventType || 'unknown';
        const moveKeyWithType = `${unifiedMoveKey}_${eventType}`;
        
        if (processedMoveEvents.current.has(moveKeyWithType)) {
          console.log('🔄 [SOCKET] Skipping duplicate unified move event:', moveKeyWithType);
          return;
        }
        
        // Add to processed set with event type
        processedMoveEvents.current.add(moveKeyWithType);
        
        console.log('🔄 [SOCKET] Processing unified move event:', moveKeyWithType);
        
        // Clean up after 3 seconds to catch all related events
        setTimeout(() => processedMoveEvents.current.delete(moveKeyWithType), 3000);
        
        // Process move as single operation
        handleUnifiedMoveEvent(data, sourceFolder, targetFolder, documentName);
        return; // Skip the rest of the processing
      }
      
      try {
        const sp = String(data?.sourcePath || data?.targetPath || '');
        const candidateFolder = extractFolderPathFromFsPath(sp);
        // Ignore events for paths/folders we just acted on locally for a short window
        if (
          suppressSocketPathsRef.current.has(sp) ||
          (candidateFolder && suppressSocketPathsRef.current.has(candidateFolder))
        ) {
          console.log('🔄 [SOCKET] Suppressed self-induced event for path:', candidateFolder || sp);
          return;
        }
      } catch {}
      
      // Handle different types of file system updates
      switch (data.type) {
        case 'move': {
          // This case is now handled by handleUnifiedMoveEvent above
          break;
        }
        case 'create_folder':
        case 'remove_folder':
          // Folder structure changed – force refresh to show new folders
          console.log('🔄 [SOCKET] Folder created/removed - forcing refresh');
          clearDocumentCache(currentFolder?.folder_path);
                      setTimeout(() => {
              fetchFolders();
              fetchDocuments(null, false, true); // Force refresh
            }, 500);
          break;
        case 'add': {
          // Check if this is an add event that follows a move operation
          try {
            const rawSrc = String(data?.sourcePath || data?.targetPath || '');
            const targetFolder = data?.targetFolder && data.targetFolder.includes('/')
              ? data.targetFolder
              : extractFolderPathFromFsPath(rawSrc);
            const fileName = (data?.documentName) || rawSrc.split('/').pop();

            // Skip version artifacts
            if (/_V\d+\.pdf$/i.test(fileName || '')) {
              console.log('🔄 [SOCKET] Version artifact add detected – skipping refresh');
              return;
            }

            // ✅ PREVENT ADD EVENTS AFTER MOVE OPERATIONS
            // Check if we recently processed a move for this document
            const recentMoveKey = `recent_move_${normalizeDocumentName(fileName)}`;

            // Establish event timing up-front (used in multiple checks below)
            const eventTimestamp = data.timestamp ? new Date(data.timestamp) : new Date();
            const now = new Date();
            const timeDiff = now - eventTimestamp;
            
            // Only skip if this is clearly a move-related add event
            // Allow genuine uploads even if document was recently moved
            if (processedMoveEvents.current.has(recentMoveKey)) {
              // Check if this is a genuine upload (has documentId or is recent)
              const hasDocumentId = data.documentId && data.documentId !== 'unknown';
              const isRecentUpload = timeDiff < 5000; // 5 seconds
              
              if (!hasDocumentId && !isRecentUpload) {
                console.log('🔄 [SOCKET] Skipping add event - document was recently moved:', fileName);
                return;
              } else {
                console.log('🔄 [SOCKET] Allowing add event despite recent move - genuine upload detected:', fileName);
              }
            }
            
            // Check if this is a recent upload (within last 10 seconds) - allow it
            const isRecentUpload = timeDiff < 10000; // 10 seconds
            
            // Check if this has a documentId (indicates a genuine upload from backend)
            const hasDocumentId = data.documentId && data.documentId !== 'unknown';
            
            if (isRecentUpload || hasDocumentId) {
              console.log('🔄 [SOCKET] Allowing add event - recent upload or has documentId detected:', fileName);
              // Continue processing
            }
            
            // Only skip if this is clearly a move operation (sourcePath contains the same document name)
            // But allow genuine add events from uploads
            const sourceFileName = rawSrc.split('/').pop();
            
            // Check if this is a genuine upload (not a move)
            // Uploads typically have sourcePath ending with the document name
            // But we should allow them if they're from the uploads directory
            if (sourceFileName && sourceFileName === fileName && rawSrc.includes('/uploads/')) {
              // This could be either a move or an upload
              // Let's check if we're in the current folder - if so, it's likely an upload
              const currentFolderPath = currentFolder?.folder_path?.toLowerCase();
              const targetFolderPath = targetFolder?.toLowerCase();
              
              // Allow if it's a genuine upload (has documentId or is recent)
              const hasDocumentId = data.documentId && data.documentId !== 'unknown';
              const isRecentUpload = timeDiff < 5000; // 5 seconds
              
              if (currentFolderPath && targetFolderPath && targetFolderPath.includes(currentFolderPath)) {
                console.log('🔄 [SOCKET] Allowing add event - likely a genuine upload:', fileName);
                // Don't return - continue processing
              } else if (hasDocumentId || isRecentUpload) {
                console.log('🔄 [SOCKET] Allowing add event - genuine upload detected:', fileName);
                // Don't return - continue processing
              } else {
                console.log('🔄 [SOCKET] Skipping add event - likely a move operation:', fileName);
                return;
              }
            }

            // Normalize paths for comparison
            const normalizePathForAdd = (path) => {
              if (!path) return '';
              let normalized = path.replace(/\\/g, '/').toLowerCase();
              
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
            
            const normalizedTargetFolder = normalizePathForAdd(targetFolder);
            const normalizedCurrentFolder = normalizePathForAdd(currentFolder?.folder_path);
            
            console.log('🔍 [PATH COMPARISON] Debug info:');
            console.log('  - fileName:', fileName);
            console.log('  - targetFolder (raw):', targetFolder);
            console.log('  - currentFolder (raw):', currentFolder?.folder_path);
            console.log('  - normalizedTargetFolder:', normalizedTargetFolder);
            console.log('  - normalizedCurrentFolder:', normalizedCurrentFolder);
            console.log('  - paths match:', normalizedTargetFolder === normalizedCurrentFolder);
            
            // If we are inside the target folder → optimistic add placeholder
            if (normalizedTargetFolder && normalizedCurrentFolder === normalizedTargetFolder && fileName) {
              // Clear cache for this folder to force fresh data
              clearPdfCacheForFolder(normalizedCurrentFolder);
              clearDocumentCache(normalizedCurrentFolder);
              
              const placeholder = {
                id_document: `temp_${Date.now()}`,
                nom_document: fileName,
                path: targetFolder,
                uploadDate: new Date().toISOString(),
                type: 'Official Document',
                file_size: 0
              };
              setDocuments(prev => {
                const list = (prev || []).slice();
                if (!list.some(d => d?.nom_document === fileName)) list.unshift(placeholder);
                return list;
              });

              // Force a fresh fetch after a short delay to get the real document data
              setTimeout(() => {
                console.log('🔄 [SOCKET] Executing fresh fetch for document:', fileName);
                fetchDocuments(null, false, true); // Force fresh fetch, bypass cache
              }, 500);

              console.log('🔄 [SOCKET] Document added optimistically - cache cleared and fresh fetch scheduled');
            } else {
              console.log('🔄 [SOCKET] Document added to different folder - no refresh needed');
            }
          } catch (e) {
            console.log('🔄 [SOCKET][ADD] handler error:', e?.message);
          }
          break;
        }
        case 'delete':
        case 'restore':
          // Document set changed – pure optimistic update
          console.log('🔄 [SOCKET] Document deleted/restored optimistically - no refresh needed');
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
      
      // Pure optimistic update - zero refresh
      console.log('🔄 [ELECTRON] Document moved optimistically - zero refresh');
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

  // 🆕 SYNC-AGENT NOTIFICATION SYSTEM: Listen for folder updates from Sync-Agent (stable - init once)
  useEffect(() => {
    console.log('🔄 [SYNC-AGENT] Initializing notification system for folder updates');
    
    // Function to handle cache invalidation
    const invalidateFolderCache = (folderPath, operationType, documentName) => {
      try {
        console.log('🔄 [SYNC-AGENT] Processing cache invalidation for:', {
          folderPath,
          operationType,
          documentName
        });
        
        // For move operations we only mark as stale; actual fetch happens lazily on navigation
        if (operationType && operationType.includes('move')) {
          console.log('🔄 [SYNC-AGENT] Move operation detected - mark related folders stale only');
          
          // 🆕 CLEAR ALL RELATED FOLDER CACHES
          const allPossibleFolders = [];
          
          // Add the notification folder
          if (folderPath) {
            allPossibleFolders.push(folderPath.toLowerCase());
          }
          
          // For move operations, also clear common folders that might be affected
          if (operationType.includes('move_source') || operationType.includes('move_target')) {
            const commonFolders = [
              'scoala dabuleni/huijen',
              'scoala dabuleni/raafel',
              'scoala dabuleni/numenou',
              'scoala dabuleni/prrra'
            ];
            
            commonFolders.forEach(folder => {
              if (!allPossibleFolders.includes(folder)) {
                allPossibleFolders.push(folder);
              }
            });
          }
          
          console.log('🔄 [SYNC-AGENT] Marking related folders as stale:', allPossibleFolders);

          // Mark for forced refresh only (no immediate cache deletion)
          allPossibleFolders.forEach(folder => {
            const key = folder.replace(/\\/g, '/').toLowerCase();
            window.recentlyInvalidatedFolders = window.recentlyInvalidatedFolders || new Set();
            window.recentlyInvalidatedFolders.add(key);
            console.log('🟡 [SYNC-AGENT] Marked folder stale (no clear):', key);
          });
          // No immediate HTTP here; refresh happens lazily on navigation
        } else {
          // For other operations (add/delete), invalidate only the specific folder
          const normalizedFolderPath = folderPath.toLowerCase();
          if (documentCache.has(normalizedFolderPath)) {
            documentCache.delete(normalizedFolderPath);
            console.log('🗑️ [SYNC-AGENT] Cleared document cache for folder:', normalizedFolderPath);
          }
          
          // Clear PDF cache safely (check if function exists)
          try {
            const clearPdfCache = window.clearPdfCacheForFolder;
            if (typeof clearPdfCache === 'function') {
              clearPdfCache(normalizedFolderPath);
            } else {
              // Fallback: Clear PDF cache manually
              const storedCache = JSON.parse(localStorage.getItem('pdfCache') || '{}');
              if (storedCache[normalizedFolderPath]) {
                delete storedCache[normalizedFolderPath];
                localStorage.setItem('pdfCache', JSON.stringify(storedCache));
                console.log('🗑️ [SYNC-AGENT] Cleared PDF cache for folder (fallback):', normalizedFolderPath);
              }
            }
          } catch (error) {
            console.log('⚠️ [SYNC-AGENT] PDF cache clear error (ignored):', error.message);
          }
          
          // Mark for forced refresh (normalized key)
          window.recentlyInvalidatedFolders = window.recentlyInvalidatedFolders || new Set();
          window.recentlyInvalidatedFolders.add(normalizedFolderPath.replace(/\\/g, '/').toLowerCase());
          
          // No immediate HTTP here; refresh happens lazily on navigation
        }
        
        // Force refresh of folder structure to show updated counts
        setTimeout(() => {
          fetchFolders();
        }, 100);
        
        console.log('✅ [SYNC-AGENT] Cache invalidation completed for:', folderPath);
      } catch (error) {
        console.error('❌ [SYNC-AGENT] Error in cache invalidation:', error);
      }
    };
    
    // 🆕 LISTENER FOR localStorage EVENTS (cross-origin communication)
    const handleStorageChange = (event) => {
      if (event.key === 'sync-agent-folder-update') {
        try {
          const updateEvent = JSON.parse(event.newValue);
          console.log('🔄 [SYNC-AGENT] Received localStorage notification:', updateEvent);
          invalidateFolderCache(updateEvent.folderPath, updateEvent.operationType, updateEvent.documentName);
        } catch (error) {
          console.error('❌ [SYNC-AGENT] Error parsing localStorage notification:', error);
        }
      }
    };
    
    // 🆕 LISTENER FOR CustomEvent (same-origin communication)
    const handleCustomEvent = (event) => {
      console.log('🔄 [SYNC-AGENT] Received CustomEvent notification:', event.detail);
      invalidateFolderCache(event.detail.folderPath, event.detail.operationType, event.detail.documentName);
    };
    
    // 🆕 LISTENER FOR postMessage (cross-frame communication)
    const handlePostMessage = (event) => {
      if (event.data && event.data.type === 'sync-agent-folder-update') {
        console.log('🔄 [SYNC-AGENT] Received postMessage notification:', event.data);
        invalidateFolderCache(event.data.folderPath, event.data.operationType, event.data.documentName);
      }
    };
    
    // Add all event listeners
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sync-agent-folder-update', handleCustomEvent);
    window.addEventListener('message', handlePostMessage);
    
    console.log('✅ [SYNC-AGENT] Notification system initialized successfully');
    
    // Cleanup function
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sync-agent-folder-update', handleCustomEvent);
      window.removeEventListener('message', handlePostMessage);
      console.log('🔄 [SYNC-AGENT] Notification system cleaned up');
    };
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all data in parallel for faster loading
      await Promise.all([
        fetchUserId(),
        checkUserInstitution(),
        fetchFolders(),
        fetchAvailableFiltersData()
      ]);
    } catch (error) {
      console.error('Error in fetchData:', error);
    }
  };

  // Hover expand for tags/keywords (+1 overlays)
  const [hoverExpand, setHoverExpand] = useState({ section: null, id: null });
  const hoverTimerRef = useRef(null);
  const startHoverExpand = (section, id) => {
    try { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); } catch {}
    hoverTimerRef.current = setTimeout(() => setHoverExpand({ section, id }), 600);
  };
  const endHoverExpand = () => {
    try { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); } catch {}
    setHoverExpand({ section: null, id: null });
  };

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    // Only fetch data once on mount
    if (!autoSelectionDone) {
      fetchData();
    }

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []); // Empty dependency array to run only once

  // Handle deep-link parameters from URL (for navigation from SearchPage)
  const deepLinkHandledRef = useRef(false);
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const folderParam = urlParams.get('folder');
    const pageParam = urlParams.get('page');
    const highlightParam = urlParams.get('highlight');
    const docIdParam = urlParams.get('docId');
    
    if (folderParam && folders.length > 0) {
      console.log('📁 Navigating to folder from URL:', folderParam);
      if (pageParam) {
        console.log('📄 Navigating to page:', pageParam);
        setCurrentPage(parseInt(pageParam) || 1);
      }
      if (highlightParam) {
        console.log('🎯 Highlighting document:', highlightParam);
        // Store highlight parameter for later use
        sessionStorage.setItem('highlightDocument', highlightParam);
      }
      if (docIdParam) {
        try {
          const parsedId = parseInt(docIdParam, 10);
          if (!Number.isNaN(parsedId)) {
            sessionStorage.setItem('highlightDocumentId', String(parsedId));
          }
        } catch {}
      }
      
      // Find the folder by path
      const targetFolder = folders.find(folder => folder.folder_path === folderParam);
      
      if (targetFolder) {
        console.log('✅ Found target folder:', targetFolder);
        setCurrentFolder(targetFolder);
        setCurrentPath(targetFolder.folder_path);
        
        // Immediately fetch PDFs for the target folder
        console.log('📡 Immediately fetching PDFs for target folder:', targetFolder.folder_path);
        
        // Force refresh documents and PDFs when navigating from SearchPage
        setTimeout(async () => {
          try {
            // Clear any existing PDF cache for this folder to force refresh
            clearPdfCacheForFolder(targetFolder.folder_path);
            // Also clear document cache to ensure fetchDocuments hits the network
            try { clearDocumentCache(targetFolder.folder_path); } catch {}
            
            // First fetch documents for the target folder (explicit path to avoid race with state)
            await fetchDocuments(targetFolder.folder_path, false);
            
            // Then fetch PDFs with fresh cache
            await fetchMultiplePdfs(targetFolder.folder_path);
            
            console.log('✅ Successfully loaded documents and PDFs for target folder');

            // Simple direct approach: fetch folder documents and calculate page
            const highlightName = sessionStorage.getItem('highlightDocument');
            const highlightIdRaw = sessionStorage.getItem('highlightDocumentId');
            const highlightId = highlightIdRaw ? parseInt(highlightIdRaw, 10) : undefined;

            if ((highlightName || highlightId) && !deepLinkHandledRef.current) {
              deepLinkHandledRef.current = true;
              console.log('🎯 Direct navigation to document:', highlightName, 'ID:', highlightId);
              
              // Show loading overlay during navigation
              setIsNavigating(true);
              
              // Fetch documents directly from the API for this folder
              setTimeout(async () => {
                try {
                  const folderPath = targetFolder.folder_path;
                  console.log('📡 Fetching documents for folder:', folderPath);
                  
                  const response = await fetch(`http://192.168.0.13:3003/post_docs/documents/folder/${encodeURIComponent(folderPath)}`, {
                    credentials: 'include'
                  });
                  
                  if (response.ok) {
                    const data = await response.json();
                    const folderDocuments = data.documents || [];
                    console.log('📋 Fetched', folderDocuments.length, 'documents from API');
                    console.log('📋 Raw API data structure:', folderDocuments[0]); // Debug first document structure
                    console.log('📋 API document order:', folderDocuments.map((d, i) => `${i+1}. ${d.name} (ID: ${d.id})`));
                    
                    // Apply the same sorting/filtering as the UI does
                    // Filter out deleted documents
                    const activeDocuments = folderDocuments.filter(doc => 
                      doc.is_deleted !== 1 && doc.is_deleted !== true
                    );
                    
                    // Apply the same sorting as filterAndSortDocuments function
                    // Default sorting: name ascending (A→Z)
                    const sortedDocuments = activeDocuments.sort((a, b) => {
                      // Sort by name ascending (A→Z) - same as UI default
                      return a.name.localeCompare(b.name);
                    });
                    
                    console.log('📋 UI-sorted document order:', sortedDocuments.map((d, i) => `${i+1}. ${d.name} (ID: ${d.id})`));
                    
                    // Search for the document in the sorted list
                    let documentIndex = -1;
                    
                    // Try ID-based search first in the sorted list
                    if (highlightId && Number.isFinite(highlightId)) {
                      console.log('🔍 Searching by ID:', highlightId);
                      documentIndex = sortedDocuments.findIndex(doc => {
                        const docIdNum = Number(doc.id);
                        const match = Number.isFinite(docIdNum) && docIdNum === highlightId;
                        if (match) console.log('✅ Found by ID:', doc.name);
                        return match;
                      });
                    }
                    
                    // Fallback to name-based search in the sorted list
                    if (documentIndex === -1 && highlightName) {
                      console.log('🔍 Searching by name:', highlightName);
                      const targetName = highlightName.toLowerCase().trim();
                      documentIndex = sortedDocuments.findIndex(doc => {
                        const docName = (doc.name || '').toLowerCase().trim();
                        const match = docName === targetName;
                        if (match) console.log('✅ Found by name:', doc.name);
                        return match;
                      });
                    }
                    
                    if (documentIndex !== -1) {
                      const documentsPerPage = 10; // Standard pagination
                      const targetPage = Math.floor(documentIndex / documentsPerPage) + 1;
                      console.log(`🎯 Document found at position ${documentIndex + 1} (index ${documentIndex})`);
                      console.log(`📄 Navigating to page ${targetPage} (${documentsPerPage} docs per page)`);
                      
                      setCurrentPage(targetPage);
                      
                      // Hide loading overlay after a short delay to ensure page is fully loaded
                      setTimeout(() => {
                        setIsNavigating(false);
                      }, 800);
                    } else {
                      console.log('⚠️ Document not found in folder');
                      console.log('📋 Available documents:', sortedDocuments.map(d => `${d.name} (ID: ${d.id})`));
                      // Hide loading overlay even if document not found
                      setIsNavigating(false);
                    }
                  } else {
                    console.error('❌ Failed to fetch folder documents');
                    // Hide loading overlay on error
                    setIsNavigating(false);
                  }
                } catch (error) {
                  console.error('❌ Error fetching folder documents:', error);
                  // Hide loading overlay on error
                  setIsNavigating(false);
                }
                
                // Always cleanup
                sessionStorage.removeItem('highlightDocument');
                sessionStorage.removeItem('highlightDocumentId');
              }, 1000); // Wait a bit for folder to be set
            }
          } catch (error) {
            console.error('Error loading documents and PDFs for target folder:', error);
          }
        }, 100); // Small delay to ensure state is updated
        
        // Clear the URL parameter after navigation
        const newUrl = new URL(window.location);
        newUrl.searchParams.delete('folder');
        window.history.replaceState({}, '', newUrl);
      } else {
        console.log('❌ Folder not found:', folderParam);
      }
    }
  }, [folders]); // Depend on folders to ensure they're loaded

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

  // Export clearPdfCacheForFolder to window for Sync-Agent notifications
  React.useEffect(() => {
    window.clearPdfCacheForFolder = clearPdfCacheForFolder;
    return () => {
      delete window.clearPdfCacheForFolder;
    };
  }, [clearPdfCacheForFolder]);

  // Instant folder navigation with cache support
  useEffect(() => {
    if (!currentFolder?.folder_path) return;

    // Start a new navigation trace
    const navId = ++navSeqRef.current;
    currentNavRef.current = { id: navId, path: currentFolder.folder_path };
    logNav('START', { path: currentFolder.folder_path });
    
    console.log('🔄 Loading data for folder:', currentFolder.folder_path);
    
    // 🆕 CHECK FOR RECENTLY INVALIDATED FOLDERS: Force refresh if folder was recently invalidated
    const isRecentlyInvalidated = (() => {
      if (!window.recentlyInvalidatedFolders) return false;
      const norm = (p) => (p || '').replace(/\\/g, '/').toLowerCase();
      const key = norm(currentFolder.folder_path);
      if (window.recentlyInvalidatedFolders.has(key)) return true;
      // Backward compatibility: some entries might be stored non-normalized
      return window.recentlyInvalidatedFolders.has(currentFolder.folder_path);
    })();
    
    if (isRecentlyInvalidated) {
      console.log('🔄 [FORCE REFRESH] Folder was recently invalidated, forcing HTTP request:', currentFolder.folder_path);
      logNav('FORCE_REFRESH', { path: currentFolder.folder_path });
      // Remove from invalidated set (both forms)
      const norm = (p) => (p || '').replace(/\\/g, '/').toLowerCase();
      window.recentlyInvalidatedFolders.delete(norm(currentFolder.folder_path));
      window.recentlyInvalidatedFolders.delete(currentFolder.folder_path);
    }
    
    // Check cache first for instant loading (unless it's an optimistic/minimal cache)
    if (documentCache.has(currentFolder.folder_path)) {
      const cached = documentCache.get(currentFolder.folder_path) || [];
      const looksOptimistic = Array.isArray(cached) && cached.some(d => {
        if (!d) return true;
        const hasTempId = typeof d.id_document === 'string' && d.id_document.startsWith('temp_');
        const negativeId = typeof d.id_document === 'number' && d.id_document < 0;
        const missingMeta = !d.date_upload || !d.type_name;
        return hasTempId || negativeId || missingMeta;
      });
      // If recently invalidated or cache likely created by optimistic add (e.g., contains placeholders), bypass cache
      if (isRecentlyInvalidated || looksOptimistic) {
        logNav('FORCE_REFRESH', { path: currentFolder.folder_path });
        setIsLoadingDocuments(true);
        // Fetch for the CURRENT folder (pass null) so state is updated immediately
        fetchDocuments(null, false, true); // Force HTTP and update visible state
        return; // Skip rendering cached list of 1 item
      }
      logNav('CACHE_HIT', { path: currentFolder.folder_path });
      // Ensure loading flag is false to avoid skeleton flicker
      setIsLoadingDocuments(false);
      // Hydrate previews from persistent cache immediately (if present)
      loadCachedPdfs(currentFolder.folder_path);
      // Show cached documents instantly
      setDocuments(documentCache.get(currentFolder.folder_path));
      // Load fresh PDFs in background (non-blocking)
      setTimeout(() => {
        logNav('PDF_BG_FETCH_START');
        fetchMultiplePdfs(currentFolder.folder_path).then(() => {
          logNav('PDF_BG_FETCH_DONE');
        }).catch(error => {
          console.error('Error loading PDFs:', error);
          logNav('PDF_BG_FETCH_ERROR', error?.message || String(error));
        });
      }, 50);
      logNav('CACHE_RENDERED');
      return;
    }
    
    // If not cached, load immediately without debouncing
    const loadData = async () => {
      try {
        // Load documents first
        logNav('DOC_FETCH_START');
        await fetchDocuments();
        logNav('DOC_FETCH_DONE');
        
        // Load PDFs in background
        setTimeout(() => {
          logNav('PDF_BG_FETCH_START');
          fetchMultiplePdfs(currentFolder.folder_path).then(() => {
            logNav('PDF_BG_FETCH_DONE');
          }).catch(error => {
            console.error('Error loading PDFs:', error);
            logNav('PDF_BG_FETCH_ERROR', error?.message || String(error));
          });
        }, 100);
        
      } catch (error) {
        console.error('Error in folder navigation effect:', error);
        logNav('ERROR', error?.message || String(error));
      }
    };
    
    loadData().finally(() => logNav('END'));
  }, [currentFolder?.folder_path, currentFolder?.id]);

  // Optimized useEffect for Recycle Bin modal - only fetch deleted items when modal opens
  useEffect(() => {
    if (showRecycleBinModal) {
      fetchDeletedItems();
    }
  }, [showRecycleBinModal]);

  const handleNavigate = async (folder) => {
    // Prevent rapid navigation
    if (isNavigating) {
      console.log('⚠️ Navigation already in progress, skipping...');
      return;
    }
    
    try {
      console.log('🔄 Navigating to folder:', folder.folder_path);
      setIsNavigating(true);
      
      // Update folder history first
      setFolderHistory(prev => [...prev, currentFolder]);
      
      // Set current folder immediately for instant UI response
      setCurrentFolder(folder);
      
      // Reset cache miss tracking for new folder
      if (window.cacheMissLogged) {
        window.cacheMissLogged.clear();
      }
      
      // Don't clear documents immediately - let cache handle it
      
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
          if (data.success) {
            setFolders(data.folders);
          }
        })
        .catch(error => {
          console.error('Error fetching folders:', error);
        })
        .finally(() => {
          setIsNavigating(false);
        });
      } else {
        setIsNavigating(false);
      }
    } catch (error) {
      console.error('Error navigating to folder:', error);
      setError(error.message);
      setIsNavigating(false);
    }
  };

  const handleNavigateBack = async () => {
    if (folderHistory.length > 0) {
      const previousFolder = folderHistory[folderHistory.length - 1];
      
      // Verificăm dacă folderul anterior există și are proprietatea folder_path
      if (!previousFolder || !previousFolder.folder_path) {
        // Dacă folderul anterior nu există sau nu are path, mergem la root
        setCurrentFolder(null);
        setFolderHistory([]);
        await fetchFolders();
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

  const filterAndSortDocuments = (docs) => {
    // Only log when there are actual changes or debugging is needed
    const shouldLog = docs.length > 0 && (searchQuery || isContentFilterActive || isAdvancedFilterActive);
    if (shouldLog) {
      console.log('🔍 Filtering documents...', { count: docs.length, searchMode, hasQuery: !!searchQuery });
    }
    
    // Filter out invalid documents first
    let filteredDocs = [...docs].filter(doc => doc && doc.nom_document);
    
    // Apply content-based filter first if active
    if (isContentFilterActive && contentSearchResults.length > 0) {
      const resultIds = contentSearchResults.map(result => result.id_document);
      filteredDocs = filteredDocs.filter(doc => resultIds.includes(doc.id_document));
      console.log('Filtered by content search:', filteredDocs.length, 'documents');
    }
    
    // Apply advanced filters if active
    if (isAdvancedFilterActive) {
      console.log('🔍 Applying advanced filters:', advancedFilters);
      
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
        console.log('🔍 Filtering by keywords:', advancedFilters.keywords);
      filteredDocs = filteredDocs.filter(doc => {
        const docKeywords = [
          doc.mot1,
          doc.mot2,
          doc.mot3,
          doc.mot4,
          doc.mot5
        ].filter(Boolean).map(k => k.toLowerCase());
        
          console.log('📋 Document keywords for', doc.nom_document, ':', docKeywords);
          
          const matches = advancedFilters.keywords.some(filterKeyword =>
            docKeywords.some(keyword => keyword.includes(filterKeyword.toLowerCase()))
          );
          
          console.log('✅ Document', doc.nom_document, 'matches keywords:', matches);
        return matches;
      });
        console.log('📄 After keyword filter:', filteredDocs.length, 'documents');
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
        console.log('🔍 Filtering by document type:', advancedFilters.documentType);
        filteredDocs = filteredDocs.filter(doc => {
          console.log('📋 Document type for', doc.nom_document, ':', doc.type, 'vs filter:', advancedFilters.documentType);
          const matches = doc.type && doc.type.toLowerCase() === advancedFilters.documentType.toLowerCase();
          console.log('✅ Document', doc.nom_document, 'matches type:', matches);
          return matches;
        });
        console.log('📄 After document type filter:', filteredDocs.length, 'documents');
      }
      
      console.log('📄 After advanced filters:', filteredDocs.length, 'documents');
    }
    
    // Apply traditional search filters
    if (searchMode === 'id' && searchQuery) {
      console.log('🔍 Applying ID filter:', searchQuery);
      filteredDocs = filteredDocs.filter(doc =>
        doc.id_document && doc.id_document.toString().includes(searchQuery)
      );
      console.log('📄 After ID filter:', filteredDocs.length, 'documents');
    } else if (searchMode === 'title' && searchQuery) {
      filteredDocs = filteredDocs.filter(doc => 
        doc.nom_document.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (shouldLog) {
      console.log('✅ Final filtered documents:', filteredDocs.length);
    }
    return sortDocuments(filteredDocs);
  };

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
    const sortedDocuments = sortDocuments(documentsOnly);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedDocuments.slice(startIndex, endIndex);
  };

  // Function to get total pages - Only for documents
  const getTotalPages = () => {
    const allItems = getCurrentItems;
    const documentsOnly = allItems.filter(item => item.type === 'file');
    const sortedDocuments = sortDocuments(documentsOnly);
    return Math.ceil(sortedDocuments.length / itemsPerPage);
  };

  // Reset page when folder changes, filters change, or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentFolder, searchQuery, isAdvancedFilterActive, isContentFilterActive, sortType, sortDirection]);

  // Prefetch thumbnails for current page on page/folder change (virtualized loading)
  useEffect(() => {
    if (!currentFolder) return;
    try {
      const allItems = getCurrentItems;
      const docs = allItems.filter((i) => i.type === 'file');
      const offset = (currentPage - 1) * itemsPerPage;
      const pageDocs = docs.slice(offset, offset + itemsPerPage);
      const names = pageDocs.map((d) => d.nom_document || d.name).filter(Boolean);
      if (names.length > 0) {
        fetchMultiplePdfs(currentFolder.folder_path, { names }).catch(() => {});
      }
      // Optional: prefetch next page for smooth scroll
      const nextOffset = offset + itemsPerPage;
      const nextDocs = docs.slice(nextOffset, nextOffset + itemsPerPage);
      const nextNames = nextDocs.map((d) => d.nom_document || d.name).filter(Boolean);
      if (nextNames.length > 0) {
        fetchMultiplePdfs(currentFolder.folder_path, { names: nextNames }).catch(() => {});
      }
    } catch {}
  }, [currentFolder?.folder_path, currentPage, itemsPerPage, getCurrentItems]);

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

        // Optimistic UI update instead of immediate fetch
        try {
          // Remove from source cache and visible list
          setDocumentCache(prev => {
            const newCache = new Map(prev);
            const srcDocs = (newCache.get(sourceFolderPath) || []).filter(doc => !(doc.nom_document === fileName && doc.path === sourceFolderPath));
            newCache.set(sourceFolderPath, srcDocs);
            return newCache;
          });
          setDocuments(prev => prev.filter(doc => !(doc.nom_document === fileName && doc.path === sourceFolderPath)));
          // Add to destination cache if present
          setDocumentCache(prev => {
            const newCache = new Map(prev);
            const dstDocs = newCache.get(targetFolder.folder_path) || [];
            if (!dstDocs.some(doc => doc.nom_document === fileName)) {
              newCache.set(targetFolder.folder_path, [...dstDocs, { nom_document: fileName, path: targetFolder.folder_path, id_document: draggedItem.id_document || draggedItem.id }]);
            }
            return newCache;
          });
        } catch {}

        // Update current folder if we're in source or destination folder
        if (currentFolder) {
          const isInSourceFolder = currentFolder.folder_path === sourceFolderPath;
          const isInDestinationFolder = currentFolder.folder_path === targetFolder.folder_path;

          if (isInSourceFolder || isInDestinationFolder) {
            // Avoid extra folder refresh; state already updated optimistically
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
  const pdfBgTimingRef = useRef({});

  const fetchMultiplePdfs = async (folderPath, { limit = null, offset = 0, names = null } = {}) => {
    try {
      // Check if already fetching this folder
      if (fetchMultiplePdfsRef.current[folderPath]) {
        return;
      }
      
      fetchMultiplePdfsRef.current[folderPath] = true;
      // Start smooth loading indicator for thumbnails
      setIsLoadingPdfs(true);
      // Start timing
      const startTs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      pdfBgTimingRef.current[folderPath] = startTs;
      
      // Quick cache check for instant loading (hydrate in-memory but do NOT block network)
      loadCachedPdfs(folderPath);

      // Fast fetch without extra checks for instant loading
      const params = new URLSearchParams();
      if (typeof limit === 'number' && limit > 0) params.set('limit', String(limit));
      if (typeof offset === 'number' && offset > 0) params.set('offset', String(offset));
      if (Array.isArray(names) && names.length > 0) params.set('names', names.join(','));
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`${backend}/post_docs/diffuse/batch-view/${encodeURIComponent(folderPath)}${query}`, {
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
      // Timing log on success
      const endTs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const durationMs = Math.round(endTs - (pdfBgTimingRef.current[folderPath] || endTs));
      const count = data.pdfs ? Object.keys(data.pdfs).length : 0;
      console.log(`⏱️ PDF_BG_FETCH_DONE: folder="${folderPath}" in ${durationMs} ms (thumbnails: ${count})`);
      
      return data.pdfs;
    } catch (error) {
      console.error('Error fetching PDFs:', error);
      // Timing log on error
      const endTs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const start = pdfBgTimingRef.current[folderPath];
      if (start) {
        const durationMs = Math.round(endTs - start);
        console.log(`⏱️ PDF_BG_FETCH_ERROR: folder="${folderPath}" after ${durationMs} ms`);
      }
      throw error;
    } finally {
      fetchMultiplePdfsRef.current[folderPath] = false;
      // Slight delay to avoid flicker on quick loads
      setTimeout(() => setIsLoadingPdfs(false), 120);
    }
  };

  const handleFileClick = async (e, file) => {
    e.preventDefault();
    e.stopPropagation();
    
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
      
      // Open modal immediately for instant response
      setShowPdfModal(true);
      
      console.log('🎯 File click complete - state set:', {
        selectedFile: file.nom_document,
        targetPageNumber: targetPage,
        pageNumber: targetPage,
        showPdfModal: true
      });
      
      // Pre-load document details asynchronously after modal opens
      setTimeout(async () => {
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
      }, 50); // Small delay to ensure modal opens first
      
      // Log document view asynchronously
      setTimeout(async () => {
        try {
          await fetch(`${backend}/document_log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nom_doc: file.nom_document }),
            credentials: 'include'
          });
        } catch (error) {
          console.error('Error logging document view:', error);
        }
      }, 100);
      
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
      // Suppress socket refresh for this path (file watcher 'add'/'move') and for the folder
      addSocketSuppression(fullPath, fileToDelete.path);
      
 

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
        try { clearDocumentCache(fileToDelete.path); } catch {}

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
      // Suppress socket refresh for this path as we will update UI optimistically
      try { addSocketSuppression(`${destinationPath}/${item.name}`, destinationPath); } catch {}

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
        // Invalidate caches for source and destination folders
        try {
          if (item && item.path) {
            clearPdfCacheForFolder(item.path);
          }
          if (destinationPath) {
            clearPdfCacheForFolder(destinationPath);
          }
        } catch {}
        // Also clear global cache for this file if present
        try {
          if (window && window.globalPdfCache && item && item.name && item.path) {
            const cacheKey = `${item.path}/${item.name}`;
            window.globalPdfCache.delete(cacheKey);
          }
        } catch {}
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
          // Build document object with the shape expected by the listing (nom_document, id_document, path)
          const restoredDoc = {
            id_document: (result && result.file && result.file.id) || item.id,
            nom_document: (result && result.file && result.file.name) || item.name,
            path: destinationPath,
            type: 'file',
            type_id: (result && result.file && result.file.type_id) || undefined,
            first_page: (result && result.file && result.file.first_page) || undefined,
            file_size: (result && result.file && result.file.file_size) || undefined
          };
          addDocumentInstantly(restoredDoc);
          // Skip the next fetch if it would be a cache hit with the same content
          setDocumentCache(prev => new Map(prev).set(destinationPath, (prev.get(destinationPath) || []).concat([])));
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

  // Handle creating first folder for personal accounts
  const handleCreateFirstFolder = async (folderName) => {
    try {
      setLoading(true);
      const response = await fetch(`${backend}/post_docs/folders`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          folderName: folderName,
          parentPath: null, // Root level for personal accounts
          isPrivate: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create folder');
      }

      const data = await response.json();
      if (data.success) {
        console.log('Creating first folder for personal account:', { name: folderName });
        
        // Refresh folders list
        await fetchFolders();
        
        // Auto-select the newly created folder
        const newFolder = { folder_name: folderName, folder_path: folderName };
        setCurrentFolder(newFolder);
        setCurrentPath(folderName);
        setAutoSelectionDone(true);
        
        // Show success message
        setSuccess('Welcome! Your first folder has been created successfully!');
        setTimeout(() => setSuccess(null), 5000);
      } else {
        throw new Error(data.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating first folder:', error);
      setError(error.message || 'Failed to create folder');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // First Folder Modal for Personal Accounts
  const FirstFolderModal = ({ isOpen, onClose, onCreateFolder }) => {
    const [folderName, setFolderName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
      if (!folderName.trim()) return;
      
      setIsCreating(true);
      try {
        await onCreateFolder(folderName.trim());
        onClose();
      } catch (error) {
        console.error('Error creating first folder:', error);
      } finally {
        setIsCreating(false);
      }
    };

    if (!isOpen) return null;

    return createPortal(
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[99999]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 max-w-md w-full mx-4"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center mb-6">
            <motion.div
              className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <FaFolderPlus className="w-8 h-8 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your First Folder</h2>
            <p className="text-gray-600">
              Welcome to your personal workspace! Create your first folder to start organizing your documents.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Folder Name
              </label>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-300"
                placeholder="My Documents"
                onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <motion.button
                onClick={onClose}
                className="flex-1 py-3 px-6 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={handleCreate}
                disabled={!folderName.trim() || isCreating}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isCreating ? (
                  <motion.div
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mx-auto"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                ) : (
                  'Create Folder'
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>,
      document.body
    );
  };

  return (
    <div className="min-h-screen">
      {/* Modern Sidebar for Folder Management */}
      <FolderSidebar
        currentPath={currentPath}
        folders={folders}
        currentFolder={currentFolder}
        draggedItem={draggedItem}
        isDragging={isDragging}
        userRole={(typeof window !== 'undefined' && (localStorage.getItem('userRole') || 'user'))}
        onRefreshFolders={fetchFolders}
        onRefreshDocuments={fetchDocuments}
        onFolderSelect={async (folder) => {
          if (folder.name === 'Root') {
            setCurrentFolder(null);
            setCurrentPath('');
            setFolderHistory([]);
          } else {
            setCurrentFolder(folder);
            setCurrentPath(folder.folder_path || folder.name);
            // Add to history
            setFolderHistory(prev => [...prev, folder]);
          }
          // Fetch documents for the selected folder (PDFs will be loaded automatically)
          await fetchDocuments();
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
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"
          />
        </div>
      ) : (
        <div className="px-6 py-6 ml-80 relative bg-[radial-gradient(900px_300px_at_80%_-10%,rgba(139,92,246,0.06),transparent_60%)]" style={{ maxWidth: 'calc(100vw - 20rem)' }}>
          {/* Documents Section - Only show when inside a folder */}
          {currentFolder && (
            <div className="mt-4">
              {/* Documents Tab Header */}
              <div className="relative max-w-full mx-auto">
                {/* Clean Professional Header */}
                <div className="relative overflow-hidden rounded-xl ml-0 mr-2 shadow-lg bg-gradient-to-r from-purple-600 to-indigo-600 border border-purple-500/20">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                  <div className="relative px-6 py-4">
                    <div className="flex justify-between items-center">
                      {/* Left: Clean Title Section */}
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/30">
                          <FaFolderOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white">Document Explorer</h2>
                          <p className="text-sm text-white/80">Professional Document Management</p>
                        </div>
                      </div>
                      
                      {/* Center: Clean Search */}
                      <div className="flex-1 max-w-md mx-8">
                        <div className="relative">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={handleKeywordSearch}
                            placeholder={searchMode === 'title' ? "Search by title..." : "Search by ID..."}
                            className="w-full pl-10 pr-12 py-2.5 text-sm bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg focus:outline-none focus:border-white/50 focus:bg-white/30 transition-all duration-200 text-white placeholder-white/70"
                          />
                          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70 w-4 h-4" />
                          
                          {/* Search Mode Toggle Button */}
                          <button
                            onClick={() => {
                              setSearchMode(searchMode === 'title' ? 'id' : 'title');
                              setSearchQuery('');
                              setSelectedKeywords([]);
                              setIsKeywordDropdownOpen(false);
                            }}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors duration-200"
                            title={`Switch to search by ${searchMode === 'title' ? 'ID' : 'title'}`}
                          >
                            <FaExchangeAlt className="text-white w-3 h-3" />
                          </button>
                          
                          {searchQuery && (
                            <button
                              onClick={() => setSearchQuery('')}
                              className="absolute right-10 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white transition-colors duration-200"
                            >
                              <FaTimes className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Right: Clean Toolbar */}
                      <div className="flex items-center gap-2">
                        {/* Filter Button */}
                        <button
                          onClick={() => {
                            setShowAdvancedFilterModal(true);
                            fetchAvailableFiltersData();
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            isAdvancedFilterActive
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white/20 text-white hover:bg-white/30'
                          }`}
                        >
                          <FaCog className="w-4 h-4" />
                          <span>Filter</span>
                          {isAdvancedFilterActive && (
                            <span className="bg-white text-emerald-600 rounded-full text-xs font-bold px-1.5 py-0.5 min-w-[16px] text-center">
                              ✓
                            </span>
                          )}
                        </button>
                        
                        {/* Metadata Button */}
                        <button
                          onClick={() => setShowContentSearchModal(true)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            isContentFilterActive
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white/20 text-white hover:bg-white/30'
                          }`}
                        >
                          <FaSearch className="w-4 h-4" />
                          <span>Metadata</span>
                          {isContentFilterActive && (
                            <span className="bg-white text-emerald-600 rounded-full text-xs font-bold px-1.5 py-0.5 min-w-[16px] text-center">
                              {contentSearchResults.length}
                            </span>
                          )}
                        </button>
                        
                        {/* Sort Dropdown */}
                        <div className="relative">
                          <button
                            ref={sortButtonRef}
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
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-white/20 text-white hover:bg-white/30"
                          >
                            <span>
                              {sortType === 'name' ? '📝' : sortType === 'date' ? '📅' : '📊'}
                            </span>
                            <FaChevronDown className="w-3 h-3" />
                          </button>

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
                        <button
                          onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-white/20 text-white hover:bg-white/30"
                          title={sortDirection === 'asc' ? 'Ascending (A→Z)' : 'Descending (Z→A)'}
                        >
                          {sortDirection === 'asc' ? (
                            <FaChevronUp className="w-4 h-4" />
                          ) : (
                            <FaChevronDown className="w-4 h-4" />
                          )}
                        </button>
              </div>
            </div>
          </div>
                </div>
            </div>
              
              {/* Documents Content */}
              <div className="bg-white rounded-b-2xl p-16 max-w-full mx-auto shadow-xl" style={{boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)'}}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-24 min-h-[1200px]">
                  {!isLoadingDocuments && getPaginatedItems().length > 0 ? (
                    getPaginatedItems().map((item) => (
                    <motion.div
                  key={item.uniqueId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -4, scale: 1.005 }}
                      style={{ marginBottom: '8px' }}
                  whileTap={{ scale: 0.99 }}
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
                      <div className="relative w-full rounded-xl overflow-hidden transition-all duration-200"
                           style={{
                             background: 'rgba(255,255,255,0.95)',
                             backdropFilter: 'blur(6px)',
                             border: '1px solid rgba(255,255,255,0.6)',
                             boxShadow: '0 4px 20px rgba(31, 41, 55, 0.06)'
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
                          className="relative w-full h-80 overflow-hidden flex flex-col cursor-pointer transition-all duration-300"
                          onClick={(e) => handleFileClick(e, item)}
                        >
                          <div className="w-full h-full flex items-center justify-center p-2" style={{ background: 'linear-gradient(135deg, rgba(102,126,234,0.08) 0%, rgba(118,75,162,0.08) 100%)', borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem', borderBottom: '1px solid rgba(255,255,255,0.35)' }}>
                            <div className="w-full h-full rounded-lg overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(102,126,234,0.06) 0%, rgba(118,75,162,0.06) 100%)', border: '1px solid rgba(229,231,235,0.7)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)' }}>
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
                            }
                          }
                          
                          if (pdfData) {
                            // Render lightweight image preview from first_page (PNG/JPEG) instead of heavy PDF renderer
                            return (
                              <img
                                src={pdfData.startsWith('data:image') ? pdfData : `data:image/png;base64,${pdfData}`}
                                alt={item.nom_document}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  console.warn('Thumbnail image failed, fallback to icon:', item.nom_document);
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            );
                          }
                          // Graceful skeleton while PDFs load (prevents blank/flicker)
                          return (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50">
                              <div className="animate-pulse flex flex-col items-center gap-2">
                                <div className="w-10 h-12 bg-purple-200/50 rounded" />
                                <div className="w-16 h-2 bg-purple-200/40 rounded" />
                              </div>
                            </div>
                          );
                        })()}
                              </div>
                            </div>
                        </div>
                    </div>

                        {/* Document Info Section - Glassmorphic */}
                        <div className="w-full px-4 py-4 transition-colors duration-300" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.35)' }}>
                      {/* Document ID and Date */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded-md">
                          #{item.id_document}
                        </span>
                            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-md">
                          {formatDate(item.date_upload)}
                        </span>
                      </div>
                      
                      {/* Document Name */}
                          <h3 className="text-sm font-semibold text-gray-900 leading-tight mb-3 line-clamp-2" title={item.nom_document} style={{ 
                            letterSpacing: '-0.01em',
                            fontWeight: '600'
                          }}>
                        {item.nom_document}
                      </h3>
                      
                      {/* Document Type */}
                      {item.type_name && (
                            <div className="mb-3">
                          <span className="inline-block text-xs font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded-md">
                            📄 {item.type_name}
                          </span>
                        </div>
                      )}
                      
                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2 relative"
                          onMouseEnter={() => startHoverExpand('tags', item.id_document)}
                          onMouseLeave={endHoverExpand}>
                          {item.tags.slice(0, 2).map((tag, index) => (
                            <span 
                              key={index} 
                              className="inline-block text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-md"
                            >
                              🏷️ {tag.tag_name}
                            </span>
                          ))}
                          {item.tags.length > 2 && hoverExpand.section !== 'tags' && hoverExpand.id !== item.id_document && (
                            <span className="text-xs text-gray-500">+{item.tags.length - 2}</span>
                          )}
                          {hoverExpand.section === 'tags' && hoverExpand.id === item.id_document && (
                            <div className="absolute left-0 top-full mt-2 flex flex-wrap gap-1 p-2 bg-white/95 backdrop-blur rounded-xl border border-purple-100 shadow-lg z-50 animate-[fadeIn_200ms_ease-out] w-max max-w-[300px] max-h-48 overflow-auto pointer-events-auto">
                              {item.tags.map((tag, idx) => (
                                <span key={idx} className="inline-block text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-md">🏷️ {tag.tag_name}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Keywords (mot1..mot5) */}
                      {([item.mot1, item.mot2, item.mot3, item.mot4, item.mot5].filter(Boolean).length > 0) && (
                        <div className="flex flex-wrap gap-1 mb-1 relative"
                          onMouseEnter={() => startHoverExpand('kws', item.id_document)}
                          onMouseLeave={endHoverExpand}>
                          {([item.mot1, item.mot2, item.mot3, item.mot4, item.mot5]
                            .filter(Boolean)
                            .slice(0, 2)).map((kw, idx) => (
                              <span key={idx} className="inline-block text-[11px] font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                                🔑 {kw}
                              </span>
                          ))}
                          {([item.mot1, item.mot2, item.mot3, item.mot4, item.mot5].filter(Boolean).length > 2) && hoverExpand.section !== 'kws' && hoverExpand.id !== item.id_document && (
                            <span className="text-xs text-gray-500">+{[item.mot1, item.mot2, item.mot3, item.mot4, item.mot5].filter(Boolean).length - 2}</span>
                          )}
                          {hoverExpand.section === 'kws' && hoverExpand.id === item.id_document && (
                            <div className="absolute left-0 top-full mt-2 flex flex-wrap gap-1 p-2 bg-white/95 backdrop-blur rounded-xl border border-purple-100 shadow-lg z-50 animate-[fadeIn_200ms_ease-out] w-max max-w-[300px] max-h-48 overflow-auto pointer-events-auto">
                              {([item.mot1, item.mot2, item.mot3, item.mot4, item.mot5].filter(Boolean)).map((kw, idx) => (
                                <span key={idx} className="inline-block text-[11px] font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">🔑 {kw}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                        {/* Action Buttons Section - Subtle glass bar */}
                        <div className="w-full grid grid-cols-3 transition-colors duration-300 rounded-b-2xl" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.92) 100%)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 6px 24px rgba(31,41,55,0.06)' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                          downloaddoc(item.nom_document);
                    }}
                         className="flex flex-col items-center justify-center gap-1 py-3 text-emerald-600 hover:bg-emerald-50 transition-all duration-200 border-r border-gray-100 group"
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
                         className="flex flex-col items-center justify-center gap-1 py-3 text-purple-600 hover:bg-purple-50 transition-all duration-200 border-r border-gray-100 group"
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
                  ) : isLoadingDocuments ? (
                    // Skeleton loading while documents are being fetched
                    <div className="col-span-full">
                      <div className="animate-pulse space-y-4">
                        {[...Array(6)].map((_, index) => (
                          <div key={index} className="flex items-center space-x-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                            <div className="w-12 h-16 bg-gray-200 rounded-lg"></div>
                            <div className="flex-1 space-y-3">
                              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                              <div className="flex space-x-2">
                                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                              </div>
                            </div>
                            <div className="w-24 h-4 bg-gray-200 rounded"></div>
                          </div>
                        ))}
                      </div>
                    </div>
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
                          ({getPaginatedItems().length} of {sortDocuments(getCurrentItems.filter(item => item.type === 'file')).length} documents)
                        </span>
                      </span>
          </div>
              </div>
            )}
            
            {/* Subtle Professional Footer */}
            <div className="mt-12 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-4">
                  <span>DocDiL Document Management</span>
                  <span>•</span>
                  <span>Professional Edition</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span>© 2024</span>
                  <span>•</span>
                  <span>Enterprise Ready</span>
                </div>
              </div>
            </div>
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
          onThumbnailUpdate={(docName, dataUrl) => {
            // Update in-memory thumbnail cache instantly after version/restore
            setPdfCache((prev) => {
              const next = new Map(prev);
              if (dataUrl) {
                next.set(docName, dataUrl);
              } else {
                next.delete(docName);
              }
              return next;
            });
          }}
          onDetailsUpdate={(docName, mergedDetails) => {
            // Update documents list and cache with new tags/keywords/type without refetch
            setDocuments((prev) => {
              if (!Array.isArray(prev)) return prev;
              return prev.map((d) => {
                if (d.nom_document !== docName) return d;
                const kw = Array.isArray(mergedDetails?.keywords) ? mergedDetails.keywords : [];
                return {
                  ...d,
                  type_name: mergedDetails?.type || d.type_name,
                  type: mergedDetails?.type || d.type,
                  tags: mergedDetails?.tags || d.tags,
                  mot1: kw[0] ?? d.mot1,
                  mot2: kw[1] ?? d.mot2,
                  mot3: kw[2] ?? d.mot3,
                  mot4: kw[3] ?? d.mot4,
                  mot5: kw[4] ?? d.mot5,
                };
              });
            });
            // Update cache for current folder if present
            if (currentFolder?.folder_path) {
              setDocumentCache((prev) => {
                const next = new Map(prev);
                const list = next.get(currentFolder.folder_path);
                if (Array.isArray(list)) {
                  const updated = list.map((d) => {
                    if (d.nom_document !== docName) return d;
                    const kw = Array.isArray(mergedDetails?.keywords) ? mergedDetails.keywords : [];
                    return {
                      ...d,
                      type_name: mergedDetails?.type || d.type_name,
                      type: mergedDetails?.type || d.type,
                      tags: mergedDetails?.tags || d.tags,
                      mot1: kw[0] ?? d.mot1,
                      mot2: kw[1] ?? d.mot2,
                      mot3: kw[2] ?? d.mot3,
                      mot4: kw[3] ?? d.mot4,
                      mot5: kw[4] ?? d.mot5,
                    };
                  });
                  next.set(currentFolder.folder_path, updated);
                }
                return next;
              });
            }
          }}
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
                      bg="purple.50" 
                      display="flex" 
                      alignItems="center" 
                      justifyContent="center"
                    >
                      <FaFolder className="text-purple.500" />
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
                                  <FaFolder className="text-purple.500 text-xl" />
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
                          bg="purple.500"
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

      {showFirstFolderModal && (
        <FirstFolderModal
          isOpen={showFirstFolderModal}
          onClose={() => setShowFirstFolderModal(false)}
          onCreateFolder={handleCreateFirstFolder}
        />
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
                const fullPath = parentPath 
                  ? `${parentPath}/${folderName}` 
                  : `${currentFolder?.folder_path || ''}/${folderName}`.replace(/^\/+/, '');
                  
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
                    className="flex items-center justify-between p-2 bg-purple-50 rounded-lg"
                  >
                    <span className="text-purple-700">{keyword}</span>
                    <button
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="text-purple-400 hover:text-purple-600"
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
      {showContentSearchModal && ReactDOM.createPortal(
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
                    className="w-full h-24 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all duration-200"
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
                        className="mt-1 text-purple-600 focus:ring-purple-500"
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
                        className="mt-1 text-purple-600 focus:ring-purple-500"
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
                        className="mt-1 text-purple-600 focus:ring-purple-500"
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
      {showAdvancedFilterModal && ReactDOM.createPortal(
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
                              className="px-3 py-2 hover:bg-purple-50 cursor-pointer flex items-center justify-between"
                            >
                              <span className="text-sm text-gray-700">{tag}</span>
                              {advancedFilters.tags.includes(tag) && (
                                <FaCheck className="text-purple-600 text-xs" />
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
                          className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
                        >
                          {tag}
                          <button
                            onClick={() => handleTagToggle(tag)}
                            className="hover:text-purple-900"
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
                              className="px-3 py-2 hover:bg-purple-50 cursor-pointer flex items-center justify-between"
                            >
                              <span className="text-sm text-gray-700">{keyword}</span>
                              {advancedFilters.keywords.includes(keyword) && (
                                <FaCheck className="text-purple-600 text-xs" />
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
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="bg-purple-50 border border-purple-200 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 text-purple-700 mb-2">
                      <FaCheck className="text-sm" />
                      <span className="text-sm font-medium">Active Filters:</span>
                    </div>
                    <div className="text-xs text-purple-600 space-y-1">
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
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-600 hover:to-pink-700 transition-all duration-200 flex items-center justify-center gap-2"
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

      {/* Document Navigation Loading Overlay */}
      {isNavigating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]"
          style={{ zIndex: 9999 }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-6 max-w-sm mx-4"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full"
            />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Navigating to Document
              </h3>
              <p className="text-sm text-gray-600">
                Finding the correct page for your document...
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default DiffusePage; 
