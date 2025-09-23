import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as React from "react"
import { useEffect, useState } from "react"
import { CloudUpload } from 'lucide-react';
import { Check, ChevronsUpDown, ChevronRight, ChevronLeft, ArrowLeft, Folder } from "lucide-react"
import { cn } from "../ui/utils"
import { Button } from "../ui/button"
import axios from 'axios';
import { io } from 'socket.io-client';
import { backend } from '../config';
import { getSocket } from '../services/notificationService';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  CommandGroup,
  CommandGroupItem,
} from "../ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover"
import { Document, Page } from 'react-pdf'
import { pdfjs } from 'react-pdf';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import { useNotifications } from '../services/notificationService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog"
import { ToastContainer } from 'react-toastify';
import { addWatermarkToPDF } from '../utils/pdfWatermark';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Componenta de Toast
const Toast = ({ message, type, onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
            className="p-2 bg-green-100 rounded-full"
          >
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
        );
      case 'error':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
            className="p-2 bg-red-100 rounded-full"
          >
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.div>
        );
      default:
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
            className="p-2 bg-blue-100 rounded-full"
          >
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </motion.div>
        );
    }
  };

  const getGradient = () => {
    switch (type) {
      case 'success':
        return 'from-green-50 to-emerald-50 border-green-200';
      case 'error':
        return 'from-red-50 to-rose-50 border-red-200';
      default:
        return 'from-blue-50 to-indigo-50 border-blue-200';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      default:
        return 'text-blue-800';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border bg-gradient-to-r ${getGradient()} max-w-md backdrop-blur-sm`}
    >
      <div className="flex items-start gap-3">
          {getIcon()}
        <div className={`flex-1 ${getTextColor()}`}>
          <p className="text-sm font-medium">{message}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
            onClick={onClose}
          className={`p-1.5 rounded-lg ${getTextColor()} hover:bg-white/50 transition-colors`}
          >
          <span className="sr-only">Close</span>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </motion.button>
        </div>
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 5, ease: "linear" }}
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-20"
      />
    </motion.div>
  );
};

const TagItem = ({ tag, onRemove, className = "" }) => {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      whileHover={{ scale: 1.05 }}
      className={`inline-flex items-center bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-sm font-medium mr-2 px-3 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all duration-200 ${className}`}
    >
      <svg className="w-4 h-4 mr-1.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
      {tag.name || tag.tag_name}
      <motion.button
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.9 }}
        type="button"
        className="inline-flex items-center p-0.5 ml-2 text-sm text-blue-400 bg-transparent rounded-full hover:bg-blue-200 hover:text-blue-900 transition-colors duration-200"
        onClick={() => onRemove(tag)}
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        <span className="sr-only">Remove tag</span>
      </motion.button>
    </motion.div>
  );
};

const VersionConfirmModal = ({ isOpen, onClose, onConfirm, document, file, documentTypes }) => {
  if (!isOpen || !file) return null;

  const fileName = file.name || '';
  const documentName = document?.label || fileName.replace(/\.[^/.]+$/, "");
  const documentType = document?.type_id || "";
  const documentKeywords = document?.keywords?.join('; ') || "";
  const documentComment = document?.comment || "";
  const documentPath = document?.path || "";

  // Find the document type name based on type_id
  const selectedType = documentTypes?.find(type => type.id === documentType);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Document Version Confirmation</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              A document with the name <span className="font-semibold">{fileName}</span> already exists in the database.
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Would you like to add a new version of this document?
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document Name</label>
              <input
                type="text"
                value={documentName}
                disabled
                className="w-full p-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
              <select
                value={documentType}
                disabled
                className="w-full p-2 border border-gray-300 rounded-md bg-gray-50"
              >
                <option value="">Select type...</option>
                {documentTypes && documentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.type_name || type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document Path</label>
              <input
                type="text"
                value={documentPath}
                disabled
                className="w-full p-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
              <textarea
                value={documentKeywords}
                disabled
                className="w-full p-2 border border-gray-300 rounded-md bg-gray-50"
                rows="2"
                placeholder="Keywords separated by semicolon"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
              <textarea
                value={documentComment}
                disabled
                className="w-full p-2 border border-gray-300 rounded-md bg-gray-50"
                rows="3"
                placeholder="Add comments about this version..."
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(document)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Add New Version
          </button>
        </div>
      </div>
    </div>
  );
};

const StorageLimitModal = ({ isOpen, onClose, details, onSendToAdmin }) => {
  const [isSending, setIsSending] = React.useState(false);

  const handleSendToAdmin = async () => {
    try {
      setIsSending(true);
      // Calculate required space
      const requiredSpace = parseFloat(details.fileSize) - 
                          (parseFloat(details.planLimit) - 
                           parseFloat(details.currentUsage));

      const requestData = {
        user_id: details.userId,
        request_type: 'storage_upgrade',
        current_usage: details.currentUsage,
        plan_limit: details.planLimit,
        file_size: details.fileSize,
        required_space: requiredSpace.toFixed(2),
        reason: `Storage upgrade needed for file upload. Current usage: ${details.currentUsage}MB, Plan limit: ${details.planLimit}MB, File size: ${details.fileSize}MB`,
        status: 'pending'
      };

      const response = await fetch(`${backend}/api/admin/storage-upgrade-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error('Failed to send request to admin');
      }

      const data = await response.json();
      if (data.success) {
        toast.success('Request sent to administrator successfully');
        onClose();
      } else {
        throw new Error(data.error || 'Failed to send request to admin');
      }
    } catch (error) {
      console.error('Error sending request to admin:', error);
      toast.error('Failed to send request to admin');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        >
          <div className="p-6 bg-gradient-to-r from-red-500 to-pink-600 text-white">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="p-2 bg-white/20 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold">Storage Limit Exceeded</h2>
                <p className="text-red-100 mt-1">Additional storage space required</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Current Usage</span>
                  <span className="text-sm font-semibold text-gray-900">{details?.currentUsage} MB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((details?.currentUsage / details?.planLimit) * 100, 100)}%` }}
                    className="bg-gradient-to-r from-orange-500 to-red-600 h-2 rounded-full"
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium text-gray-600">Plan Limit</span>
                  <span className="text-sm font-semibold text-gray-900">{details?.planLimit} MB</span>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Additional Space Required</p>
                    <p className="text-lg font-bold text-blue-700">{details?.requiredSpace} MB</p>
        </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            onClick={onClose}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
          >
            Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSendToAdmin}
                disabled={isSending}
                className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isSending ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Sending Request...</span>
        </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span>Send Request to Admin</span>
      </div>
                )}
              </motion.button>
    </div>
  </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
);
};

const DraftListModal = ({ isOpen, onClose, drafts, onSelect, onDelete }) => {
  const [selectedDraft, setSelectedDraft] = React.useState(null);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [action, setAction] = React.useState(null);

  const handleAction = (action, draft) => {
    setSelectedDraft(draft);
    setAction(action);
    setShowConfirmModal(true);
  };

  const handleConfirm = () => {
    if (action === 'load') {
      onSelect(selectedDraft.id_draft);
    } else if (action === 'delete') {
      onDelete(selectedDraft.id_draft);
    }
    setShowConfirmModal(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
        >
          <div className="p-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
            <h2 className="text-2xl font-bold">Your Drafts</h2>
            <p className="text-blue-100 mt-1">Select a draft to load or delete</p>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {drafts.length === 0 ? (
              <div className="text-center py-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                <p className="mt-4 text-gray-500">No drafts found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {drafts.map((draft) => (
                  <motion.div
                    key={draft.id_draft}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{draft.document_name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Last updated: {new Date(draft.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleAction('load', draft)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm hover:shadow-md transition-shadow"
                        >
                          Load
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleAction('delete', draft)}
                          className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg text-sm hover:shadow-md transition-shadow"
                        >
                          Delete
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 bg-gray-50 border-t">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </motion.button>
        </div>
        </motion.div>
      </motion.div>

      {/* Confirm Modal */}
      <AnimatePresence>
      {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {action === 'load' ? 'Load Draft?' : 'Delete Draft?'}
              </h3>
              <p className="text-gray-600 mb-6">
                {action === 'load'
                  ? `Are you sure you want to load "${selectedDraft?.document_name}"?`
                  : `Are you sure you want to delete "${selectedDraft?.document_name}"? This action cannot be undone.`}
              </p>
              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirm}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                    action === 'load'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                      : 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700'
                  }`}
                >
                  {action === 'load' ? 'Load' : 'Delete'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
      )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

