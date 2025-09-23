import Uploadpage from './User/Uploadpage';
import HomePage from './User/HomePage';

import RootLayout from './User/RootLayout';
import ArchiveDocuments from './User/ArchiveDocuments';

import RegisterPage from './login_register/register';
import SignupPage from './login_register/signupPage';
import { RouterProvider, createBrowserRouter, Route,createRoutesFromElements, Navigate, Outlet, Routes } from 'react-router-dom';
import LoginPage from './login_register';
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PricingPage from './pages/PricingPage';

import SearchPage from './User/SearchPage';
import { useState, useEffect } from 'react';
import AdminPage from './adminPage/adminPage';
import AdminLayout from './adminPage/AdminLayout';
import VerifyDoc from './User/VerifyDoc';
import DiffusePage from './User/Diffuse';
import AcceptedUsrTbl from './adminPage/accesptedUsrTbl';
import BasicTable from './adminPage/unverifiedUsrTbl';
import Statistics from './User/Statistics';
import UserPage from './userPage/userPage';
import CreateUser from './adminPage/createUser';
import ManageUsers from './adminPage/manageUsers';
import { api } from './utils/api';
import Documents from './adminPage/Documents';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { NotificationProvider } from './services/notificationService';
import NotificationsPage from './adminPage/NotificationsPage';
import ImpersonationBanner from './components/ImpersonationBanner';
import useImpersonation from './hooks/useImpersonation';
import AdminStatistics from './adminPage/Statistics';
import SuperAdminRootLayout from './SuperAdmin/RootLayout';
import SuperAdminUserLogs from './SuperAdmin/UserLogs';
import SuperAdminStorageInfo from './SuperAdmin/StorageInfo';
import SuperAdminDashboard from './SuperAdmin/Dashboard';
import SuperAdminUsers from './SuperAdmin/Users';
import SuperAdminDocuments from './SuperAdmin/Documents';
import SuperAdminStatistics from './SuperAdmin/Statistics';
import SuperAdminNotifications from './SuperAdmin/Notifications';
import SuperAdminStorage from './SuperAdmin/Storage';
import SuperAdminPlans from './SuperAdmin/Plans';
import SettingsPage from './User/Settings';
import Profile from './User/Profile';
import DirectorRootLayout from './Director/RootLayout';
import DirectorDashboard from './Director/Dashboard';
import DirectorUsers from './Director/Users';
import InstitutionDetails from './Director/InstitutionDetails';
import DirectorPlans from './Director/Plans';
import Folders from './Director/Folders';
import config from './config';

const theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const { isImpersonating, currentUser, originalUser } = useImpersonation();



  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔍 App.js - Checking authentication...');
        
        // Always check session-check first, regardless of localStorage
          const response = await fetch(`${config.apiUrl}/session-check`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              "Origin": config.frontendUrl
            }
          });
          
          const sessionData = await response.json();
        console.log('🔍 App.js - Session check response:', sessionData);
          
          if (sessionData.valid) {
          console.log('✅ App.js - Valid session found');
            setIsAuthenticated(true);
          
          // For impersonation, use the current session role, not localStorage
          if (sessionData.isImpersonating) {
            console.log('🎭 App.js - Impersonation detected, using session role:', sessionData.role);
            setUserRole(sessionData.role);
            // Set localStorage to maintain authentication state
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('userRole', sessionData.role);
          } else {
            // Normal authentication - use stored role or session role
            const storedRole = localStorage.getItem('userRole');
            const finalRole = storedRole || sessionData.role;
            console.log('👤 App.js - Normal auth, using role:', finalRole);
            setUserRole(finalRole);
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('userRole', finalRole);
          }
        } else {
          console.log('❌ App.js - Invalid session, clearing auth');
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('userRole');
          setIsAuthenticated(false);
          setUserRole(null);
        }
      } catch (error) {
        console.error('❌ App.js - Auth check failed:', error);
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userRole');
        setIsAuthenticated(false);
        setUserRole(null);
      } finally {
        setIsLoading(false);
        console.log('🔍 App.js - Auth check complete:', {
          isAuthenticated,
          userRole
        });
      }
    };

    checkAuth();
  }, []);

  const handleLog = (isLogged) => {
    setIsAuthenticated(isLogged);
    localStorage.setItem("isAuthenticated", isLogged);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const ProtectedRoutes = ({ isAuthenticated }) => {
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
  };

  const Protectedlog = ({ Authenticated }) => {
    return !Authenticated ? <Outlet /> : <Navigate to="/" replace />;
  };
  
  const getRoleForProtection = () => {
    return userRole;
  };
  
  const Protectedadmin = ({ AuthenticatedasAdmin }) => {
    if (userRole === null) {
      return <Navigate to="/login" replace />;
    }
    return userRole === "admin" ? <Outlet /> : <Navigate to="/" replace />;
  };
  
  const ProtectedResponsable = ({ AuthenticatedasRes }) => {
    if (userRole === null) {
      return <Navigate to="/login" replace />;
    }
    return userRole === "responsable" ? <Outlet /> : <Navigate to="/" replace />;
  };
  
  const ProtectedUser = ({ AuthenticatedasUsr }) => {
    const currentRole = userRole;
    if (currentRole === null) {
      return <Navigate to="/login" replace />;
    }
    return (currentRole === "user" || currentRole === "responsable") ? <Outlet /> : <Navigate to="/" replace />;
  };

  const ProtectedSuperAdmin = ({ AuthenticatedasSuperAdmin }) => {
    if (userRole === null) {
      return <Navigate to="/login" replace />;
    }
    return userRole === "superadmin" ? <Outlet /> : <Navigate to="/" replace />;
  };

  const ProtectedDirector = ({ AuthenticatedasDirector }) => {
    if (userRole === null) {
      return <Navigate to="/login" replace />;
    }
    return userRole === "director" ? <Outlet /> : <Navigate to="/" replace />;
  };

  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        {/* Public Routes */}
        <Route path="/" element={
          isAuthenticated 
            ? userRole === "superadmin" 
              ? <Navigate to="/superadmin" replace /> 
              : userRole === "admin" 
                ? <Navigate to="/admin/dashboard" replace /> 
                : userRole === "director"
                  ? <Navigate to="/director/dashboard" replace />
                : userRole === "responsable"
                  ? <Navigate to="/dashboard" replace />
                : <Navigate to="/dashboard" replace />
            : <LandingPage />
        } />
        <Route path="/about" element={
          isAuthenticated 
            ? userRole === "superadmin" 
              ? <Navigate to="/superadmin" replace /> 
              : userRole === "admin" 
                ? <Navigate to="/admin/dashboard" replace /> 
                : userRole === "director"
                  ? <Navigate to="/director/dashboard" replace />
                : userRole === "responsable"
                  ? <Navigate to="/dashboard" replace />
                : <Navigate to="/dashboard" replace />
            : <AboutPage />
        } />
        <Route path="/contact" element={
          isAuthenticated 
            ? userRole === "superadmin" 
              ? <Navigate to="/superadmin" replace /> 
              : userRole === "admin" 
                ? <Navigate to="/admin/dashboard" replace /> 
                : userRole === "director"
                  ? <Navigate to="/director/dashboard" replace />
                : userRole === "responsable"
                  ? <Navigate to="/dashboard" replace />
                : <Navigate to="/dashboard" replace />
            : <ContactPage />
        } />
        <Route path="/pricing" element={
          isAuthenticated 
            ? userRole === "superadmin" 
              ? <Navigate to="/superadmin" replace /> 
              : userRole === "admin" 
                ? <Navigate to="/admin/dashboard" replace /> 
                : userRole === "director"
                  ? <Navigate to="/director/dashboard" replace />
                : userRole === "responsable"
                  ? <Navigate to="/dashboard" replace />
                : <Navigate to="/dashboard" replace />
            : <PricingPage />
        } />
        <Route path="/login" element={
          isAuthenticated 
            ? userRole === "superadmin" 
              ? <Navigate to="/superadmin" replace /> 
              : userRole === "admin" 
                ? <Navigate to="/admin/dashboard" replace /> 
                : userRole === "director"
                  ? <Navigate to="/director/dashboard" replace />
                : userRole === "responsable"
                  ? <Navigate to="/dashboard" replace />
                : <Navigate to="/dashboard" replace />
            : <LoginPage isLogged={handleLog} />
        } />
        <Route path="/register" element={
          isAuthenticated 
            ? userRole === "superadmin" 
              ? <Navigate to="/superadmin" replace /> 
              : userRole === "admin" 
                ? <Navigate to="/admin/dashboard" replace /> 
                : userRole === "director"
                  ? <Navigate to="/director/dashboard" replace />
                : userRole === "responsable"
                  ? <Navigate to="/dashboard" replace />
                : <Navigate to="/dashboard" replace />
            : <RegisterPage />
        } />
        <Route path="/signup" element={
          isAuthenticated 
            ? userRole === "superadmin" 
              ? <Navigate to="/superadmin" replace /> 
              : userRole === "admin" 
                ? <Navigate to="/admin/dashboard" replace /> 
                : userRole === "director"
                  ? <Navigate to="/director/dashboard" replace />
                : userRole === "responsable"
                  ? <Navigate to="/dashboard" replace />
                : <Navigate to="/dashboard" replace />
            : <SignupPage />
        } />

        {/* Protected Routes */}
        <Route element={<ProtectedRoutes isAuthenticated={isAuthenticated} />}>
          {/* Director Routes */}
          <Route element={<ProtectedDirector AuthenticatedasDirector={getRoleForProtection()} />}>
            <Route path="director" element={<DirectorRootLayout />}>
              <Route index element={<DirectorDashboard />} />
              <Route path="dashboard" element={<DirectorDashboard />} />
              <Route path="users" element={<DirectorUsers />} />
              <Route path="institutions/:id" element={<InstitutionDetails />} />
              <Route path="plans" element={<DirectorPlans />} />
              <Route path="folders" element={<Folders />} />
            </Route>
          </Route>

          {/* SuperAdmin Routes */}
          <Route element={<ProtectedSuperAdmin AuthenticatedasSuperAdmin={getRoleForProtection()} />}>
            <Route path="superadmin" element={<SuperAdminRootLayout />}>
              <Route index element={<SuperAdminDashboard />} />
              <Route path="users" element={<SuperAdminUsers />} />
              <Route path="documents" element={<SuperAdminDocuments />} />
              <Route path="statistics" element={<SuperAdminStatistics />} />
              <Route path="notifications" element={<SuperAdminNotifications />} />
              <Route path="storage" element={<SuperAdminStorage />} />
              <Route path="plans" element={<SuperAdminPlans />} />
            </Route>
          </Route>

          {/* Admin Routes */}
          <Route element={<Protectedadmin AuthenticatedasAdmin={getRoleForProtection()} />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminPage />} />
              <Route path="dashboard" element={<AdminPage />} />
              <Route path="users" element={<ManageUsers />} />
              <Route path="create-user" element={<CreateUser />} />
              <Route path="documents" element={<Documents />} />
              <Route path="statistics" element={<AdminStatistics />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="upload" element={<Uploadpage />} />
              <Route path="search" element={<SearchPage />} />
            </Route>
          </Route>

          {/* User Routes */}
          <Route element={<ProtectedUser AuthenticatedasUsr={getRoleForProtection()} />}>
            <Route path="/dashboard" element={<RootLayout roles={userRole || localStorage.getItem('userRole')} />}>
              <Route index element={<HomePage />} />
              <Route path="profile" element={<Profile />} />
              <Route path="Mydocuments" element={<Uploadpage />} />
              <Route path="diffuse" element={<DiffusePage />} />
              <Route path="download" element={<ArchiveDocuments />} />
              <Route path="Search" element={<SearchPage />} />
              <Route path="verify" element={<VerifyDoc />} />
              <Route path="statistics" element={<Statistics />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>

        {/* Redirect authenticated users to appropriate dashboard */}
        <Route path="/dashboard" element={
          isAuthenticated 
            ? userRole === "superadmin" 
              ? <Navigate to="/superadmin" replace /> 
              : userRole === "admin" 
                ? <Navigate to="/admin/dashboard" replace /> 
                : userRole === "director"
                  ? <Navigate to="/director/dashboard" replace />
                : userRole === "responsable"
                  ? <Navigate to="/dashboard" replace />
                    : <Navigate to="/login" replace />
            : <Navigate to="/login" replace />
        } />

        {/* Catch-all route for /director */}
        <Route path="/director" element={
          isAuthenticated && userRole === "director"
            ? <Navigate to="/director/dashboard" replace />
            : <Navigate to="/login" replace />
        } />
      </>
    )
  );

  console.log("App component rendering, isAuthenticated:", localStorage.getItem("isAuthenticated"));
  console.log("App component role state:", userRole);

  return (
    <ChakraProvider theme={theme}>
      <NotificationProvider>
        <div className="app-container">
          {/* Global Impersonation Banner */}
          <ImpersonationBanner
            currentUser={currentUser}
            originalUser={originalUser}
            isVisible={isImpersonating && isAuthenticated}
          />
          
          {/* No margin needed for discreet indicator */}
          <RouterProvider router={router} />
          

        </div>
      </NotificationProvider>
    </ChakraProvider>
  );
}

export default App;
