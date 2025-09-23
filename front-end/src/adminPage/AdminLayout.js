import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  Search, 
  BarChart2, 
  Users, 
  Settings as SettingsIcon, 
  LogOut, 
  ChevronDown, 
  Upload, 
  Bell,
  UserPlus,
  FileInput
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Flex, Text, Button, useToast, Menu, MenuButton, MenuList, MenuItem, Avatar, Badge } from '@chakra-ui/react';
import { backend } from '../config';
import { useNotifications } from '../services/notificationService';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [active, setActive] = React.useState("Dashboard");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [selectedNotification, setSelectedNotification] = useState(null);

  const toast = useToast();

  // Fetch user data
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const loadUserData = () => {
      try {
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
          const parsedData = JSON.parse(storedUserData);
          setUserData(parsedData);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  function handleActive(link) {
    setActive(link);
  }

  async function logout() {
    try {
      const response = await fetch(`${backend}/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Origin': window.location.origin
        }
      });
      
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      
      // Clear all authentication data
      localStorage.clear();
      
      // Force a complete page reload and redirect to login
      window.location.href = `${backend}/login`;
      window.location.reload(true);
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        title: "Error",
        description: "Failed to logout",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  }

  const handleNotificationClick = async (notification) => {
    try {
      await markAsRead(notification.id_request);
      setSelectedNotification(notification);
      setShowNotificationsDropdown(false);
      
      // Navigate to notifications page
      navigate('/admin/notifications');
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Get display name and role for navbar
  const getDisplayName = () => {
    if (userData) {
      return `${userData.prenom || ''} ${userData.nom || ''}`.trim() || 'Admin';
    }
    return 'Admin';
  };

  const getDisplayEmail = () => {
    if (userData?.email) {
      return userData.email;
    }
    return 'admin@example.com';
  };

  const getDisplayRole = () => {
    const role = userData?.role || 'admin';
    switch (role.toLowerCase()) {
      case 'admin':
        return 'Administrator';
      case 'superadmin':
        return 'Super Administrator';
      default:
        return 'Administrator';
    }
  };

  // Get initials for avatar
  const getInitials = () => {
    if (userData && userData.prenom && userData.nom) {
      return `${userData.prenom.charAt(0)}${userData.nom.charAt(0)}`.toUpperCase();
    }
    return 'A';
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.user-dropdown')) {
        setShowUserDropdown(false);
      }
      if (!event.target.closest('.notifications-dropdown')) {
        setShowNotificationsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-50">
      {/* Modern Navbar - Clean and Elegant Design */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 shadow-lg z-[1000] backdrop-blur-md border-b border-blue-500/20"
      >
        <div className="flex items-center justify-between h-full px-6">
          {/* Left side - Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/30">
                <span className="text-white font-bold text-lg">D</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-white tracking-wide">
                  DocDiL
                </h1>
                <p className="text-xs text-blue-100 opacity-80">Admin Panel</p>
              </div>
            </div>
          </div>

          {/* Center - Navigation Links */}
          <div className="hidden lg:flex items-center space-x-6">
            {[
              { path: "/admin/dashboard", label: "DASHBOARD" },
              { path: "/admin/upload", label: "UPLOAD DOCUMENTS" },
              { path: "/admin/search", label: "SEARCH DOCUMENTS" },
              { path: "/admin/statistics", label: "STATISTICS" },
              { path: "/admin/users", label: "MANAGE USERS" },
              { path: "/admin/documents", label: "DOCUMENTS" }
            ].map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => 
                  `text-sm font-medium px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? "text-white bg-white/20 backdrop-blur-sm border border-white/30" 
                      : "text-blue-100 hover:text-white hover:bg-white/10"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* Right side - Modern User Profile and Notifications */}
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            <button className="lg:hidden p-2 text-blue-100 hover:text-white hover:bg-white/20 rounded-lg transition-colors duration-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Notifications */}
            <div className="relative notifications-dropdown">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className="relative p-2 text-blue-100 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200"
              >
                {unreadCount > 0 && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                )}
                <Bell className="w-5 h-5" />
              </motion.button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {showNotificationsDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 py-4 z-[1001]"
                  >
                    <div className="px-4 pb-3 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        <Badge colorScheme="blue" variant="solid">
                          {unreadCount} new
                        </Badge>
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No new notifications</p>
                        </div>
                      ) : (
                        <div className="px-2 py-2">
                          {notifications.slice(0, 5).map((notification) => (
                            <div
                              key={notification.id_request}
                              onClick={() => handleNotificationClick(notification)}
                              className="flex items-start gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <div className="flex-shrink-0 mt-1">
                                <div className={`w-2 h-2 rounded-full ${notification.status === 'pending' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900">
                                  {notification.type === 'storage_upgrade' ? 'Storage Upgrade Request' : 'Upload Request'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(notification.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                          {notifications.length > 5 && (
                            <div className="px-3 py-2 text-center">
                              <button
                                onClick={() => {
                                  setShowNotificationsDropdown(false);
                                  navigate('/admin/notifications');
                                }}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                              >
                                View all notifications ({notifications.length})
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Modern User Profile Card */}
            <div className="relative user-dropdown">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center space-x-3 p-2 hover:bg-white/20 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                {/* Avatar with initials */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                    {getInitials()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                </div>
                
                {/* User Info */}
                <div className="hidden md:block text-left min-w-0">
                  <p className="text-sm font-semibold text-white truncate max-w-32">
                    {getDisplayName()}
                  </p>
                  <p className="text-xs text-blue-100 opacity-80 truncate max-w-24">
                    {getDisplayRole()}
                  </p>
                </div>
                
                {/* Dropdown arrow */}
                <ChevronDown className={`w-4 h-4 text-blue-200 transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`} />
              </motion.button>

              {/* Modern Dropdown Menu */}
              <AnimatePresence>
                {showUserDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 py-4 z-[1001]"
                  >
                    {/* User Profile Header */}
                    <div className="px-4 pb-4 border-b border-gray-100">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {getInitials()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-base">
                            {getDisplayName()}
                          </h3>
                          <p className="text-sm text-gray-600 truncate">
                            {getDisplayEmail()}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                              {getDisplayRole()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="px-2 py-2">
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          logout();
                        }}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg transition-colors w-full text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Deconectare
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content - Full width without sidebar */}
      <motion.div
        className="flex-1 mt-16 min-h-screen overflow-y-auto relative"
        style={{ background: 'linear-gradient(135deg, #f8f9ff 0%, #f3f4f9 50%, #f9f7ff 100%)' }}
      >
        {/* Animated Background - Subtle and Elegant */}
        <div className="fixed inset-0 top-16 pointer-events-none z-0" style={{ background: 'linear-gradient(135deg, #f8f9ff 0%, #f3f4f9 50%, #f9f7ff 100%)' }}>
          {/* Subtle Wave Elements */}
          <div className="absolute top-10 left-1/4 opacity-8 animate-pulse" style={{animationDuration: '15s'}}>
            <svg width="60" height="30" viewBox="0 0 60 30">
              <path d="M0,15 Q15,5 30,15 T60,15 L60,30 L0,30 Z" fill="#dbeafe" opacity="0.3"/>
            </svg>
          </div>
          
          <div className="absolute top-[20vh] right-1/3 opacity-6 animate-pulse" style={{animationDuration: '18s', animationDelay: '3s'}}>
            <svg width="45" height="22" viewBox="0 0 45 22">
              <path d="M0,11 Q11,4 22,11 T45,11 L45,22 L0,22 Z" fill="#bfdbfe" opacity="0.25"/>
            </svg>
          </div>
          
          <div className="absolute top-[40vh] left-1/3 opacity-5 animate-pulse" style={{animationDuration: '20s', animationDelay: '1s'}}>
            <svg width="50" height="25" viewBox="0 0 50 25">
              <path d="M0,12.5 Q12.5,4 25,12.5 T50,12.5 L50,25 L0,25 Z" fill="#93c5fd" opacity="0.2"/>
            </svg>
          </div>
          
          <div className="absolute top-[60vh] right-1/4 opacity-4 animate-pulse" style={{animationDuration: '22s', animationDelay: '2s'}}>
            <svg width="35" height="18" viewBox="0 0 35 18">
              <path d="M0,9 Q8,2 17,9 T35,9 L35,18 L0,18 Z" fill="#6366f1" opacity="0.15"/>
            </svg>
          </div>
          
          <div className="absolute top-[80vh] left-1/2 opacity-3 animate-pulse" style={{animationDuration: '25s', animationDelay: '1s'}}>
            <svg width="40" height="20" viewBox="0 0 40 20">
              <path d="M0,10 Q10,3 20,10 T40,10 L40,20 L0,20 Z" fill="#dbeafe" opacity="0.1"/>
            </svg>
          </div>
          
          {/* Subtle Bokeh Effects */}
          <div className="absolute top-[25vh] left-1/4 w-20 h-20 bg-blue-300/8 rounded-full animate-ping" style={{animationDuration: '6s'}}></div>
          <div className="absolute top-[55vh] right-1/3 w-16 h-16 bg-indigo-300/8 rounded-full animate-ping" style={{animationDuration: '8s', animationDelay: '2s'}}></div>
          <div className="absolute top-[85vh] left-1/3 w-12 h-12 bg-blue-300/6 rounded-full animate-ping" style={{animationDuration: '10s', animationDelay: '1s'}}></div>
          
          {/* Subtle Radial Gradients */}
          <div className="absolute inset-0 opacity-25">
            <div className="absolute top-0 left-0 w-full h-full" style={{
              background: 'radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.02) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(99, 102, 241, 0.03) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(79, 70, 229, 0.015) 0%, transparent 50%)'
            }}></div>
          </div>
          
          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 opacity-15">
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(45deg, transparent 40%, rgba(59, 130, 246, 0.015) 50%, transparent 60%), linear-gradient(-45deg, transparent 40%, rgba(99, 102, 241, 0.015) 50%, transparent 60%)',
              backgroundSize: '100px 100px, 100px 100px'
            }}></div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative z-10 p-6 min-h-screen">
          <Outlet />
        </div>
      </motion.div>

      {/* Add custom scrollbar styles */}
      <style jsx>{`
        .modal-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.3);
        }
      `}</style>
    </div>
  );
};

export default AdminLayout; 