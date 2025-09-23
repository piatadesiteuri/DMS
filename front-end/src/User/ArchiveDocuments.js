import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Document, Page } from 'react-pdf';
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { backend } from '../config';

pdfjs.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/build/pdf.worker.min.js');

// Define API URL
const API_URL = backend;

const ArchiveDocuments = () => {
  const [archivedDocs, setArchivedDocs] = useState({ userDocs: [], otherDocs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [expandedDocs, setExpandedDocs] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [activeTab, setActiveTab] = useState('my-docs'); // 'my-docs' or 'all-docs'

  useEffect(() => {
    fetchArchivedDocuments();
  }, []);

  const fetchArchivedDocuments = async () => {
    try {
      console.log("Fetching archived documents...");
      const response = await axios.get(`${backend}/api/archive`, {
        withCredentials: true
      });
      
      if (response.data) {
        console.log("Archived documents fetched successfully:", response.data);
        
        // Get user's documents and other documents directly from the response
        const userDocuments = Array.isArray(response.data.userDocuments) ? response.data.userDocuments : [];
        const allDocuments = Array.isArray(response.data.allDocuments) ? response.data.allDocuments : [];
        
        // Group user's documents by original document name
        const groupedUserDocs = userDocuments.reduce((acc, doc) => {
          const key = doc.nom_document_original;
          if (!acc[key]) {
            acc[key] = {
              originalName: key,
              type: doc.type,
              versions: []
            };
          }
          acc[key].versions.push(doc);
          return acc;
        }, {});

        // Group all documents by original document name
        const groupedAllDocs = allDocuments.reduce((acc, doc) => {
          const key = doc.nom_document_original;
          if (!acc[key]) {
            acc[key] = {
              originalName: key,
              type: doc.type,
              versions: []
            };
          }
          acc[key].versions.push(doc);
          return acc;
        }, {});

        // Convert to arrays and sort versions by version number
        const userDocs = Object.values(groupedUserDocs).map(doc => ({
          ...doc,
          versions: doc.versions.sort((a, b) => b.version_number - a.version_number)
        }));

        const otherDocs = Object.values(groupedAllDocs)
          .filter(doc => !userDocs.some(userDoc => userDoc.originalName === doc.originalName))
          .map(doc => ({
            ...doc,
            versions: doc.versions.sort((a, b) => b.version_number - a.version_number)
          }));

        console.log("Processed documents:", { userDocs, otherDocs });
        setArchivedDocs({ userDocs, otherDocs });
      }
    } catch (error) {
      console.error("Error fetching archived documents:", error);
      setError("Failed to fetch archived documents");
      setArchivedDocs({ userDocs: [], otherDocs: [] });
    } finally {
      setLoading(false);
    }
  };

  const toggleDocument = (docName) => {
    setExpandedDocs(prev => ({
      ...prev,
      [docName]: !prev[docName]
    }));
  };

  const handleView = async (archivePath, filename) => {
    try {
        console.log('Viewing archived document:', { archivePath, filename });
        
        // Extract directory name from the path
        const pathParts = archivePath.split('/');
        const directoryName = pathParts[pathParts.length - 1] || '';
        
        // Try different paths to access the document
        const pathsToTry = [
            `${backend}/direct-pdf/${directoryName}/${filename}`,
            `${backend}/pdfs/uploads/${directoryName}/${filename}`,
            `${backend}/find-pdf/${filename}`,
            `${backend}/download/${filename}`
        ];

        for (const path of pathsToTry) {
            try {
                const response = await fetch(path, {
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/pdf',
                        'Origin': window.location.origin
                    }
                });

                if (!response.ok) {
                    console.log(`Failed to fetch from ${path}:`, response.status);
                    continue;
                }

                const blob = await response.blob();
                if (blob.type === 'application/pdf') {
                    console.log("Successfully fetched PDF from:", path);
                    const url = window.URL.createObjectURL(blob);
                    setPdfUrl(url);
                    setPageNumber(1);
                    setShowModal(true);
                    return;
                }
            } catch (error) {
                console.log(`Error fetching from ${path}:`, error);
            }
        }

        throw new Error('Failed to fetch PDF from any available path');
    } catch (error) {
        console.error('Error viewing archived document:', error);
        showToast('Error viewing document. Please try again.', 'error');
    }
  };

  const handleDownload = async (archivePath, filename) => {
    try {
        console.log('Downloading archived document:', { archivePath, filename });
        
        // Extract directory name from the path
        const pathParts = archivePath.split('/');
        const directoryName = pathParts[pathParts.length - 1] || '';
        
        // Try different paths to access the document
        const pathsToTry = [
            `${backend}/direct-pdf/${directoryName}/${filename}`,
            `${backend}/pdfs/uploads/${directoryName}/${filename}`,
            `${backend}/find-pdf/${filename}`,
            `${backend}/download/${filename}`
        ];

        for (const path of pathsToTry) {
            try {
                const response = await fetch(path, {
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/pdf',
                        'Origin': window.location.origin
                    }
                });

                if (!response.ok) {
                    console.log(`Failed to fetch from ${path}:`, response.status);
                    continue;
                }

                const blob = await response.blob();
                if (blob.type === 'application/pdf') {
                    console.log("Successfully fetched PDF from:", path);
                    const url = window.URL.createObjectURL(blob);
                    
                    // Create download link
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    
                    // Clean up
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    return;
                }
            } catch (error) {
                console.log(`Error fetching from ${path}:`, error);
            }
        }

        throw new Error('Failed to fetch PDF from any available path');
    } catch (error) {
        console.error('Error downloading archived document:', error);
        showToast('Error downloading document. Please try again.', 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 3000);
  };

  const handleRestore = async (docId, versionId, versionNumber) => {
    setVersionToRestore({ docId, versionId, versionNumber });
    setShowConfirmModal(true);
  };

  const confirmRestore = async () => {
    try {
        const response = await axios.post(
            `${API_URL}/api/archive/restore/${versionToRestore.docId}/${versionToRestore.versionId}`,
            {},
            {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.success) {
            showToast(`Successfully restored to version ${versionToRestore.versionNumber}`);
            // Refresh the archived documents list
            await fetchArchivedDocuments();
            // Close the confirmation modal
            setShowConfirmModal(false);
            setVersionToRestore(null);
        } else {
            throw new Error(response.data.error || 'Failed to restore version');
        }
    } catch (error) {
        console.error("Error restoring version:", error);
        showToast(
            error.response?.data?.error || 
            error.response?.data?.details || 
            "Failed to restore version", 
            "error"
        );
    }
  };

  const closeModal = () => {
    setShowModal(false);
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const onPageChange = (newPageNumber) => {
    setPageNumber(newPageNumber);
  };

  const renderDocumentList = (documents) => {
    if (!Array.isArray(documents) || documents.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="text-gray-500 text-lg">No documents found</div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {documents.map((doc) => (
          <div key={doc.originalName} className="border rounded-lg overflow-hidden">
            <div 
              className="p-4 bg-white cursor-pointer hover:bg-gray-50 flex justify-between items-center"
              onClick={() => toggleDocument(doc.originalName)}
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{doc.originalName}</h3>
                <p className="text-sm text-gray-500">Type: {doc.type}</p>
                <p className="text-sm text-gray-500">Versions: {doc.versions.length}</p>
              </div>
              <div className="flex items-center">
                <span className="text-gray-400 mr-2">
                  {expandedDocs[doc.originalName] ? 'Hide Versions' : 'Show Versions'}
                </span>
                <svg 
                  className={`w-5 h-5 transform transition-transform ${expandedDocs[doc.originalName] ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            {expandedDocs[doc.originalName] && (
              <div className="border-t bg-gray-50">
                <div className="p-4 space-y-4">
                  {doc.versions.map((version) => (
                    <div key={version.id_version} className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">Version {version.version_number}</p>
                          <p className="text-sm text-gray-500">
                            Created by {version.created_by_firstname} {version.created_by_lastname}
                          </p>
                          <p className="text-sm text-gray-500">
                            Created: {new Date(version.created_at).toLocaleString()}
                          </p>
                          {version.change_summary && (
                            <p className="text-sm text-gray-600 mt-1">
                              Changes: {version.change_summary}
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleView(version.archive_path, version.archive_filename)}
                            className="inline-flex items-center px-3 py-1 border border-green-600 text-green-600 rounded-md hover:bg-green-50 transition-colors"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </button>
                          <button
                            onClick={() => handleDownload(version.archive_path, version.archive_filename)}
                            className="inline-flex items-center px-3 py-1 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </button>
                          {activeTab === 'my-docs' && (
                            <button
                              onClick={() => handleRestore(version.id_document, version.id_version, version.version_number)}
                              className="inline-flex items-center px-3 py-1 border border-yellow-600 text-yellow-600 rounded-md hover:bg-yellow-50 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Restore
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {toast.show && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white transition-opacity duration-300`}>
          {toast.message}
        </div>
      )}
      
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Archived Documents</h1>
            <div className="text-sm text-gray-500">
              Total Documents: {archivedDocs.userDocs.length + archivedDocs.otherDocs.length}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('my-docs')}
                className={`${
                  activeTab === 'my-docs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                My Documents ({archivedDocs.userDocs.length})
              </button>
              <button
                onClick={() => setActiveTab('all-docs')}
                className={`${
                  activeTab === 'all-docs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                All Documents ({archivedDocs.otherDocs.length})
              </button>
            </nav>
          </div>
          
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg w-[95vw] h-[95vh] flex flex-col shadow-2xl">
                <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                  <h2 className="text-xl font-bold text-gray-800">Document Preview</h2>
                  <button
                    onClick={closeModal}
                    className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 w-full h-full overflow-hidden flex items-center justify-center">
                  {pdfUrl && (
                    <div className="flex flex-col items-center justify-center h-full w-full">
                      <div className="flex-1 w-full flex items-center justify-center overflow-auto">
                        <Document
                          file={pdfUrl}
                          onLoadSuccess={onDocumentLoadSuccess}
                          onLoadError={(error) => {
                            console.error("Error loading PDF:", error);
                            setError("Failed to load PDF document. It may be corrupted or unavailable.");
                          }}
                          className="w-full h-full flex items-center justify-center"
                          loading={
                            <div className="flex justify-center items-center h-64">
                              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                          }
                        >
                          <Page
                            pageNumber={pageNumber}
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                            width={Math.min(window.innerWidth * 0.7, 1000)}
                          />
                        </Document>
                      </div>
                      {numPages && (
                        <div className="mt-4 flex items-center space-x-4 bg-white p-2 rounded-lg shadow-sm">
                          <button
                            onClick={() => onPageChange(Math.max(1, pageNumber - 1))}
                            disabled={pageNumber <= 1}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Previous
                          </button>
                          <span className="px-4 text-gray-700">
                            Page {pageNumber} of {numPages}
                          </span>
                          <button
                            onClick={() => onPageChange(Math.min(numPages, pageNumber + 1))}
                            disabled={pageNumber >= numPages}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'my-docs' ? renderDocumentList(archivedDocs.userDocs) : renderDocumentList(archivedDocs.otherDocs)}
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Confirm Restore</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to restore this document to version {versionToRestore.versionNumber}?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestore}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchiveDocuments; 