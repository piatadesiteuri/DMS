import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaRocket, FaFolderPlus, FaTimes, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';

const ModernToast = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 300, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.9 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 25 
            }}
            className={`
              relative max-w-sm w-full bg-white rounded-xl shadow-2xl border overflow-hidden
              ${toast.type === 'success' ? 'border-green-200' : 
                toast.type === 'error' ? 'border-red-200' : 
                toast.type === 'warning' ? 'border-yellow-200' : 'border-blue-200'}
            `}
          >
            {/* Colored top border */}
            <div className={`
              h-1 w-full
              ${toast.type === 'success' ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 
                toast.type === 'error' ? 'bg-gradient-to-r from-red-400 to-pink-500' : 
                toast.type === 'warning' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'}
            `} />
            
            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`
                  flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                  ${toast.type === 'success' ? 'bg-green-100 text-green-600' : 
                    toast.type === 'error' ? 'bg-red-100 text-red-600' : 
                    toast.type === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}
                `}>
                  {toast.type === 'success' && <FaCheckCircle className="w-4 h-4" />}
                  {toast.type === 'error' && <FaExclamationTriangle className="w-4 h-4" />}
                  {toast.type === 'warning' && <FaExclamationTriangle className="w-4 h-4" />}
                  {toast.type === 'info' && <FaInfoCircle className="w-4 h-4" />}
                  {toast.type === 'folder_create' && <FaFolderPlus className="w-4 h-4" />}
                  {toast.type === 'rocket' && <FaRocket className="w-4 h-4" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {toast.title}
                    </h4>
                    <button
                      onClick={() => removeToast(toast.id)}
                      className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <FaTimes className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    {toast.message}
                  </p>
                  
                  {/* Details for folder creation */}
                  {toast.folderInfo && (
                    <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                      <div className="flex items-center gap-1">
                        <FaFolderPlus className="w-3 h-3" />
                        <span className="font-medium">Folder:</span> {toast.folderInfo.name}
                      </div>
                      <div className="mt-1">
                        <span className="font-medium">Documents:</span> {toast.folderInfo.documentCount || 0}
                      </div>
                      <div className="mt-1">
                        <span className="font-medium">Path:</span> {toast.folderInfo.path}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Progress bar for auto-dismiss */}
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: toast.duration / 1000, ease: "linear" }}
              className={`
                h-0.5
                ${toast.type === 'success' ? 'bg-green-400' : 
                  toast.type === 'error' ? 'bg-red-400' : 
                  toast.type === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'}
              `}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ModernToast; 