const Uploadpage = () => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [userId, setUserId] = React.useState(null);
  const [toast, setToast] = React.useState({ show: false, message: '', type: 'info' });
  const [isVersioning, setIsVersioning] = React.useState(false);
  const [documentOptions, setDocumentOptions] = React.useState([]);
  const [selectedDocument, setSelectedDocument] = React.useState(null);
  const [changeSummary, setChangeSummary] = React.useState('');
  const [availableTags, setAvailableTags] = React.useState([]);
  const [selectedTags, setSelectedTags] = React.useState([]);
  const [newTagName, setNewTagName] = React.useState('');
  const [showTagInput, setShowTagInput] = React.useState(false);
  const [isLoadingTags, setIsLoadingTags] = React.useState(false);
  const [documentVersions, setDocumentVersions] = React.useState([]);
  const [showVersionHistory, setShowVersionHistory] = React.useState(false);
  const [isLoadingVersions, setIsLoadingVersions] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [keywords, setKeywords] = React.useState([]);
  const [comment, setComment] = React.useState('');
  const [documentPath, setDocumentPath] = React.useState('');
  const [extractedText, setExtractedText] = React.useState('');
  const [generatedKeywords, setGeneratedKeywords] = React.useState([]);
  const [suggestedTags, setSuggestedTags] = React.useState([]);
  const [existingDocument, setExistingDocument] = React.useState(null);
  const [documentTypes, setDocumentTypes] = React.useState([]);
  const [folders, setFolders] = React.useState([]);
  const [selectedFolder, setSelectedFolder] = React.useState(null);
  const [selectedType, setSelectedType] = React.useState(null);
  const [documentName, setDocumentName] = React.useState('');
  const [documentType, setDocumentType] = React.useState('');
  const [documentStatus, setDocumentStatus] = React.useState("current");
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [showSuccessMessage, setShowSuccessMessage] = React.useState(false);
  const [showVersionModal, setShowVersionModal] = React.useState(false);
  const [watermarkedPages, setWatermarkedPages] = React.useState([]);
  const [watermarkedFile, setWatermarkedFile] = React.useState(null);
  const [pageNumber, setPageNumber] = React.useState(1);
  const [numPages, setNumPages] = React.useState(null);
  const [nofile, setNofile] = React.useState(false);
  const [noType, setNoType] = React.useState(false);
  const [noKeyword, setNoKeyword] = React.useState(false);
  const [noName, setNoName] = React.useState(false);
  const [noFolder, setNoFolder] = React.useState(false);
  const [documentDropdownOpen, setDocumentDropdownOpen] = React.useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = React.useState(false);
  const [folderDropdownOpen, setFolderDropdownOpen] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef(null);
  const [selectedFile, setSelectedFile] = React.useState(null);
  const [docUrl, setDocUrl] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [versionDocument, setVersionDocument] = React.useState(null);
  const [showFolderModal, setShowFolderModal] = React.useState(false);
  const [currentPath, setCurrentPath] = React.useState('');
  const [selectedFolderPath, setSelectedFolderPath] = React.useState('');
  const [currentFolderPath, setCurrentFolderPath] = React.useState('');
  const [folderHistory, setFolderHistory] = React.useState([]);
  const [currentFolder, setCurrentFolder] = React.useState(null);
  const [newKeyword, setNewKeyword] = React.useState('');
  const [showStorageLimitModal, setShowStorageLimitModal] = React.useState(false);
  const [storageLimitDetails, setStorageLimitDetails] = React.useState(null);
  const [availableSpace, setAvailableSpace] = React.useState(0);
  const [currentUsage, setCurrentUsage] = React.useState(0);
  const [planLimit, setPlanLimit] = React.useState(0);
  const [isDraft, setIsDraft] = React.useState(false);
  const [draftList, setDraftList] = React.useState([]);
  const [showDraftModal, setShowDraftModal] = React.useState(false);
  const [selectedDraft, setSelectedDraft] = React.useState(null);
  const commentRef = React.useRef(null);
  const [isDraftLoaded, setIsDraftLoaded] = React.useState(false);
  const [loadedDraftId, setLoadedDraftId] = React.useState(null);
  const [userInstitution, setUserInstitution] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [selectedPath, setSelectedPath] = React.useState('');
  const [fetchData, setFetchData] = React.useState(null);
  const [selectedTypeId, setSelectedTypeId] = React.useState(null);
  const [socket, setSocket] = React.useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Add admin-specific state
  const [isAdmin, setIsAdmin] = useState(true);
  const [adminPrivileges, setAdminPrivileges] = useState({
    canUpload: true,
    canApprove: true,
    canDelete: true,
    canModify: true
  });

  // Combined data fetching function
  const fetchInitialData = async () => {
    try {
      const response = await fetch(`${backend}/admin/documents/types`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Origin': window.location.origin }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch document types');
      }
      
      const data = await response.json();
      setDocumentTypes(data);
    } catch (error) {
      console.error('Error fetching document types:', error);
      showToast('Failed to load document types', 'error');
    }
  };

  // Single useEffect for initial data loading
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Add fetchDrafts function
  const fetchDrafts = async () => {
    try {
      const response = await axios.get(`${backend}/post_docs/drafts`, {
        withCredentials: true
      });
      if (response.data.success) {
        setDraftList(response.data.drafts || []);
      } else {
        setDraftList([]);
      }
    } catch (error) {
      console.error('Error fetching drafts:', error);
      showToast('Failed to fetch drafts', 'error');
      setDraftList([]);
    }
  };

  // Add useEffect to fetch drafts on component mount
  React.useEffect(() => {
    fetchDrafts();
  }, []);

  // Fetch storage information
  React.useEffect(() => {
    const fetchStorageInfo = async () => {
      try {
        const response = await fetch(`${backend}/post_docs/storage`, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch storage information');
        }
        
        const data = await response.json();
        setCurrentUsage(data.totalUsage);
        setPlanLimit(data.storageLimit);
        setAvailableSpace(data.availableStorage);
      } catch (error) {
        console.error('Error fetching storage information:', error);
      }
    };

    fetchStorageInfo();
  }, []);

  // Add new function to handle keyword addition
  const addKeyword = (keyword) => {
    if (keyword && keyword.trim() !== '') {
      // Check if we already have 5 keywords
      if (keywords.length >= 5) {
        showToast('Maximum 5 keywords allowed', 'warning');
        return;
      }
      
      // Check if keyword already exists
      if (!keywords.includes(keyword.trim())) {
        setKeywords(prev => [...prev, keyword.trim()]);
        setNewKeyword(''); // Clear input
      } else {
        showToast('Keyword already exists', 'warning');
      }
    }
  };

  // Add function to remove keyword
  const removeKeyword = (keywordToRemove) => {
    setKeywords(prev => prev.filter(k => k !== keywordToRemove));
  };

  // Add toggleVersioning function
  const toggleVersioning = () => {
    setIsVersioning(prev => !prev);
    if (!isVersioning) {
      setValue(""); // Clear the document type when switching to versioning
    } else {
      setSelectedDocument(null);
      setChangeSummary('');
    }
  };

  // Fetch document types and folders on component mount
  React.useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        await fetchUserInstitution();
        
        // Fetch document types
        const typesResponse = await fetch(`${backend}/post_docs/document_types`, {
          credentials: 'include',
          signal: controller.signal
        });

        if (!typesResponse.ok) {
          throw new Error('Failed to fetch document types');
        }

          const typesData = await typesResponse.json();
        if (typesData.success && isMounted) {
          setDocumentTypes(typesData.document_types);
        }

        // Fetch folders
        const foldersResponse = await fetch(`${backend}/post_docs/folders`, {
          credentials: 'include',
          signal: controller.signal
        });

        if (!foldersResponse.ok) {
          throw new Error('Failed to fetch folders');
        }

        const foldersData = await foldersResponse.json();
        if (foldersData.success && isMounted) {
          setFolders(foldersData.folders);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const handleNextPage = () => {
    if (pageNumber < numPages) {
      setPageNumber(prev => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (pageNumber > 1) {
      setPageNumber(prev => prev - 1);
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast({ show: false, message: '', type: '' });
  };

  const fetchAvailableTags = React.useCallback(() => {
    setIsLoadingTags(true);

    fetch(`${backend}/post_docs/tags`, {
      credentials: 'include'
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`Server responded with status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setIsLoadingTags(false);

        if (data.success && Array.isArray(data.tags)) {
          const formattedTags = data.tags.map(tag => ({
            id: tag.id_tag,
            name: tag.tag_name,
            isPredefined: tag.is_predefined === 1,
            usageCount: tag.usage_count
          }));

          // Sort tags by most used and then alphabetically
          formattedTags.sort((a, b) => {
            if (b.usageCount !== a.usageCount) {
              return b.usageCount - a.usageCount; // Most used first
            }
            return a.name.localeCompare(b.name); // Alphabetical if same usage
          });

          setAvailableTags(formattedTags);
        } else {
          console.error("Unexpected response format:", data);
          showToast("Failed to fetch tags", "error");
        }
      })
      .catch(err => {
        console.error("Error fetching tags:", err);
        setIsLoadingTags(false);
        showToast(`Error fetching tags: ${err.message}`, "error");
      });
  }, []);

  // Load tags from localStorage on init
  React.useEffect(() => {
    const savedTags = localStorage.getItem('availableTags');
    if (savedTags) {
      try {
        const parsedTags = JSON.parse(savedTags);
        setAvailableTags(parsedTags);
      } catch (err) {
        console.error("Error parsing saved tags:", err);
      }
    }
  }, []);

  // Save tags to localStorage whenever they change
  React.useEffect(() => {
    if (availableTags.length > 0) {
      localStorage.setItem('availableTags', JSON.stringify(availableTags));
    }
  }, [availableTags]);

  const handleSuccessfulUpload = (uploadedDocument) => {
    console.log('=== handleSuccessfulUpload called ===');
    const socket = getSocket();
    console.log('Socket connection status:', socket.connected);
    console.log('Selected folder path:', selectedFolderPath);
    console.log('Uploaded document:', uploadedDocument);

    if (socket.connected) {
        console.log('=== Emitting refresh_folder event in React ===');
        const eventData = {
            type: 'refresh_folder',
            folderPath: selectedFolderPath,
            timestamp: new Date().toISOString()
        };
        console.log('Event data:', eventData);
        socket.emit('refresh_folder', eventData);
    }
  };

  // Update useEffect to use authentication state from App.js
  React.useEffect(() => {
    let isMounted = true;

    const initializeData = async () => {
      try {
        // Get session data and user info in one request
        const res = await fetch(`${backend}/session-check`, {
          credentials: 'include'
        });
        const data = await res.json();
        
        if (!isMounted) return;
        
        console.log("Session check result:", data);
        if (data.valid) {
          setUserId(data.id_user);
          // Fetch user's documents for versioning
          fetchUserDocuments(data.id_user);
          // Fetch available tags - refresh tags on initial load
          fetchAvailableTags();
        }
        setIsAuthenticated(data.valid);
      } catch (err) {
        console.error("Error checking session:", err);
        if (isMounted) {
          setIsAuthenticated(false);
        }
      }
    };

    // Only check session if not already authenticated
    if (!isAuthenticated) {
      initializeData();
    } else {
      // If already authenticated, just fetch the necessary data
      fetchUserDocuments(userId);
      fetchAvailableTags();
    }

    // Set up a periodic refresh of tags (every 5 minutes)
    const tagsRefreshInterval = setInterval(() => {
      if (isAuthenticated) {
        console.log("Periodic refresh of tags");
        fetchAvailableTags();
      }
    }, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(tagsRefreshInterval);
    };
  }, []); // Empty dependency array since we handle isAuthenticated inside

  const fetchUserDocuments = (userId) => {
    fetch(`${backend}/MyDocumentsList`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        console.log("User documents:", data);
        if (Array.isArray(data)) {
          const options = data.map(doc => ({
            value: doc.nom_doc,
            label: doc.nom_document_original || doc.nom_doc,
            id: doc.id_document
          }));
          setDocumentOptions(options);
        }
      })
      .catch(err => {
        console.error("Error fetching user documents:", err);
      });
  };

  const createNewTag = () => {
    console.log("createNewTag function called with:", newTagName);
    if (!newTagName.trim()) {
      showToast("Please enter a tag name", "error");
      return;
    }

    // Normalize tag name (trim and lowercase for comparison)
    const tagNameToCreate = newTagName.trim();
    const normalizedTagName = tagNameToCreate.toLowerCase();

    // Check if a tag with similar name already exists (case insensitive)
    const similarTag = availableTags.find(tag =>
      tag.name.toLowerCase() === normalizedTagName
    );

    if (similarTag) {
      console.log("Similar tag already exists:", similarTag);
      // Add the existing tag to selection if not already selected
      if (!selectedTags.some(t => t.id === similarTag.id)) {
        addTag(similarTag);
        setNewTagName('');
        setShowTagInput(false);
        showToast(`Tag "${similarTag.name}" already exists, added to selection`, "info");
      } else {
        showToast(`Tag "${similarTag.name}" already selected`, "error");
      }
      return;
    }

    // Show a loading message
    showToast(`Creating tag "${tagNameToCreate}"...`, "info");

    // Debug: Show current availableTags before API call
    console.log("Available tags before API call:", availableTags);

    fetch(`${backend}/post_docs/tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ tagName: tagNameToCreate })
    })
      .then(res => {
        console.log("API response status:", res.status);
        if (!res.ok) {
          throw new Error(`Server responded with status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log("Create tag response:", data);
        if (data.success) {
          // Create new tag object
          const newTag = {
            id: data.tagId,
            name: tagNameToCreate,
            isPredefined: false,
            usageCount: 0
          };

          // Add to availableTags list
          console.log("Adding new tag to availableTags:", newTag);
          setAvailableTags(prev => {
            // Make sure we don't add duplicates
            if (prev.some(t => t.id === newTag.id)) {
              return prev;
            }
            return [...prev, newTag];
          });

          // Add to selected tags
          addTag(newTag);
          setNewTagName('');
          setShowTagInput(false);
          showToast(`Tag "${tagNameToCreate}" created successfully`, "success");

          // Refresh tags from server to ensure everything is in sync
          fetchAvailableTags();
        } else {
          // If tag already exists, add it to selection
          if (data.tagId) {
            console.log("Tag already exists with ID:", data.tagId);
            const existingTag = availableTags.find(t => t.id === data.tagId);
            if (existingTag && !selectedTags.some(t => t.id === existingTag.id)) {
              addTag(existingTag);
              setNewTagName('');
              setShowTagInput(false);
              showToast(`Tag "${tagNameToCreate}" already exists, added to selection`, "info");
            } else {
              showToast(`Tag "${tagNameToCreate}" already selected`, "error");
            }
          } else {
            showToast(`Failed to create tag: ${data.error || "Unknown error"}`, "error");
          }
        }
      })
      .catch(err => {
        console.error("Error creating tag:", err);

        // Add the tag locally even if the server request fails
        const fallbackTag = {
          id: `local-${Date.now()}`,
          name: tagNameToCreate,
          isPredefined: false,
          usageCount: 0,
          isLocal: true
        };

        setAvailableTags(prev => [...prev, fallbackTag]);
        addTag(fallbackTag);
        setNewTagName('');
        setShowTagInput(false);

        showToast(`Added tag "${tagNameToCreate}" locally`, "success");
      });
  };

  const addTag = (tag) => {
    // Check if tag already exists in selection (case insensitive)
    const isDuplicate = selectedTags.some(t =>
      (t.id === tag.id) || (t.name.toLowerCase() === tag.name.toLowerCase())
    );

    if (!isDuplicate) {
      console.log("Adding tag to selection:", tag);
      setSelectedTags(prev => [...prev, tag]);
    } else {
      console.log("Tag already in selection:", tag);
    }
  };

  const removeTag = (tag) => {
    setSelectedTags(prev => prev.filter(t => t.id !== tag.id));
  };

  const [value, setValue] = React.useState("")
  const [fileName, setFileName] = React.useState("");
  const keywordRef = React.useRef('')
  const [doc, setDoc] = React.useState(null)
  const inputRef = React.useRef(null)
  const docNameRef = React.useRef(null)

  const onPageChange = (newPage) => {
    setPageNumber(newPage);
  };

  const [open, setOpen] = React.useState(false)

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFiles = async (filesOrEvent) => {
    let files;
    if (filesOrEvent instanceof Event) {
      files = filesOrEvent.target.files;
    } else {
      files = filesOrEvent;
    }

    if (!files || files.length === 0) return;

    const file = files[0];
    setSelectedFile(file);
    setDoc(file); // Add this line to set the doc state
    
    // Create object URL for the file
    const fileUrl = URL.createObjectURL(file);
    setDocUrl(fileUrl);
    setFileName(file.name);

    const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
    setDocumentName(nameWithoutExtension);

    // Generate keywords from filename
    const suggested = nameWithoutExtension
      .split(/[\s-_]+/)
      .filter(word => word.length > 2)
      .slice(0, 3);
    
    setGeneratedKeywords(suggested);

    try {
      // If it's a PDF, add watermark
      if (file.type === 'application/pdf') {
        const watermarked = await addWatermarkToPDF(file);
        setWatermarkedFile(watermarked);
        
        // Create object URL for the watermarked file
        const watermarkedUrl = URL.createObjectURL(watermarked);
        setDocUrl(watermarkedUrl);
      }

      const checkResponse = await fetch(`${backend}/post_docs/check-document-name/${encodeURIComponent(nameWithoutExtension)}`, {
        credentials: 'include'
      });

      if (!checkResponse.ok) {
        throw new Error('Failed to check document name');
      }

      const { exists } = await checkResponse.json();

      if (exists) {
        // Fetch existing document details
        const docResponse = await fetch(`${backend}/post_docs/details/${encodeURIComponent(nameWithoutExtension)}`, {
          credentials: 'include'
        });

        if (!docResponse.ok) {
          throw new Error('Failed to fetch document details');
        }

        const docData = await docResponse.json();
        
        if (docData.success) {
          setVersionDocument({
            ...docData.document,
            label: docData.document.originalName || docData.document.name
          });
          setShowVersionModal(true);
        }
        return;
      }

      // If document doesn't exist, continue with normal upload
      if (file.type === 'application/pdf') {
        // Extract text from PDF
        const text = await extractTextFromPDF(file);
        setExtractedText(text);

        // Generate keywords from text
        const generatedKeywords = await generateKeywords(text);
        setGeneratedKeywords(generatedKeywords);
        setKeywords(generatedKeywords); // Set the keywords state

        // Set the document name in the input field
        if (docNameRef.current) {
          docNameRef.current.value = nameWithoutExtension;
        }

        // Set the keywords in the textarea
        if (keywordRef.current) {
          keywordRef.current.value = generatedKeywords.join('; ');
        }

        // Generate and set suggested tags
        const suggestedTags = await suggestTags(text);
        setSuggestedTags(suggestedTags);

        // Show a toast with suggested tags
        if (suggestedTags.length > 0) {
          showToast(
            `Suggested tags: ${suggestedTags.map(tag => tag.name).join(', ')}. Click on them to add.`,
            'info'
          );
        }
      }
    } catch (error) {
      console.error('Error checking document:', error);
      showToast('A apărut o eroare la verificarea documentului. Vă rugăm să încercați din nou.', 'error');
    }
  };

  // Helper function to generate keywords from text
  const generateKeywords = async (text) => {
    try {
      let keywords = new Set();
      
      // Split text into sentences
      const sentences = text.split(/[.!?]+/);
      
      // Look for sentences that might contain important information
      sentences.forEach(sentence => {
        // Look for common patterns that indicate important information
        const importantPatterns = [
          /^(this|these|the) (document|report|analysis|study|review)/i,
          /^(we|i) (conclude|find|determine|recommend)/i,
          /^(the) (main|primary|key|important) (points|findings|conclusions)/i,
          /^(summary|conclusion|overview)/i
        ];
        
        if (importantPatterns.some(pattern => pattern.test(sentence))) {
          const words = sentence.split(/\s+/);
          words.forEach(word => {
            if (word.length > 3) {
              keywords.add(word.toLowerCase());
            }
          });
        }
      });

      // If no keywords found through patterns, use frequency analysis
      if (keywords.size === 0) {
        const words = text.toLowerCase().split(/\s+/);
        const wordFreq = {};
        
        // Remove common words and short words
        const commonWords = new Set([
          'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
          'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
          'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him',
          'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only',
          'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want',
          'because', 'any', 'these', 'give', 'day', 'most', 'us'
        ]);

        words.forEach(word => {
          if (word.length > 3 && !commonWords.has(word)) {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
          }
        });

        // Get top 3 most frequent words
        const topWords = Object.entries(wordFreq)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([word]) => word);

        topWords.forEach(word => keywords.add(word));
      }

      // Convert Set to Array and limit to 3 keywords
      return Array.from(keywords).slice(0, 3);
    } catch (error) {
      console.error('Error generating keywords:', error);
      return [];
    }
  };

  // Helper function to suggest tags based on content
  const suggestTags = (text) => {
    // Convert text to lowercase for case-insensitive matching
    const lowerText = text.toLowerCase();
    
    // Score each tag based on keyword matches and content relevance
    const tagScores = availableTags.map(tag => {
      if (!tag || !tag.name) return null;
      
      const tagName = tag.name.toLowerCase();
      const tagWords = tagName.split(/\s+/);
      let score = 0;
      
      // Count how many tag words appear in the text
      tagWords.forEach(word => {
        // Exact word match
        if (lowerText.includes(word)) {
          score += 2;
        }
        
        // Check for word variations (e.g., "contract" matches "contracts", "contracting")
        const wordVariations = [
          word + 's',  // plural
          word + 'ing', // gerund
          word + 'ed',  // past tense
          word + 'er',  // agent noun
          word + 'tion' // action noun
        ];
        
        wordVariations.forEach(variation => {
          if (lowerText.includes(variation)) {
            score += 1.5;
          }
        });
      });
      
      // Check for common document types and categories
      const documentTypes = {
        'contract': ['agreement', 'terms', 'conditions', 'legal', 'signature'],
        'report': ['analysis', 'findings', 'conclusion', 'summary', 'data'],
        'invoice': ['payment', 'amount', 'total', 'bill', 'charge'],
        'proposal': ['offer', 'suggestion', 'recommendation', 'plan'],
        'certificate': ['award', 'achievement', 'qualification', 'diploma'],
        'policy': ['rules', 'guidelines', 'procedure', 'regulation'],
        'manual': ['instructions', 'guide', 'tutorial', 'how-to'],
        'presentation': ['slides', 'deck', 'show', 'demo'],
        'budget': ['financial', 'cost', 'expense', 'revenue'],
        'resume': ['cv', 'experience', 'qualification', 'skills']
      };

      // Check if the tag matches any document type categories
      Object.entries(documentTypes).forEach(([category, keywords]) => {
        if (tagName.includes(category) || keywords.some(keyword => lowerText.includes(keyword))) {
          score += 3;
        }
      });

      // Boost score for predefined tags
      if (tag.isPredefined) {
        score += 1;
      }

      // Boost score for frequently used tags
      if (tag.usageCount > 0) {
        score += Math.min(tag.usageCount / 10, 2); // Cap the boost at 2
      }

      return { tag, score };
    }).filter(Boolean); // Remove any null entries
    
    // Sort by score and get top 2 tags
    const topTags = tagScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(({ tag }) => tag)
      .filter(tag => tag && tag.score > 0);

    // Automatically add the suggested tags if they're not already selected
    topTags.forEach(tag => {
      if (!selectedTags.some(t => t.id === tag.id)) {
        addTag(tag);
      }
    });

    return topTags;
  };

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  async function sendUploadinfo(file, type, keyword, comment, name) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        formData.append('mot', keyword);
        formData.append('comment', comment);
        formData.append('realname', name);
        formData.append('path', documentPath);

          const response = await fetch(`${backend}/post_docs/upload`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }

        console.log("Upload response:", result);

        if (result.success) {
            showToast("Document încărcat cu succes!", "success");
            handleSuccessfulUpload(result.document);
            return { success: true };
        } else {
            showToast(`Eroare la încărcarea documentului: ${result.error}`, "error");
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error("Error during upload:", error);
        showToast(`Eroare la încărcarea documentului: ${error.message}`, "error");
        return { success: false, error: error.message };
    } finally {
        setUploading(false);
    }
}

  const handleTypeSelect = (selectedOption) => {
    console.log('=== DOCUMENT TYPE SELECTION ===');
    console.log('Selected option:', selectedOption);
    console.log('Document types available:', documentTypes);
    
    if (!selectedOption) {
      console.log('No option selected');
      return;
    }

    // Find the type by id since selectedOption is the type object
    const selectedType = documentTypes.find(type => type.id === selectedOption.id);
    console.log('Selected type object:', selectedType);
      
    if (selectedType) {
      setSelectedType(selectedType);
      setSelectedTypeId(selectedType.id);
      setValue(selectedType.type_name); // Set the value to type_name
      console.log('Type set to:', selectedType.type_name);
        
      // Find and select the folder using folder_path from the type
      if (selectedType.folder_path) {
        console.log('Looking for folder with path:', selectedType.folder_path);
        const matchingFolder = folders.find(folder => folder.folder_path === selectedType.folder_path);
        if (matchingFolder) {
          console.log('Found matching folder:', matchingFolder);
          handleFolderSelect(matchingFolder);
          setCurrentPath(matchingFolder.folder_path);
        } else {
          console.log('No matching folder found for path:', selectedType.folder_path);
          setCurrentPath(''); // Resetăm currentPath dacă nu găsim folderul
        }
      }
    }
  };

  const handleFolderClick = (folder) => {
    console.log('=== Folder Click Start ===');
    console.log('Clicked folder:', folder);
    console.log('Current folder:', currentFolder);
    console.log('Current folder path:', currentFolderPath);

    setCurrentFolder(folder);
    setCurrentFolderPath(folder.folder_path);
    setFolderHistory(prev => [...prev, folder]);

    console.log('=== Folder Click End ===');
  };

  const handleFolderSelect = (folder) => {
    console.log('handleFolderSelect called with folder:', folder);
    
          if (folder) {
      setSelectedFolder(folder);
      // Folosim folder_path direct din obiectul folder
      const folderPath = folder.folder_path;
      setSelectedFolderPath(folderPath);
      setCurrentPath(folderPath); // Adăugăm această linie pentru a actualiza currentPath
      console.log('Setting folder path to:', folderPath);
          } else {
      setSelectedFolder(null);
      setSelectedFolderPath('');
      setCurrentPath(''); // Resetăm și currentPath când nu este selectat niciun folder
      console.log('Setting folder path to empty string');
    }

    setShowFolderModal(false);
    setCurrentFolder(null);
    setCurrentFolderPath('');
    setFolderHistory([]);
  };

  const handleClick = async () => {
    try {
        // Validate that we have a file selected
        if (!selectedFile) {
            showToast('Please select a file to upload', 'error');
            return;
        }

        setUploading(true);
        
        // Fetch latest storage info before checking
        const storageResponse = await fetch(`${backend}/post_docs/storage`, {
            credentials: 'include',
        });
        
        if (!storageResponse.ok) {
            throw new Error('Failed to fetch storage information');
        }
        
        const storageData = await storageResponse.json();
        setCurrentUsage(storageData.totalUsage);
        setPlanLimit(storageData.storageLimit);
        setAvailableSpace(storageData.availableStorage);

        const fileSizeMB = selectedFile.size / (1024 * 1024);
        
        // Check if upload would exceed storage limit
        if (fileSizeMB > storageData.availableStorage) {
            // Set storage limit details for the modal
            setStorageLimitDetails({
                currentUsage: storageData.totalUsage.toFixed(2),
                planLimit: storageData.storageLimit.toFixed(2),
                fileSize: fileSizeMB.toFixed(2),
                availableSpace: storageData.availableStorage.toFixed(2),
                userId: userId,
                requiredSpace: (fileSizeMB - storageData.availableStorage).toFixed(2)
            });
            
            // Show the storage limit modal
            setShowStorageLimitModal(true);
            setUploading(false);
            return;
        }

        // Validate other required fields
        if (!selectedFolderPath) {
            showToast('Please select a folder', 'error');
            setUploading(false);
            return;
        }

        if (!value) {
            showToast('Please select a document type', 'error');
            setUploading(false);
            return;
        }

        // If storage limit is not exceeded, proceed with upload
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        // Handle document type differently for versioning
        if (isVersioning && selectedDocument) {
            // For versioning, use the type from the selected document
            formData.append('type', selectedDocument.type);
            console.log('Using document type for versioning:', selectedDocument.type);
        } else {
            // For new documents, use the selected type
            formData.append('type', value);
            console.log('Using selected document type:', value);
        }
        
        formData.append('mot', keywords.join(','));
        formData.append('comment', comment);
        formData.append('realname', documentName);
        
        // Construim calea completă pentru încărcare
        const uploadPath = selectedFolderPath;
        console.log('Selected folder path:', uploadPath);
        formData.append('path', uploadPath);

        // Add selected tags to form data
        if (selectedTags.length > 0) {
            const tagsToSend = selectedTags.map(tag => ({
                id: tag.id && !tag.id.toString().startsWith('local-') ? tag.id : undefined,
                name: tag.name
            }));
            console.log('Sending tags:', tagsToSend);
            formData.append('tags', JSON.stringify(tagsToSend));
        }

        // Add version-specific data if versioning
        if (isVersioning) {
            formData.append('version', 'true');
            formData.append('original_doc_id', selectedDocument.id);
            formData.append('change_summary', changeSummary);
            console.log('Versioning data:', {
                original_doc_id: selectedDocument.id,
                change_summary: changeSummary,
                type: selectedDocument.type
            });
        }

        // Log selected path more clearly
        console.log('************************************');
        console.log('Upload path being used:', selectedFolderPath);
        console.log('************************************');

        const response = await fetch(`${backend}/post_docs/upload`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to upload document');
        }

        const data = await response.json();
        if (data.success) {
            showToast('Document uploaded successfully', 'success');
            handleSuccessfulUpload(data.document);
        } else {
            throw new Error(data.error || 'Failed to upload document');
        }
    } catch (error) {
        console.error('Error uploading document:', error);
        showToast(error.message || 'Error uploading document', 'error');
    } finally {
        setUploading(false);
    }
};

  // Add function to handle sending request to admin
  const handleSendToAdmin = async () => {
    try {
      // Calculate required space
      const requiredSpace = parseFloat(storageLimitDetails.fileSize) - 
                          (parseFloat(storageLimitDetails.planLimit) - 
                           parseFloat(storageLimitDetails.currentUsage));

      const requestData = {
        user_id: userId,
        request_type: 'storage_upgrade',
        current_usage: storageLimitDetails.currentUsage,
        plan_limit: storageLimitDetails.planLimit,
        file_size: storageLimitDetails.fileSize,
        required_space: requiredSpace.toFixed(2),
        reason: `Storage upgrade needed for file upload. Current usage: ${storageLimitDetails.currentUsage}MB, Plan limit: ${storageLimitDetails.planLimit}MB, File size: ${storageLimitDetails.fileSize}MB`,
        status: 'pending'
      };

      console.log('Sending storage upgrade request to admin with details:', requestData);

      const response = await fetch(`${backend}/api/admin/storage-upgrade-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error('Failed to send request to admin');
      }

      const data = await response.json();
      if (data.success) {
        showToast('Request sent to administrator successfully', 'success');
        setShowStorageLimitModal(false);
      } else {
        throw new Error(data.error || 'Failed to send request to admin');
      }
    } catch (error) {
      console.error('Error sending request to admin:', error);
      showToast('Failed to send request to admin', 'error');
    }
  };

  const handleDocumentChange = (docValue) => {
    if (docValue) {
      const doc = documentOptions.find(option => option.value === docValue);
      if (!doc) {
        console.error("Document not found in options");
        return;
      }

      console.log("Document details from options:", doc);
      setSelectedDocument(doc);
      setIsLoadingVersions(true);
      setDocumentVersions([]);
      setShowVersionHistory(false);

      // Fetch document details including keys, tags, and comments
      fetch(`${backend}/post_docs/details/${encodeURIComponent(docValue)}`, {
        method: 'GET',
        credentials: 'include',
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Error fetching document details: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          console.log("Document details response:", data);
          if (data.success) {
            // Set document details
            setSelectedDocument(prev => ({
              ...prev,
              ...data.document,
              id: data.document.id // Ensure we have the numeric ID
            }));

            // Set keywords from table_mot_cle
            if (data.document.keywords) {
              let keywordsArray;
              if (Array.isArray(data.document.keywords)) {
                keywordsArray = data.document.keywords.map(kw => kw.mot_cle || kw).filter(Boolean);
              } else if (typeof data.document.keywords === 'string') {
                keywordsArray = data.document.keywords.split(';').map(k => k.trim()).filter(Boolean);
              } else {
                keywordsArray = [];
              }
              setKeywords(keywordsArray);
              if (keywordRef.current) {
                keywordRef.current.value = keywordsArray.join('; ');
              }
            }

            // Set comment in the textarea
            if (data.document.comment) {
              if (commentRef.current) {
                commentRef.current.value = data.document.comment;
              }
            }

            // Set document name in the input
            if (data.document.originalName) {
              if (docNameRef.current) {
                docNameRef.current.value = data.document.originalName;
              }
            }

            // Set document type
            if (data.document.type) {
              console.log("Setting document type:", data.document.type);
              setValue(data.document.type);
            }

            // Set document path from existing document
            if (data.document.path) {
              console.log("Setting document path from existing document:", data.document.path);
              setDocumentPath(data.document.path);
              setCurrentPath(data.document.path);
              setSelectedFolderPath(data.document.path);
              setCurrentFolderPath(data.document.path);
              setNoFolder(false);
            }

            // Set document path and fetch the PDF file
            if (data.document.path) {
              // Fetch the PDF file
                fetch(`${backend}/download/${encodeURIComponent(docValue)}`, {
                credentials: 'include'
              })
                .then(response => response.blob())
                .then(blob => {
                  const file = new File([blob], data.document.originalName || docValue, { type: 'application/pdf' });
                  setDoc(file);
                  setFileName(file.name);
                  setSelectedFile(file); // Set the selected file
                  setNofile(false); // Reset the nofile validation state
                })
                .catch(err => {
                  console.error("Error fetching PDF file:", err);
                  showToast("Error fetching PDF file", "error");
                });
            }

            // Fetch document tags separately
            if (data.document.id) {
              fetch(`${backend}/post_docs/document-tags/${data.document.id}`, {
                method: 'GET',
                credentials: 'include',
              })
                .then(response => {
                  if (!response.ok) {
                    throw new Error(`Error fetching document tags: ${response.status}`);
                  }
                  return response.json();
                })
                .then(tagsData => {
                  console.log("Document tags:", tagsData);
                  if (tagsData.success && Array.isArray(tagsData.tags)) {
                    setSelectedTags(tagsData.tags.map(tag => ({
                      id: tag.id_tag,
                      name: tag.tag_name,
                      isPredefined: tag.is_predefined === 1
                    })));
                  }
                })
                .catch(err => {
                  console.error("Error fetching document tags:", err);
                  showToast("Error fetching document tags", "error");
                });
            }
          }
        })
        .catch(err => {
          console.error("Error fetching document details:", err);
          showToast("Error fetching document details", "error");
        });

      // Fetch document versions
      fetch(`${backend}/post_docs/versions/${encodeURIComponent(docValue)}`, {
        method: 'GET',
        credentials: 'include',
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Error fetching versions: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          console.log("Document versions:", data);
          if (data.success && data.versions) {
            if (data.versions.success) {
              setDocumentVersions(data.versions.versions || []);
              setShowVersionHistory(true);
            } else {
              setDocumentVersions([]);
              console.warn("Error in version data:", data.versions.error);
            }
          } else {
            setDocumentVersions([]);
            if (data.error) {
              console.warn("Error fetching versions:", data.error);
            }
          }
          setIsLoadingVersions(false);
        })
        .catch(err => {
          console.error("Error fetching document versions:", err);
          setDocumentVersions([]);
          setIsLoadingVersions(false);
          showToast("Error fetching document versions", "error");
        });
    } else {
      setDocumentVersions([]);
      setShowVersionHistory(false);
      
      // Reset document form
      if (docNameRef.current) {
        docNameRef.current.value = '';
      }
      if (keywordRef.current) {
        keywordRef.current.value = '';
      }
      if (commentRef.current) {
        commentRef.current.value = '';
      }
      setSelectedTags([]);
      setValue('');
      setDocumentPath('');
      setCurrentPath('');
      setSelectedFolderPath('');
      setCurrentFolderPath('');
      setDoc(null);
      setFileName('');
      setKeywords([]); // Reset keywords array
      setSelectedFile(null); // Reset selected file
      setNofile(true); // Set nofile validation state
    }
  };

  // Add this handler for the Enter key in the tag input
  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' && newTagName.trim()) {
      e.preventDefault();
      createNewTag();
    }
  };

  // Cleanup function for document URL
  React.useEffect(() => {
    return () => {
      if (docUrl) {
        URL.revokeObjectURL(docUrl);
      }
    };
  }, [docUrl]);

  // Add the extractTextFromPDF function
  const extractTextFromPDF = async (file) => {
    try {
      const pdf = await pdfjs.getDocument(URL.createObjectURL(file)).promise;
      let fullText = '';
      
      // Extract text from first 3 pages
      for (let i = 1; i <= Math.min(3, pdf.numPages); i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ') + ' ';
      }
      
      return fullText;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      return '';
    }
  };

  // Add this function to handle version confirmation
  const handleVersionConfirm = (document) => {
    setIsVersioning(true);
    setExistingDocument(document.label);
    setSelectedDocument(document);
    
    // Set document type using type_id
    if (document.type_id) {
      setValue(document.type_id);
    } else if (document.type) {
      // Fallback to type if type_id is not available
      const type = documentTypes.find(t => t.type_name === document.type);
      if (type) {
        setValue(type.id);
      }
    }
    
    // Set keywords
    if (keywordRef.current) {
      keywordRef.current.value = document.keywords?.join('; ') || '';
    }
    
    // Set comment
    setComment(document.comment || '');

    // Set tags
    if (document.tags && Array.isArray(document.tags)) {
      const formattedTags = document.tags.map(tag => ({
        id: tag.id_tag,
        name: tag.tag_name,
        isPredefined: tag.is_predefined === 1
      }));
      setSelectedTags(formattedTags);
    }

    setShowVersionModal(false);
  };

  const handleBackClick = () => {
    if (folderHistory.length > 0) {
      const previousFolder = folderHistory[folderHistory.length - 1];
      setCurrentFolder(previousFolder);
      setCurrentFolderPath(previousFolder.folder_path);
      setFolderHistory(folderHistory.slice(0, -1));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userInstitution) {
      setError('User institution not found');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', selectedType);
      formData.append('path', `${userInstitution.name}/${selectedPath}`);
      formData.append('comment', comment);
      formData.append('tags', JSON.stringify(selectedTags));

      const response = await fetch(`${backend}/post_docs/upload`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Origin': window.location.origin },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload document');
      }

      setSuccess('Document uploaded successfully');
      setSelectedFile(null);
      setSelectedType('');
      setSelectedPath('');
      setComment('');
      setSelectedTags([]);
      fetchData();
    } catch (error) {
      console.error('Error uploading document:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Add handler for keyword input
  const handleKeywordInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const keyword = e.target.value.trim();
      if (keyword) {
        addKeyword(keyword);
        e.target.value = '';
      }
    }
  };

  // Function to handle document upload
  const handleUpload = async () => {
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', selectedType);
      formData.append('keywords', JSON.stringify(keywords));
      formData.append('comment', comment);
      formData.append('name', documentName);
      formData.append('isAdmin', true);

      const response = await fetch(`${backend}/admin/documents/upload`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Origin': window.location.origin },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      showToast('Document uploaded successfully', 'success');
      handleSuccessfulUpload(result);
    } catch (error) {
      console.error('Upload error:', error);
      showToast('Failed to upload document', 'error');
    }
  };

  // Function to save draft
  const saveAsDraft = async () => {
    try {
      console.log('Saving draft with selectedType:', selectedType);
      
      if (!selectedType) {
        console.error('No type selected');
        showToast('Please select a document type', 'error');
        return;
      }

      // Get the comment value from the ref
      const commentValue = commentRef.current?.value || '';

      // Ensure keywords and selectedTags are arrays
      const keywordsArray = Array.isArray(keywords) ? keywords : [];
      const selectedTagsArray = Array.isArray(selectedTags) ? selectedTags : [];

      // Create FormData object to send both the file and other data
      const formData = new FormData();
      formData.append('documentName', documentName);
      formData.append('type_id', selectedType.id);
      formData.append('documentStatus', 'draft');
      formData.append('keywords', JSON.stringify(keywordsArray));
      formData.append('comment', commentValue);
      formData.append('selectedTags', JSON.stringify(selectedTagsArray));
      formData.append('folderPath', selectedFolderPath);
      
      // Set the document path for the draft
      const draftPath = `Draft/${documentName}.pdf`;
      formData.append('documentPath', draftPath);

      // Add the file if it exists
      if (doc) {
        console.log('Adding file to draft:', doc);
        formData.append('file', doc);
      }

      console.log('Sending draft data with file:', {
        documentName,
        type_id: selectedType.id,
        documentStatus: 'draft',
        keywords: keywordsArray,
        comment: commentValue,
        selectedTags: selectedTagsArray,
        folderPath: selectedFolderPath,
        documentPath: draftPath,
        hasFile: !!doc
      });

      const response = await axios.post(`${backend}/post_docs/drafts`, formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        showToast('Draft saved successfully', 'success');
        // Refresh the draft list
        fetchDrafts();
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      showToast('Failed to save draft', 'error');
    }
  };

  // Function to load draft
  const loadDraft = async (draftId) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${backend}/post_docs/drafts/${draftId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load draft');
      }

      const data = await response.json();
      if (data.success && data.draft) {
        // Parse keywords from JSON string to array
        const parsedKeywords = JSON.parse(data.draft.keywords || '[]');
        setKeywords(Array.isArray(parsedKeywords) ? parsedKeywords : []);
        
        // Parse selected tags from JSON string to array
        const parsedTags = JSON.parse(data.draft.selected_tags || '[]');
        setSelectedTags(Array.isArray(parsedTags) ? parsedTags : []);
        
        // Set other draft data
        setDocumentName(data.draft.document_name || '');
        
        // Find and set the document type
        const type = documentTypes.find(t => t.id === data.draft.type_id);
        if (type) {
          setSelectedType(type);
          setDocumentType(type.value);
        }
        
        setComment(data.draft.comment || '');
        
        // Set the folder path and current path
        const folderPath = data.draft.folder_path || '';
        setSelectedFolderPath(folderPath);
        setCurrentPath(folderPath); // Add this line to update the current path
        
        setLoadedDraftId(draftId);
        setIsDraftLoaded(true);
        setIsDraft(true); // Set isDraft to true to show the yellow upload button
        
        // Set the comment in the textarea
        if (commentRef.current) {
          commentRef.current.value = data.draft.comment || '';
        }
        
        // Set the document name in the input
        if (docNameRef.current) {
          docNameRef.current.value = data.draft.document_name || '';
        }
        
        // Set the keywords in the textarea
        if (keywordRef.current) {
          keywordRef.current.value = parsedKeywords.join('; ');
        }

        // Load the draft file
        const fileResponse = await fetch(`${backend}/post_docs/drafts/${draftId}/file`, {
          credentials: 'include'
        });

        if (fileResponse.ok) {
          const blob = await fileResponse.blob();
          const file = new File([blob], data.draft.document_name, { type: blob.type });
          setSelectedFile(file);
          setDoc(file);
          setFileName(file.name);
          
          // Create preview URL for the PDF
          const fileUrl = URL.createObjectURL(blob);
          setDocUrl(fileUrl);
          
          // Load PDF to get number of pages
          const pdf = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise;
          setNumPages(pdf.numPages);
          setPageNumber(1);
        }
        
        // Close the draft modal
        setShowDraftModal(false);
        
        showToast('Draft loaded successfully', 'success');
      }
    } catch (error) {
      console.error('Error loading draft:', error);
      showToast('Failed to load draft', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // New function to handle draft upload
  const handleDraftUpload = async () => {
    if (!selectedFile || !selectedType || !selectedFolderPath) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', selectedType.id);
      formData.append('keywords', JSON.stringify(keywords));
      formData.append('comment', comment);
      formData.append('path', selectedFolderPath);
      formData.append('documentName', documentName);
      formData.append('draftId', loadedDraftId); // Add draft ID to identify it for deletion
      formData.append('isDraftUpload', 'true'); // Add flag to indicate this is a draft upload

      const response = await fetch(`${backend}/post_docs/upload-draft`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload draft');
      }

      const data = await response.json();
      if (data.success) {
        showToast('Document uploaded successfully', 'success');
        
        // Delete the draft after successful upload
        try {
          await axios.delete(`${backend}/post_docs/drafts/${loadedDraftId}`, {
            withCredentials: true
          });
          
          // Remove the draft from the local state
          setDraftList(prevDrafts => prevDrafts.filter(draft => draft.id_draft !== loadedDraftId));
        } catch (error) {
          console.error('Error deleting draft:', error);
          // Don't show error to user since the main upload was successful
        }
        
        // Reset form and draft states
        setSelectedFile(null);
        setSelectedType(null);
        setKeywords([]);
        setComment('');
        setDocumentName('');
        setSelectedFolderPath('');
        setCurrentPath('');
        setIsDraftLoaded(false);
        setLoadedDraftId(null);
        setIsDraft(false); // Reset draft state
        setDocUrl(null); // Clear the PDF preview
        setNumPages(0);
        setPageNumber(1);
        
        // Refresh drafts list
        fetchDrafts();
      }
    } catch (error) {
      console.error('Error uploading draft:', error);
      showToast('Failed to upload document', 'error');
    }
  };

  // Function to delete draft
  const deleteDraft = async (draftId) => {
    try {
      // First, get the draft details to get the file name
      const draftResponse = await axios.get(`${backend}/post_docs/drafts/${draftId}`, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!draftResponse.data.success) {
        throw new Error('Failed to fetch draft details');
      }

      const draft = draftResponse.data.draft;
      const fileName = draft.document_path ? draft.document_path.split('/').pop() : null;

      // Delete the draft from the database
      const deleteResponse = await axios.delete(`${backend}/post_docs/drafts/${draftId}`, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (deleteResponse.data.success) {
        // Delete the associated PDF file from the drafts folder if it exists
        if (fileName) {
          try {
            await axios.delete(`${backend}/post_docs/drafts/file/${fileName}`, {
              withCredentials: true,
              headers: {
                'Content-Type': 'application/json'
              }
            });
          } catch (fileError) {
            console.warn('Error deleting draft file:', fileError);
            // Continue even if file deletion fails, as the draft is already deleted from the database
          }
        }

        // Remove the draft from the local state
        setDraftList(prevDrafts => prevDrafts.filter(draft => draft.id_draft !== draftId));
        // If the deleted draft was the selected one, clear the selection
        if (selectedDraft?.id_draft === draftId) {
          setSelectedDraft(null);
        }
        showToast('Draft deleted successfully', 'success');
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
      showToast('Failed to delete draft', 'error');
    }
  };

  // Modify handleFileSelect
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setDoc(file); // Add this line to set the doc state
      
      try {
        // Add watermark to the PDF
        const watermarkedFile = await addWatermarkToPDF(file);
        
        // Create preview URL
        const url = URL.createObjectURL(watermarkedFile);
        setDocUrl(url);
        
        // Load PDF to get number of pages
        const pdf = await pdfjs.getDocument({ data: await watermarkedFile.arrayBuffer() }).promise;
        setNumPages(pdf.numPages);
        setPageNumber(1);
      } catch (error) {
        console.error('Error processing PDF:', error);
        toast.error('Error processing PDF file');
      }
    } else {
      toast.error('Please select a PDF file');
    }
  };

  // Modify handleDownload
  const handleDownload = async (document) => {
    try {
      const response = await fetch(`${backend}/download_doc/${document.nom_document}`);
      if (!response.ok) {
        throw new Error('Failed to download document');
      }
      
      // Get the PDF as a blob
      const blob = await response.blob();
      
      // Add watermark to the PDF
      const watermarkedBlob = await addWatermarkToPDF(blob);
      
      // Create download link
      const url = URL.createObjectURL(watermarkedBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = document.nom_document;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Error downloading document');
    }
  };

  // Modify handleView
  const handleView = async (document) => {
    try {
      const response = await fetch(`${backend}/download_doc/${document.nom_document}`);
      if (!response.ok) {
        throw new Error('Failed to download document');
      }
      
      // Get the PDF as a blob
      const blob = await response.blob();
      
      // Add watermark to the PDF
      const watermarkedBlob = await addWatermarkToPDF(blob);
      
      // Create blob URL for viewing
      const url = URL.createObjectURL(watermarkedBlob);
      
      // Open in new tab
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Error viewing document');
    }
  };

  // Add comment change handler
  const handleCommentChange = (e) => {
    setComment(e.target.value);
    if (commentRef.current) {
      commentRef.current.value = e.target.value;
    }
  };

  // Add function to get user's institution
  const fetchUserInstitution = async () => {
    try {
      const response = await fetch(`${backend}/api/user/institution`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user institution');
      }

      const data = await response.json();
      if (data.success) {
        setUserInstitution(data.institution);
      }
    } catch (error) {
      console.error('Error fetching user institution:', error);
      setError(error.message);
    }
  };

  // Add this function to handle folder modal opening
  const handleOpenFolderModal = () => {

    // Reset to root level
    setCurrentFolder(null);
    setCurrentFolderPath('');
    setShowFolderModal(true);
  };

  useEffect(() => {
    console.log('=== Socket Connected in Uploadpage ===');
    const socket = getSocket();
    console.log('Socket ID:', socket.id);
    console.log('Transport:', socket.io.engine.transport.name);

    socket.on('fileSystemChange', (data, callback) => {
        console.log('=== Received fileSystemChange in Uploadpage ===');
        console.log('Event data:', data);
        if (callback) callback({ success: true });
    });

    return () => {
        console.log('=== Cleaning up socket connection in Uploadpage ===');
        socket.off('fileSystemChange');
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50"
    >
      <ToastContainer position="top-right" autoClose={5000} />
      {!isAuthenticated && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"
        >
          <strong className="font-bold">Atenție!</strong>
          <span className="block sm:inline"> Nu sunteți autentificat. Vă rugăm să vă autentificați pentru a încărca documente.</span>
        </motion.div>
      )}

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}

      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto pt-8">
        <div className="container mx-auto px-4 py-4">
          <div className="flex gap-8 w-full max-w-[90%] mx-auto">
            {/* Form Section */}
            <div className="w-1/2 shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl p-8 overflow-y-auto max-h-[calc(100vh-12rem)]">
              <form id="uploadForm" className="space-y-6">
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex justify-between items-center mb-6"
                >
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Upload Documents</h1>
            {isDraft && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200"
                    >
                Draft
                    </motion.span>
            )}
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center mb-6"
                >
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isVersioning}
                onChange={toggleVersioning}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ms-3 text-sm font-medium text-gray-700">Upload new version of existing document</span>
            </label>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 mb-6"
                >
            <p className="text-sm text-blue-700 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-2 text-blue-500">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
              You will be recorded as the {isVersioning ? 'document version creator' : 'document author'}. Documents can be searched by author name.
            </p>
                </motion.div>

          {isVersioning && (
            <div className="mt-4 mb-4">
              <Popover open={documentDropdownOpen} onOpenChange={setDocumentDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={documentDropdownOpen}
                    className="w-full md:w-[280px] justify-between p-3"
                  >
                    {selectedDocument
                      ? selectedDocument.label
                      : "Select document to update..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command className="h-[300px] overflow-y-auto">
                    <CommandInput placeholder="Search document..." />
                    <CommandEmpty>No document found.</CommandEmpty>
                    <CommandList className="max-h-[250px] overflow-y-auto">
                      {documentOptions.map((doc) => (
                        <CommandItem
                          key={`doc-${doc.id}-${doc.value}`}
                          value={doc.value}
                          onSelect={(currentValue) => {
                            handleDocumentChange(currentValue === selectedDocument?.value ? "" : currentValue);
                            setDocumentDropdownOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedDocument?.value === doc.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {doc.label}
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                <Popover open={typeDropdownOpen} onOpenChange={setTypeDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={typeDropdownOpen}
                      className="w-full justify-between border border-gray-300 py-2"
                    >
                      {value
                        ? documentTypes.find((type) => type.value === value)?.label
                        : "Select type..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search type..." />
                      <CommandEmpty>No type found.</CommandEmpty>
                      <CommandList>
                        {documentTypes.map((type) => (
                          <CommandItem
                            key={type.value}
                            value={type.value}
                            onSelect={(currentValue) => {
                             
                              handleTypeSelect(currentValue);
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                value === type.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {type.label}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Path</label>
                <div className="relative">
                  <input
                    type="text"
                    value={currentPath}
                    onChange={(e) => setCurrentPath(e.target.value)}
                    className={`w-full pl-4 pr-12 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 ${
                      noFolder ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Document path will be set based on type"
                    readOnly
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Auto-completed</span>
                    <button
                      type="button"
                      onClick={handleOpenFolderModal}
                      className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <svg 
                        className="w-5 h-5" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" 
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                {noFolder && <p className="mt-1 text-sm text-red-500">Please select a folder</p>}
              </div>

              <div className="mt-4">
                <textarea
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  rows="2"
                  className="block p-3 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What changed in this version? (optional)"
                ></textarea>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center w-full">
            <label 
              htmlFor="dropzone-file" 
              className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ease-in-out
                ${isDragging ? 'border-blue-500 bg-blue-50 scale-105' : nofile ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-blue-500 hover:bg-gray-50'}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <CloudUpload className={`size-12 mb-3 ${isDragging ? 'text-blue-500' : nofile ? 'text-red-500' : 'text-gray-400'}`} />
                <p className={`mb-2 text-sm font-medium ${isDragging ? 'text-blue-500' : nofile ? 'text-red-500' : 'text-gray-500'}`}>
                  {isDragging ? 'Drop your file here' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-sm text-blue-600 font-medium">{fileName}</p>
                {isDragging && (
                  <div className="mt-2 text-sm text-blue-500 animate-pulse">
                    Release to upload
                  </div>
                )}
              </div>
              <input 
                id="dropzone-file" 
                type="file" 
                className="hidden" 
                onChange={handleFileInputChange} 
                ref={fileInputRef} 
                accept=".pdf,.doc,.docx"
                required 
              />
            </label>
          </div>

          {!isVersioning && (
            <>
              <div className="mt-6">
                <input 
                  type="text" 
                  className={`bg-white border text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full p-3.5 transition-all duration-200 ${
                    noName ? 'border-red-500 placeholder:text-red-500' : 'border-gray-200 hover:border-gray-300'
                  }`} 
                  placeholder="Document Name" 
                  value={documentName || ''}
                  onChange={(e) => setDocumentName(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Document Type
                </label>
                <Popover open={typeDropdownOpen} onOpenChange={setTypeDropdownOpen}>
                  <PopoverTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`w-full flex items-center justify-between px-4 py-3.5 text-sm bg-white border rounded-xl cursor-pointer hover:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all duration-200 ${
                        noType ? 'border-red-500' : 'border-gray-200'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {selectedType ? selectedType.type_name : "Select document type..."}
                      </span>
                      <motion.div
                        animate={{ rotate: typeDropdownOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronsUpDown className="h-4 w-4 text-gray-500" />
                      </motion.div>
                    </motion.div>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-full p-0 mt-2"
                    sideOffset={5}
                  >
                    <Command className="rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                      <div className="flex items-center border-b border-gray-100 px-3 py-2.5 bg-gradient-to-r from-blue-50 to-violet-50">
                        <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <CommandInput 
                          placeholder="Search document type..." 
                          className="flex-1 border-none bg-transparent focus:ring-0 text-sm placeholder-gray-400"
                        />
                      </div>
                      <CommandEmpty className="py-6 text-center text-sm text-gray-500">
                        No document type found.
                      </CommandEmpty>
                      <CommandList className="max-h-[300px] overflow-y-auto">
                        <AnimatePresence>
                        {documentTypes.map((type) => (
                            <motion.div
                            key={type.id}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                            >
                          <CommandItem
                            value={type.id}
                            onSelect={(currentValue) => {
                             
                              const newValue = currentValue === value ? "" : currentValue;
                              setValue(newValue);
                              if (selectedDocument) {
                                setSelectedDocument(prev => ({
                                  ...prev,
                                  type: newValue
                                }));
                              }
                              // Pass the type object directly
                              handleTypeSelect(type);
                              setTypeDropdownOpen(false);
                            }}
                            className="flex items-center gap-2 px-4 py-3 text-sm cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-violet-50 data-[selected=true]:bg-gradient-to-r data-[selected=true]:from-blue-100 data-[selected=true]:to-violet-100 transition-colors duration-200"
                          >
                                <motion.div
                                  initial={false}
                                  animate={{ scale: value === type.id ? 1 : 0.8, opacity: value === type.id ? 1 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <Check className="h-4 w-4 text-blue-600" />
                                </motion.div>
                                <span className={value === type.id ? 'text-blue-700 font-medium' : ''}>{type.type_name}</span>
                          </CommandItem>
                            </motion.div>
                        ))}
                        </AnimatePresence>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {noType && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 text-sm text-red-500 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Please select a document type
                  </motion.p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Path</label>
                <div className="relative">
                  <input
                    type="text"
                    value={currentPath}
                    onChange={(e) => setCurrentPath(e.target.value)}
                    className={`w-full pl-4 pr-12 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 ${
                      noFolder ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Document path will be set based on type"
                    readOnly
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Auto-completed</span>
                    <button
                      type="button"
                      onClick={handleOpenFolderModal}
                      className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <svg 
                        className="w-5 h-5" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" 
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                {noFolder && <p className="mt-1 text-sm text-red-500">Please select a folder</p>}
              </div>
            </>
          )}

          <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
              Keywords (max 5)
            </label>
            
            {/* Keyword input */}
            <div className="flex gap-2 mb-2">
                    <div className="relative flex-1">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={handleKeywordInputKeyDown}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="Add a keyword and press Enter"
                maxLength={50}
              />
                      <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
            </div>

            {/* Keywords list */}
                  <>
                    <AnimatePresence>
            <div className="flex flex-wrap gap-2 mb-4">
              {keywords.map((keyword, index) => (
                          <motion.span
                  key={index}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            whileHover={{ scale: 1.05 }}
                            className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 shadow-sm hover:shadow-md transition-all duration-200"
                          >
                            <svg className="w-4 h-4 mr-1.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                  {keyword}
                            <motion.button
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => removeKeyword(keyword)}
                              className="ml-2 inline-flex items-center p-0.5 text-purple-400 hover:text-purple-600 hover:bg-purple-200 rounded-full transition-colors duration-200"
                  >
                              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                            </motion.button>
                          </motion.span>
              ))}
            </div>
                    </AnimatePresence>

            {/* Generated keywords suggestions */}
            {generatedKeywords.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2"
                      >
                        <p className="text-sm text-gray-600 mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-1.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Suggested keywords:
                        </p>
                <div className="flex flex-wrap gap-2">
                  {generatedKeywords.map((keyword, index) => (
                            <motion.button
                      key={index}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                      onClick={() => addKeyword(keyword)}
                              className="px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 hover:from-blue-100 hover:to-indigo-100 shadow-sm hover:shadow-md transition-all duration-200 flex items-center"
                    >
                              <svg className="w-4 h-4 mr-1.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                      {keyword}
                            </motion.button>
                  ))}
                </div>
                      </motion.div>
            )}
                  </>
          </div>

          <div className="mt-4">
            <textarea
              ref={commentRef}
              rows="3"
              className="block p-3 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Comments..."
              value={comment}
              onChange={handleCommentChange}
            ></textarea>
          </div>

          {/* Tags Section */}
          <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
              Tags {isLoadingTags && <span className="ml-2 inline-block animate-spin">⟳</span>}
            </label>
            <div className="flex flex-wrap mb-2">
                    <AnimatePresence>
              {selectedTags.map(tag => (
                <TagItem key={`selected-${tag.id}-${tag.name}`} tag={tag} onRemove={removeTag} />
              ))}
                    </AnimatePresence>

              {!showTagInput && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setShowTagInput(true)}
                        className="inline-flex items-center justify-center h-8 px-3 py-1 text-sm font-medium text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full hover:from-blue-100 hover:to-indigo-100 shadow-sm hover:shadow-md transition-all duration-200"
                >
                        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add tag
                      </motion.button>
              )}
            </div>

            {showTagInput && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-2 mt-2"
                    >
                {/* First option: Manual tag input with Enter key and button */}
                <div className="flex gap-2">
                        <div className="relative flex-1">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="Enter new tag name"
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    autoFocus
                  />
                          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (newTagName.trim()) {
                        createNewTag();
                      } else {
                        showToast("Please enter a tag name", "error");
                      }
                    }}
                          className={`px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-200 ${
                            newTagName.trim() 
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow-md' 
                              : 'bg-gray-400 cursor-not-allowed'
                      }`}
                  >
                    Add Tag
                        </motion.button>
                </div>

                      <div className="text-xs text-gray-500 mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                  Press Enter to add the tag or select from existing tags below
                </div>

                {/* Existing tags indicator */}
                {availableTags.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="my-2"
                        >
                          <p className="text-xs text-gray-700 mb-1 flex items-center">
                            <svg className="w-4 h-4 mr-1.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                            Popular tags:
                          </p>
                    <div className="flex flex-wrap gap-1">
                      {availableTags
                        .filter(tag => !selectedTags.some(t => t.id === tag.id))
                              .slice(0, 8)
                        .map(tag => (
                                <motion.span
                            key={`tag-option-${tag.id}-${tag.name}`}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              addTag(tag);
                              setNewTagName('');
                            }}
                                  className="inline-flex items-center bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 text-xs font-medium px-2.5 py-1.5 rounded-full cursor-pointer hover:from-blue-50 hover:to-indigo-50 hover:text-blue-800 shadow-sm hover:shadow-md transition-all duration-200"
                          >
                                  <svg className="w-3.5 h-3.5 mr-1.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                  </svg>
                            {tag.name} {tag.usageCount > 0 && <span className="ml-1 text-gray-500">({tag.usageCount})</span>}
                                </motion.span>
                        ))}
                      {availableTags.length > 8 && (
                        <span className="text-xs text-gray-500 self-center">+ {availableTags.length - 8} more</span>
                      )}
                    </div>
                        </motion.div>
                )}

                {/* Second option: Existing Command/Popover component */}
                <Popover>
                  <PopoverTrigger asChild>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full justify-between px-4 py-2.5 h-10 text-sm bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-indigo-50 text-gray-700 hover:text-blue-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center"
                    >
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                      Browse all tags ({availableTags.length})
                            </span>
                            <ChevronsUpDown className="h-4 w-4 text-gray-500" />
                          </motion.button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search existing tags..."
                              className="h-9"
                      />
                      <CommandList>
                        <CommandEmpty>No matching tags found</CommandEmpty>
                        {availableTags
                          .filter(tag => !selectedTags.some(t => t.id === tag.id))
                          .map(tag => (
                            <CommandItem
                              key={`tag-browser-${tag.id}-${tag.name}`}
                              value={tag.name}
                              onSelect={() => {
                                addTag(tag);
                                setNewTagName('');
                                setShowTagInput(false);
                              }}
                                    className="flex items-center px-2 py-1.5 cursor-pointer hover:bg-blue-50"
                            >
                                    <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                              {tag.name} {tag.isPredefined && <span className="ml-2 text-xs text-gray-400">(predefined)</span>}
                              {tag.usageCount > 0 && <span className="ml-2 text-xs text-gray-400">({tag.usageCount})</span>}
                            </CommandItem>
                          ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                  onClick={() => setShowTagInput(false)}
                        className="mt-1 inline-flex items-center justify-center p-2 text-sm text-gray-500 bg-transparent rounded-lg hover:bg-gray-100 transition-all duration-200"
              >
                        <svg className="w-5 h-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                      </motion.button>
                    </motion.div>
            )}
          </div>

                <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
              type="button"
                    onClick={handleClick}
              disabled={uploading}
                    className={`flex-1 px-6 py-2.5 text-sm font-medium text-white rounded-xl transition-all duration-200 ${
                      uploading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl'
                    }`}
            >
              {uploading ? (
                      <span className="flex items-center justify-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                </span>
              ) : (
                      <span className="flex items-center justify-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload
                </span>
              )}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
              type="button"
                    onClick={saveAsDraft}
                    className="flex-1 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
                    <span className="flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save as Draft
                    </span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
              type="button"
                    onClick={() => setShowDraftModal(true)}
                    className="flex-1 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
                    <span className="flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
                      Load Draft
                    </span>
                  </motion.button>
          </div>
        </form>
        </div>

            {/* Preview Section */}
            {selectedFile && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-1/2 shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl p-8 overflow-y-auto max-h-[calc(100vh-12rem)]"
              >
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800">Document Preview</h2>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
                      <span>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  </div>

                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="relative w-full min-h-[500px] bg-white rounded-lg overflow-hidden border border-gray-200"
                  >
                    {selectedFile.type === 'application/pdf' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center relative">
                        <div className="flex-1 w-full flex items-center justify-center">
                          <Document
                            file={docUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading={
                              <div className="flex items-center justify-center h-full">
                                <motion.div 
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  className="rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"
                      />
                    </div>
                            }
                            error={
                              <div className="flex items-center justify-center h-full text-red-500">
                                Failed to load PDF. Please try again.
                              </div>
                            }
                          >
                            <Page
                              pageNumber={pageNumber}
                              width={Math.min(window.innerWidth * 0.4, 600)}
                              loading={
                                <div className="flex items-center justify-center h-full">
                                  <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"
                                  />
                    </div>
                              }
                            />
                          </Document>
                  </div>
                        {numPages > 1 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="w-full flex justify-center items-center gap-4 py-4 bg-white/80 backdrop-blur-sm mt-4 rounded-lg shadow-lg"
                  >
                            <motion.button
                              whileHover={{ scale: 1.05, backgroundColor: "#EBF5FF" }}
                              whileTap={{ scale: 0.95 }}
                              onClick={handlePreviousPage}
                              disabled={pageNumber <= 1}
                              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 ${
                                pageNumber <= 1
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100 active:bg-blue-200'
                              }`}
                      >
                              <ChevronLeft className="w-4 h-4" />
                              Previous
                            </motion.button>
                            <span className="text-sm text-gray-600 font-medium">
                              Page {pageNumber} of {numPages}
                      </span>
                            <motion.button
                              whileHover={{ scale: 1.05, backgroundColor: "#EBF5FF" }}
                              whileTap={{ scale: 0.95 }}
                              onClick={handleNextPage}
                              disabled={pageNumber >= numPages}
                              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 ${
                                pageNumber >= numPages
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100 active:bg-blue-200'
                              }`}
                      >
                              Next
                              <ChevronRight className="w-4 h-4" />
                            </motion.button>
                          </motion.div>
                        )}
                    </div>
              ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <p>Preview not available for this file type</p>
                </div>
              )}
                  </motion.div>
                </motion.div>
              </motion.div>
        )}
          </div>
      </div>
    </div>
    
      <AnimatePresence>
        {showVersionModal && (
    <VersionConfirmModal
      isOpen={showVersionModal}
      onClose={() => setShowVersionModal(false)}
      onConfirm={handleVersionConfirm}
      document={versionDocument}
      file={selectedFile}
      documentTypes={documentTypes}
    />
        )}
      </AnimatePresence>

      <AnimatePresence>
    {showFolderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          >
        <div className="bg-white rounded-lg p-6 w-[1000px] max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              {folderHistory.length > 0 && (
                <button
                  onClick={handleBackClick}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <h2 className="text-xl font-semibold text-gray-900">
                {currentFolder ? currentFolder.name : 'Select Folder'}
              </h2>
            </div>
            <button
              onClick={() => {
                setShowFolderModal(false);
                setCurrentFolder(null);
                setCurrentFolderPath('');
                setFolderHistory([]);
              }}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Current Path Display */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Current Path:</span>
              <span className="font-medium">{currentFolderPath || '/'}</span>
            </div>
          </div>

          {/* Folder Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {(() => {
              

                // Get the folders to display based on current folder path
                const foldersToDisplay = currentFolder 
                  ? folders.filter(folder => {
                      // For subfolders, check if they are direct children of current folder
                      const currentPath = currentFolder.folder_path;
                      const folderPath = folder.folder_path;
                      // Check if this is a direct child (only one level deeper)
                      const currentPathParts = currentPath.split('/');
                      const folderPathParts = folderPath.split('/');
                      return folderPath.startsWith(currentPath + '/') && 
                             folderPathParts.length === currentPathParts.length + 1;
                    })
                  : folders.filter(folder => {
                      // For root level, only show folders directly under Scoala Dabuleni
                      const pathParts = folder.folder_path.split('/');
                      return pathParts.length === 2; // Scoala Dabuleni/[folder]
                    });


                // Filter out non-folder items and the Draft folder
                const filteredFolders = foldersToDisplay.filter(item => 
                  item && item.folder_name.toLowerCase() !== 'draft'
                );


                return filteredFolders.map((folder) => (
                    <div
                    key={folder.folder_path || folder.folder_name}
                      onClick={() => handleFolderClick(folder)}
                      className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="text-sm">{folder.folder_name}</span>
                    </div>
                  ));
              })()}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowFolderModal(false);
                setCurrentFolder(null);
                setCurrentFolderPath('');
                setFolderHistory([]);
              }}
              className="px-5 py-2.5 text-gray-600 hover:text-gray-800 text-base"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (currentFolder) {
                  handleFolderSelect(currentFolder);
                }
              }}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-base"
            >
              Select Folder
            </button>
          </div>
        </div>
          </motion.div>
    )}
      </AnimatePresence>
    
      <AnimatePresence>
        {showStorageLimitModal && (
    <StorageLimitModal
      isOpen={showStorageLimitModal}
      onClose={() => setShowStorageLimitModal(false)}
      details={storageLimitDetails}
      onSendToAdmin={handleSendToAdmin}
    />
        )}
      </AnimatePresence>

      <AnimatePresence>
    {showDraftModal && (
      <DraftListModal
        isOpen={showDraftModal}
        onClose={() => setShowDraftModal(false)}
        drafts={draftList}
        onSelect={loadDraft}
        onDelete={deleteDraft}
      />
    )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Uploadpage;