import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

const ArchivedDocuments = () => {
    const [archivedDocs, setArchivedDocs] = useState({ allDocuments: [], userDocuments: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // 'all' or 'user'
    const navigate = useNavigate();

    useEffect(() => {
        fetchArchivedDocuments();
    }, []);

    const fetchArchivedDocuments = async () => {
        try {
            console.log("Fetching archived documents...");
            const response = await axios.get('http://localhost:3000/api/archived-documents');
            console.log('Archived documents fetched successfully:', response.data);
            
            // Set the documents directly from the response
            if (response.data && response.data.allDocuments && response.data.userDocuments) {
                setArchivedDocs({
                    allDocuments: response.data.allDocuments,
                    userDocuments: response.data.userDocuments
                });
            } else {
                console.error('Invalid response format:', response.data);
                toast.error('Invalid response format from server');
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching archived documents:', error);
            toast.error('Failed to load archived documents');
            setLoading(false);
        }
    };

    const handleRestore = async (documentId, versionId) => {
        try {
            await axios.post(`http://localhost:3000/api/restore-version/${documentId}/${versionId}`);
            toast.success('Document restored successfully');
            fetchArchivedDocuments(); // Refresh the list
        } catch (error) {
            console.error('Error restoring document:', error);
            toast.error('Failed to restore document');
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const currentDocuments = activeTab === 'all' ? archivedDocs.allDocuments : archivedDocs.userDocuments;

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Archived Documents</h1>
            
            {/* Tabs */}
            <div className="flex space-x-4 mb-6">
                <button
                    className={`px-4 py-2 rounded-lg ${
                        activeTab === 'all'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700'
                    }`}
                    onClick={() => setActiveTab('all')}
                >
                    All Archived Documents ({archivedDocs.allDocuments.length})
                </button>
                <button
                    className={`px-4 py-2 rounded-lg ${
                        activeTab === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700'
                    }`}
                    onClick={() => setActiveTab('user')}
                >
                    My Archived Documents ({archivedDocs.userDocuments.length})
                </button>
            </div>

            {/* Documents List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentDocuments.map((doc) => (
                    <div key={doc.id_version} className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold mb-2">{doc.nom_document_original}</h3>
                        <p className="text-gray-600 mb-2">Version: {doc.version_number}</p>
                        <p className="text-gray-600 mb-2">Type: {doc.type}</p>
                        <p className="text-gray-600 mb-2">
                            Created by: {doc.created_by_firstname} {doc.created_by_lastname}
                        </p>
                        <p className="text-gray-600 mb-2">
                            Archived by: {doc.archived_by_firstname} {doc.archived_by_lastname}
                        </p>
                        <p className="text-gray-600 mb-2">
                            Archived on: {formatDate(doc.archived_at)}
                        </p>
                        <p className="text-gray-600 mb-4">{doc.change_summary}</p>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => handleRestore(doc.id_document, doc.id_version)}
                                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                            >
                                Restore
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {currentDocuments.length === 0 && (
                <div className="text-center text-gray-500 mt-8">
                    No archived documents found in this category.
                </div>
            )}
        </div>
    );
};

export default ArchivedDocuments; 