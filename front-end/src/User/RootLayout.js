import React, { useState, useEffect } from 'react';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, FileText, Search, BarChart2, Users, Settings as SettingsIcon, LogOut, ChevronLeft, ChevronRight, Download, FileInput, FileCheck2, UserPlus, UserCheck, Archive, User, Mail, Building, Crown, Shield, UserCheck as UserCheckIcon, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import SettingsPage from './Settings';
import Profile from './Profile';
import { FaUserSecret } from 'react-icons/fa';
import { Box, Flex, Text, Button, useToast } from '@chakra-ui/react';
import { backend } from '../config';


const RootLayout = ({ roles }) => {
  const location = useLocation();
  const [active, setActive] = React.useState("Home");
  const [userRole, setUserRole] = React.useState(roles || localStorage.getItem('userRole'));
  const [loggedRequests, setLoggedRequests] = React.useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState(null);

  const [userData, setUserData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const toast = useToast();

  // Fetch complete user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setProfileLoading(true);
        const response = await fetch(`${backend}/api/user/profile`, {
          credentials: 'include',
          headers: {
            'Origin': window.location.origin,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch profile data: ${response.status}`);
        }
        
        const data = await response.json();
        setProfileData(data);
        setUserData(data.userInfo);
        console.log('✅ Profile data loaded:', data);
      } catch (error) {
        console.error('❌ Error fetching profile data:', error);
        // Fallback to localStorage data
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
          const parsedData = JSON.parse(storedUserData);
          setUserData(parsedData);
        }
      } finally {
        setProfileLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // Legacy userData loading from localStorage
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

    if (!profileData) {
      loadUserData();
    }
  }, [profileData]);

  React.useEffect(() => {
    // Evităm log-uri repetate
    if (!loggedRequests) {
      console.log("RootLayout.js: useEffect running with roles:", roles);
      setLoggedRequests(true);
    }

    // Actualizează userRole doar dacă roles este diferit și valid
    if (roles && roles !== userRole) {
      console.log("RootLayout.js: Updating userRole from:", userRole, "to:", roles);
      setUserRole(roles);
    }

    if (!roles && !userRole) {
      // Obținem rolul de la server doar dacă nu avem deja unul
      if (!loggedRequests) {
        console.log("RootLayout.js: No roles provided, fetching from server");
      }
      
      fetch(`${backend}/admin`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Origin': window.location.origin
        }
      })
      .then(res => {
        if (!loggedRequests) {
          console.log("RootLayout.js: Admin response status:", res.status);
        }
        return res.json();
      })
      .then(result => {
        if (!loggedRequests) {
          console.log("RootLayout.js: Fetched role from server:", result);
        }
        // Ensure we store a string value
        setUserRole(typeof result === 'string' ? result : String(result));
      })
      .catch(err => {
        console.error("RootLayout.js: Error fetching role:", err);
      });
    } else if (roles && roles !== userRole) {
      // Actualizăm rolul doar dacă s-a schimbat
      if (!loggedRequests) {
        console.log("RootLayout.js: Setting userRole from props:", roles);
      }
      // Ensure we store a string value
      setUserRole(typeof roles === 'string' ? roles : String(roles));
    }
  }, [roles, userRole, loggedRequests]);

  useEffect(() => {
    const checkImpersonation = () => {
      const impersonating = localStorage.getItem('isImpersonating') === 'true';
      const user = JSON.parse(localStorage.getItem('impersonatedUser') || 'null');
      const originalUserRole = localStorage.getItem('originalUserRole');
      const impersonationSource = localStorage.getItem('impersonationSource');
      
      // Show banner only if impersonating and source was superadmin users page
      if (impersonating && impersonationSource === 'superadmin_users') {
        setIsImpersonating(true);
        setImpersonatedUser(user);
      } else {
        setIsImpersonating(false);
        setImpersonatedUser(null);
      }
    };

    checkImpersonation();
  }, []);

  // Helper function to safely check role
  const hasRole = (requiredRole) => {
    if (typeof userRole !== 'string') return false;
    return userRole.toLowerCase() === requiredRole;
  };

  // Helper function to check if user is admin or standard user
  const isUser = () => {
    if (typeof userRole !== 'string') return false;
    const role = userRole.toLowerCase();
    return role === "responsable" || role === "user";
  };
  
  // Helper function to check if user is responsible
  const isResponsible = () => {
    if (typeof userRole !== 'string') return false;
    return userRole.toLowerCase() === "responsable";
  };
  
  // Helper function to check if user is admin
  const isAdmin = () => {
    if (typeof userRole !== 'string') return false;
    return userRole.toLowerCase() === "admin";
  };

  // Get role icon (same as Profile page)
  const getRoleIcon = (role) => {
    switch (role?.toLowerCase()) {
      case 'superadmin':
        return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-600" />;
      case 'director':
        return <User className="w-4 h-4 text-purple-600" />;
      case 'responsable':
        return <UserCheckIcon className="w-4 h-4 text-green-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  // Get display name and role for navbar
  const getDisplayName = () => {
    if (profileData?.userInfo) {
      return `${profileData.userInfo.prenom || ''} ${profileData.userInfo.nom || ''}`.trim() || 'User';
    }
    if (userData) {
      return `${userData.prenom || ''} ${userData.nom || ''}`.trim() || 'User';
    }
    return 'User';
  };

  const getDisplayEmail = () => {
    if (profileData?.userInfo?.email) {
      return profileData.userInfo.email;
    }
    if (userData?.email) {
      return userData.email;
    }
    return 'user@example.com';
  };

  const getDisplayRole = () => {
    const role = profileData?.userInfo?.roles || userRole;
    if (role) {
      switch (role.toLowerCase()) {
        case 'superadmin':
          return 'Super Administrator';
        case 'admin':
          return 'Administrator';
        case 'responsable':
          return 'Responsabil';
        case 'user':
          return 'Utilizator';
        case 'director':
          return 'Director';
        default:
          return role.charAt(0).toUpperCase() + role.slice(1);
      }
    }
    return 'Utilizator';
  };

  // Get initials for avatar
  const getInitials = () => {
    const userInfo = profileData?.userInfo || userData;
    if (userInfo && userInfo.prenom && userInfo.nom) {
      return `${userInfo.prenom.charAt(0)}${userInfo.nom.charAt(0)}`.toUpperCase();
    }
    return 'U';
  };

  // Get institution name
  const getInstitutionName = () => {
    if (profileData?.userInfo?.institution_name) {
      return profileData.userInfo.institution_name;
    }
    return null;
  };

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.user-dropdown')) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleStopImpersonation = async () => {
    try {
      console.log("Starting stop impersonation process...");
      
      // Get all relevant data from localStorage
      const isImpersonating = localStorage.getItem('isImpersonating');
      const impersonatedUser = JSON.parse(localStorage.getItem('impersonatedUser') || '{}');
      const originalUserRole = localStorage.getItem('originalUserRole');
      const currentUserData = JSON.parse(localStorage.getItem('userData') || '{}');
      
      console.log("Preparing request data:", {
        isImpersonating,
        impersonatedUser,
        originalUserRole,
        currentUserData
      });

      // Verify we have the original role
      if (originalUserRole !== 'superadmin') {
        throw new Error('Invalid original role');
      }

      // Get current session data
      const sessionResponse = await fetch(`${backend}/admin`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Origin': window.location.origin,
          'Accept': 'application/json'
        }
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to get session data');
      }

      const sessionData = await sessionResponse.json();
      console.log("Current session data:", sessionData);

      // Prepare request body with all necessary information
      const requestBody = {
        isImpersonating,
        impersonatedUser,
        originalUserRole,
        currentUserData,
        sessionData,
        action: 'stop_impersonation'
      };

      console.log("Making request to stop-impersonation endpoint with data:", requestBody);
      
      const response = await fetch(`${backend}/stop-impersonation`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin,
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        // Try to parse the error message
        let errorMessage = 'Failed to stop impersonation';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error("Failed to parse error response:", e);
        }

        // If we get a 500 error, try to restore the session anyway
        if (response.status === 500) {
          console.log("Received 500 error, attempting to restore session...");
          
          // Clear only impersonation-related data from localStorage
          localStorage.removeItem('isImpersonating');
          localStorage.removeItem('impersonatedUser');
          localStorage.removeItem('impersonationSource');
          
          // Set superadmin session data
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('userRole', 'superadmin');
          localStorage.setItem('userData', JSON.stringify({
            id_user: sessionData.id_user || 20,
            nom: sessionData.nom || 'Admin',
            prenom: sessionData.prenom || 'Super',
            role: 'superadmin'
          }));

          setIsImpersonating(false);
          setImpersonatedUser(null);
          
          // Redirect to superadmin users page
          window.location.href = `${backend}/superadmin/users`;
          return;
        }

        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log("Response data:", responseData);

      // Clear only impersonation-related data from localStorage
      localStorage.removeItem('isImpersonating');
      localStorage.removeItem('impersonatedUser');
      localStorage.removeItem('impersonationSource');
      
      // Set superadmin session data
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userRole', 'superadmin');
      localStorage.setItem('userData', JSON.stringify({
        id_user: sessionData.id_user || 20,
        nom: sessionData.nom || 'Admin',
        prenom: sessionData.prenom || 'Super',
        role: 'superadmin'
      }));

      setIsImpersonating(false);
      setImpersonatedUser(null);
      
      // Redirect to superadmin users page
      window.location.href = `${backend}/superadmin/users`;
    } catch (error) {
      console.error("Error in handleStopImpersonation:", error);
      console.error("Error stack:", error.stack);
      toast({
        title: "Error",
        description: error.message || "Failed to stop impersonation",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };



  const theme = extendTheme({
    styles: {
      global: {
        body: {
          bg: 'white',
          color: 'gray.900',
        },
      },
    },
    colors: {
      brand: {
        50: '#f5f3ff',
        100: '#ede9fe',
        200: '#ddd6fe',
        300: '#c4b5fd',
        400: '#a78bfa',
        500: '#8b5cf6',
        600: '#7c3aed',
        700: '#6d28d9',
        800: '#5b21b6',
        900: '#4c1d95'
      }
    }
  });

  return (
    <ChakraProvider theme={theme}>
    <div className="flex h-screen relative overflow-hidden">
      {/* Elegant white background with discrete purple wave pattern */}
      <div className="pointer-events-none absolute inset-0 bg-white">
        {/* Subtle wave patterns inspired by the images */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Top-left discrete wave */}
          <div className="absolute -top-32 -left-32 w-96 h-96 opacity-[0.04]" style={{
            background: `
              radial-gradient(ellipse 200px 100px at center, transparent 30%, rgba(139,92,246,0.15) 40%, transparent 70%),
              conic-gradient(from 45deg at 30% 70%, transparent, rgba(168,85,247,0.08), transparent)
            `
          }} />
          
          {/* Bottom-right discrete wave */}
          <div className="absolute -bottom-24 -right-24 w-80 h-80 opacity-[0.035]" style={{
            background: `
              radial-gradient(ellipse 180px 90px at center, transparent 25%, rgba(168,85,247,0.12) 45%, transparent 75%),
              conic-gradient(from 225deg at 70% 30%, transparent, rgba(139,92,246,0.06), transparent)
            `
          }} />
          
          {/* Center subtle flow lines */}
          <div className="absolute top-1/2 left-1/4 w-96 h-2 opacity-[0.02] transform -translate-y-1/2 rotate-12" style={{
            background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.2), transparent)'
          }} />
          
          <div className="absolute top-1/3 right-1/4 w-80 h-1 opacity-[0.015] transform rotate-[-8deg]" style={{
            background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.15), transparent)'
          }} />
        </div>
        
        {/* Discrete geometric dots pattern */}
        <div className="absolute inset-0 opacity-[0.008]" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(139,92,246,0.6) 1px, transparent 1px),
            radial-gradient(circle at 80% 70%, rgba(168,85,247,0.4) 0.8px, transparent 0.8px),
            radial-gradient(circle at 60% 20%, rgba(139,92,246,0.3) 0.6px, transparent 0.6px),
            radial-gradient(circle at 30% 80%, rgba(168,85,247,0.5) 0.7px, transparent 0.7px)
          `,
          backgroundSize: '120px 120px, 150px 150px, 100px 100px, 130px 130px',
          backgroundPosition: '0 0, 60px 75px, 30px 50px, 90px 40px'
        }} />
      </div>
      {/* Modern Navbar - Clean and Elegant Design */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 shadow-lg z-[1000] backdrop-blur-md border-b border-purple-500/20"
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
                <p className="text-xs text-purple-100 opacity-80">Document Management</p>
              </div>
            </div>
          </div>

          {/* Center - Navigation Links */}
          <div className="hidden lg:flex items-center space-x-6">
            {[
              { path: "/", label: "PAGINĂ DE START" },
              { path: "Mydocuments", label: "DOCUMENTELE MELE" },
              { path: "Search", label: "CĂUTARE" },
              { path: "download", label: "ARHIVE" },
              { path: "diffuse", label: "GESTIONARE FOLDERE" },
              { path: "statistics", label: "STATISTICI" }
            ].map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => 
                  `text-sm font-medium px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? "text-white bg-white/20 backdrop-blur-sm border border-white/30" 
                      : "text-purple-100 hover:text-white hover:bg-white/10"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* Right side - Modern User Profile */}
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            <button className="lg:hidden p-2 text-purple-100 hover:text-white hover:bg-white/20 rounded-lg transition-colors duration-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {/* Notifications */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2 text-purple-100 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200"
            >
              <div className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </motion.button>

            {/* Impersonation Indicator - Now handled globally by ImpersonationBanner */}

            {/* Modern User Profile Card */}
            <div className="relative user-dropdown">
              <motion.button
              whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center space-x-3 p-2 hover:bg-white/20 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                {profileLoading ? (
                  // Loading skeleton
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
                    <div className="hidden md:block">
                      <div className="h-4 bg-gray-200 rounded w-24 mb-1 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </div>
                  </div>
                ) : (
                  <>
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
                      <div className="flex items-center gap-1">
                        {getRoleIcon(profileData?.userInfo?.roles || userRole)}
                        <p className="text-xs text-purple-100 opacity-80 truncate max-w-24">
                          {getDisplayRole()}
                        </p>
                </div>
                </div>
                    
                    {/* Dropdown arrow */}
                    <ChevronDown className={`w-4 h-4 text-purple-200 transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`} />
                  </>
                )}
              </motion.button>

              {/* Modern Dropdown Menu */}
              <AnimatePresence>
                {showUserDropdown && !profileLoading && (
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
                          <div className="flex items-center gap-2 mt-1 mb-2">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <p className="text-sm text-gray-600 truncate">
                              {getDisplayEmail()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(profileData?.userInfo?.roles || userRole)}
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                              {getDisplayRole()}
                            </span>
                          </div>
                          {getInstitutionName() && (
                            <div className="flex items-center gap-2 mt-2">
                              <Building className="w-3 h-3 text-gray-400" />
                              <p className="text-xs text-gray-500 truncate">
                                {getInstitutionName()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    {profileData?.statistics && (
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-2 bg-blue-100 rounded-lg">
                            <p className="text-xs text-blue-600">Documente</p>
                            <p className="font-semibold text-blue-700">{profileData.statistics.totalDocuments}</p>
                          </div>
                          <div className="text-center p-2 bg-gray-100 rounded-lg">
                            <p className="text-xs text-gray-600">Spațiu</p>
                            <p className="font-semibold text-gray-700">
                              {(profileData.statistics.totalStorage / (1024 * 1024)).toFixed(1)} MB
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Menu Items */}
                    <div className="px-2 py-2">
                      <NavLink
                        to="/dashboard/profile"
                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        onClick={() => setShowUserDropdown(false)}
                      >
                        <User className="w-4 h-4" />
                        Profilul meu
                      </NavLink>
                      <NavLink
                        to="/dashboard/settings"
                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        onClick={() => setShowUserDropdown(false)}
                      >
                        <SettingsIcon className="w-4 h-4" />
                        Setări
                      </NavLink>
                      <div className="border-t border-gray-100 my-2"></div>
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
      >
        {/* Animated Background - Subtle and Elegant */}
        <div className="fixed inset-0 top-16 pointer-events-none z-0">
          {/* Subtle Wave Elements */}
          <div className="absolute top-10 left-1/4 opacity-8 animate-pulse" style={{animationDuration: '15s'}}>
            <svg width="60" height="30" viewBox="0 0 60 30">
              <path d="M0,15 Q15,5 30,15 T60,15 L60,30 L0,30 Z" fill="#e9d5ff" opacity="0.3"/>
            </svg>
          </div>
          
          <div className="absolute top-[20vh] right-1/3 opacity-6 animate-pulse" style={{animationDuration: '18s', animationDelay: '3s'}}>
            <svg width="45" height="22" viewBox="0 0 45 22">
              <path d="M0,11 Q11,4 22,11 T45,11 L45,22 L0,22 Z" fill="#d8b4fe" opacity="0.25"/>
            </svg>
          </div>
          
          <div className="absolute top-[40vh] left-1/3 opacity-5 animate-pulse" style={{animationDuration: '20s', animationDelay: '1s'}}>
            <svg width="50" height="25" viewBox="0 0 50 25">
              <path d="M0,12.5 Q12.5,4 25,12.5 T50,12.5 L50,25 L0,25 Z" fill="#c084fc" opacity="0.2"/>
            </svg>
          </div>
          
          <div className="absolute top-[60vh] right-1/4 opacity-4 animate-pulse" style={{animationDuration: '22s', animationDelay: '2s'}}>
            <svg width="35" height="18" viewBox="0 0 35 18">
              <path d="M0,9 Q8,2 17,9 T35,9 L35,18 L0,18 Z" fill="#a855f7" opacity="0.15"/>
            </svg>
          </div>
          
          <div className="absolute top-[80vh] left-1/2 opacity-3 animate-pulse" style={{animationDuration: '25s', animationDelay: '1s'}}>
            <svg width="40" height="20" viewBox="0 0 40 20">
              <path d="M0,10 Q10,3 20,10 T40,10 L40,20 L0,20 Z" fill="#e9d5ff" opacity="0.1"/>
            </svg>
          </div>
          
          {/* Subtle Bokeh Effects */}
          <div className="absolute top-[25vh] left-1/4 w-20 h-20 bg-purple-300/8 rounded-full animate-ping" style={{animationDuration: '6s'}}></div>
          <div className="absolute top-[55vh] right-1/3 w-16 h-16 bg-indigo-300/8 rounded-full animate-ping" style={{animationDuration: '8s', animationDelay: '2s'}}></div>
          <div className="absolute top-[85vh] left-1/3 w-12 h-12 bg-purple-300/6 rounded-full animate-ping" style={{animationDuration: '10s', animationDelay: '1s'}}></div>
          
          {/* Subtle Radial Gradients */}
          <div className="absolute inset-0 opacity-25">
            <div className="absolute top-0 left-0 w-full h-full" style={{
              background: 'radial-gradient(circle at 25% 25%, rgba(139, 92, 246, 0.02) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.03) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(147, 51, 234, 0.015) 0%, transparent 50%)'
            }}></div>
          </div>
          
          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 opacity-15">
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(45deg, transparent 40%, rgba(139, 92, 246, 0.015) 50%, transparent 60%), linear-gradient(-45deg, transparent 40%, rgba(168, 85, 247, 0.015) 50%, transparent 60%)',
              backgroundSize: '100px 100px, 100px 100px'
            }}></div>
          </div>
        </div>

        {/* Impersonation Banner - Removed, now handled by ImpersonationIndicator */}

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
    </ChakraProvider>
  );
};

export default RootLayout;