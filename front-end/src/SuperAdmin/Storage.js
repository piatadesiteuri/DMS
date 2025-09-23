import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileOutlined, UserOutlined, DatabaseOutlined, CloudOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import { backend } from '../config';

const formatStorage = (sizeInMB) => {
  if (!sizeInMB || sizeInMB === 0) return '0 MB';
  
  const mb = parseFloat(sizeInMB);
  
  // Convert to TB if >= 1024 GB (1048576 MB)
  if (mb >= 1048576) {
    const tb = mb / 1048576;
    return `${tb % 1 === 0 ? tb.toFixed(0) : tb.toFixed(1)}TB`;
  }
  
  // Convert to GB if >= 1024 MB
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${gb % 1 === 0 ? gb.toFixed(0) : gb.toFixed(1)}GB`;
  }
  
  // Keep in MB if < 1024 MB
  return `${mb % 1 === 0 ? mb.toFixed(0) : mb.toFixed(1)}MB`;
};
const Storage = () => {
  const [storageData, setStorageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showStorageAlert, setShowStorageAlert] = useState(false);
  const itemsPerPage = 5;

  // Storage limit in MB (you can adjust this value)
  const STORAGE_LIMIT = 10000; // 10GB in MB

  const fetchStorageData = async () => {
    try {
      const response = await axios.get(`${backend}/post_docs/superadmin/storage-usage`, {
        withCredentials: true
      });
      if (response.data.success) {
        setStorageData(response.data.data);
        // Check if storage usage is above 80%
        if (response.data.data?.total?.total_size_mb > STORAGE_LIMIT * 0.8) {
          setShowStorageAlert(true);
        }
      }
    } catch (err) {
      console.error('Error fetching storage data:', err);
      setError(err.response?.data?.error || 'Error fetching storage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageData();
  }, []);

  // Calculate pagination
  const totalPages = Math.ceil((storageData?.byUser?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = storageData?.byUser?.slice(startIndex, endIndex) || [];

  // Calculate storage percentage
  const storagePercentage = ((storageData?.total?.total_size_mb || 0) / STORAGE_LIMIT) * 100;
  const formattedStorage = formatStorage(storageData?.total?.total_size_mb || 0);
  const formattedLimit = formatStorage(STORAGE_LIMIT);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-gray-800 mb-8"
      >
        Storage Usage Overview
      </motion.h1>

      <AnimatePresence>
        {showStorageAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-lg"
          >
            <div className="flex items-center">
              <ExclamationCircleOutlined className="text-yellow-400 text-xl mr-2" />
              <p className="text-yellow-700">
                Storage usage is above 80%. Consider cleaning up old files or increasing storage capacity.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl text-blue-500">
              <FileOutlined />
            </div>
            <div className="text-3xl font-bold text-gray-800">
              {storageData?.total?.total_documents}
            </div>
          </div>
          <div className="text-lg font-semibold text-gray-600">Total Documents</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl text-purple-500">
              <DatabaseOutlined />
            </div>
            <div className="text-3xl font-bold text-gray-800">
              {formatStorage(storageData?.total?.total_size_mb)}
            </div>
          </div>
          <div className="text-lg font-semibold text-gray-600">Total Storage Used</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl text-green-500">
              <UserOutlined />
            </div>
            <div className="text-3xl font-bold text-gray-800">
              {storageData?.byUser?.length}
            </div>
          </div>
          <div className="text-lg font-semibold text-gray-600">Total Users</div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl shadow-lg p-8 mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Storage Limit</h2>
          <div className="text-sm text-gray-500">
          {formattedStorage} / {formattedLimit}
          </div>
        </div>
        <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(storagePercentage, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`absolute h-full rounded-full ${
              storagePercentage > 80 ? 'bg-red-500' : 
              storagePercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
          />
        </div>
        <div className="mt-2 text-sm text-gray-500">
          {storagePercentage.toFixed(1)}% of storage used
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-xl shadow-lg p-8 mb-8"
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Storage Usage by Role</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documents</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Storage Used</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {storageData?.byRole?.map((role, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{role.roles}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.total_users}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.total_documents}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatStorage(role.total_size_mb)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-xl shadow-lg p-8"
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Storage Usage by User</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documents</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Storage Used</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentUsers.map((user, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.roles}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.total_documents}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatStorage(user.total_size_mb)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-500">
            Showing {startIndex + 1} to {Math.min(endIndex, storageData?.byUser?.length || 0)} of {storageData?.byUser?.length || 0} users
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-md ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-md ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Storage; 