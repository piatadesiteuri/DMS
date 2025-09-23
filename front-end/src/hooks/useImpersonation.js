import { useState, useEffect, useCallback, useRef } from 'react';
import { backend } from '../config';
import { logRequest } from '../utils/requestMonitor';

const useImpersonation = () => {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [originalUser, setOriginalUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isCheckingRef = useRef(false);
  const lastCheckTime = useRef(0);
  const hasInitialized = useRef(false);
  const componentMountedRef = useRef(false);

  // Check session for impersonation status
  const checkImpersonationStatus = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isCheckingRef.current) {
      console.log('Already checking impersonation status, skipping...');
      return;
    }
    
    // Throttle requests - minimum 1 second between calls
    const now = Date.now();
    if (now - lastCheckTime.current < 1000) {
      console.log('Throttling session check, too soon since last call');
      return;
    }
    
    isCheckingRef.current = true;
    lastCheckTime.current = now;
    
    try {
      console.log('🔍 STARTING SESSION CHECK - useImpersonation hook');
      logRequest('/session-check', 'GET');
      const response = await fetch(`${backend}/session-check`, {
        credentials: 'include',
        headers: {
          'Origin': window.location.origin
        }
      });

      if (!response.ok) {
        throw new Error('Session check failed');
      }

      const data = await response.json();
      
      console.log('🔍 RAW SESSION CHECK RESPONSE:', JSON.stringify(data, null, 2));
      console.log('🔍 Response properties check:', {
        valid: data.valid,
        hasIsImpersonating: 'isImpersonating' in data,
        isImpersonatingValue: data.isImpersonating,
        hasOriginalSession: 'originalSession' in data,
        originalSessionValue: data.originalSession
      });
      
      if (data.valid) {
        const newCurrentUser = {
          id_user: data.id_user,
          prenom: data.prenom,
          nom: data.nom,
          roles: data.role
        };
        
        console.log('✅ Valid session - setting current user:', newCurrentUser);
        setCurrentUser(newCurrentUser);

        if (data.isImpersonating && data.originalSession) {
          console.log('🎭 IMPERSONATION DETECTED!');
          console.log('🎭 Original session data:', data.originalSession);
          
          const newOriginalUser = {
            id_user: data.originalSession.id_user,
            prenom: data.originalSession.prenom,
            nom: data.originalSession.nom,
            roles: data.originalSession.role
          };
          
          console.log('🎭 Setting impersonation state...');
          console.log('🎭 Current user (impersonated):', newCurrentUser);
          console.log('🎭 Original user (superadmin):', newOriginalUser);
          
          setIsImpersonating(true);
          setOriginalUser(newOriginalUser);
          
          console.log('🎭 STATE UPDATED - isImpersonating: true');
        } else if (data.isImpersonating && !data.originalSession) {
          // Impersonation detected but no original session data
          console.log('🎭 IMPERSONATION DETECTED but no original session data!');
          console.log('🎭 Creating fallback original user for SuperAdmin');
          
          // Create fallback original user (SuperAdmin)
          const fallbackOriginalUser = {
            id_user: 20, // Default SuperAdmin ID
            prenom: 'Super',
            nom: 'Admin',
            roles: 'superadmin'
          };
          
          console.log('🎭 Setting impersonation state with fallback...');
          console.log('🎭 Current user (impersonated):', newCurrentUser);
          console.log('🎭 Fallback original user:', fallbackOriginalUser);
          
          setIsImpersonating(true);
          setOriginalUser(fallbackOriginalUser);
          
          console.log('🎭 STATE UPDATED - isImpersonating: true (with fallback)');
        } else {
          console.log('❌ No impersonation detected');
          console.log('❌ data.isImpersonating:', data.isImpersonating);
          console.log('❌ data.originalSession:', data.originalSession);
          setIsImpersonating(false);
          setOriginalUser(null);
        }
      } else {
        console.log('❌ Invalid session');
        setCurrentUser(null);
        setOriginalUser(null);
        setIsImpersonating(false);
      }
    } catch (error) {
      console.error('❌ Error checking impersonation status:', error);
      // On error, only clear state if we don't have valid data
      setCurrentUser(null);
      setOriginalUser(null);
      setIsImpersonating(false);
          } finally {
        setLoading(false);
        isCheckingRef.current = false;
        
        console.log('🔍 SESSION CHECK COMPLETE - Final state:', {
          isImpersonating,
          hasCurrentUser: !!currentUser,
          hasOriginalUser: !!originalUser,
          loading
        });
      }
    }, []);

  // Start impersonation
  const startImpersonation = useCallback(async (userId, userInfo = null) => {
    try {
      const response = await fetch(`${backend}/impersonate`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error('Impersonation failed');
      }

      const data = await response.json();
      
      console.log('🎭 Impersonation response:', data);
      
      if (data.success) {
        console.log('✅ Impersonation successful! Updating state...');
        // Update state immediately
        setIsImpersonating(true);
        setCurrentUser({
          id_user: data.user.id,
          prenom: data.user.prenom,
          nom: data.user.nom,
          roles: data.user.role
        });
        
        // Store original user info if provided
        if (userInfo) {
          console.log('📝 Setting original user:', userInfo);
          setOriginalUser(userInfo);
        }

        return data;
      } else {
        throw new Error(data.message || 'Impersonation failed');
      }
    } catch (error) {
      console.error('Error starting impersonation:', error);
      throw error;
    }
  }, []);

  // Stop impersonation
  const stopImpersonation = useCallback(async () => {
    try {
      const response = await fetch(`${backend}/stop-impersonation`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        }
      });

      if (!response.ok) {
        throw new Error('Stop impersonation failed');
      }

      const data = await response.json();
      
      if (data.success) {
        // Update state immediately
        setIsImpersonating(false);
        setCurrentUser({
          id_user: data.user.id,
          prenom: data.user.prenom,
          nom: data.user.nom,
          roles: data.user.role
        });
        setOriginalUser(null);

        // Force a fresh check to ensure state is correct
        setTimeout(() => {
          checkImpersonationStatus();
        }, 100);

        return data;
      } else {
        throw new Error(data.message || 'Stop impersonation failed');
      }
    } catch (error) {
      console.error('Error stopping impersonation:', error);
      throw error;
    }
  }, [checkImpersonationStatus]);

  // Force refresh function
  const forceRefresh = useCallback(() => {
    console.log('🔄 Forcing impersonation status refresh...');
    checkImpersonationStatus();
  }, [checkImpersonationStatus]);

  // Initialize on mount - ONLY ONCE
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      checkImpersonationStatus();
    }
  }, []); // Empty dependency array to run only once

  // Check for impersonation when page loads or becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !loading) {
        console.log('🔍 Page became visible, checking impersonation status...');
        checkImpersonationStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []); // Remove dependencies to prevent re-mounting

  // Refresh status periodically (optional) - DISABLED to prevent loop
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     if (!loading) {
  //       checkImpersonationStatus();
  //     }
  //   }, 30000); // Check every 30 seconds

  //   return () => clearInterval(interval);
  // }, [checkImpersonationStatus, loading]);

  return {
    isImpersonating,
    currentUser,
    originalUser,
    loading,
    startImpersonation,
    stopImpersonation,
    checkImpersonationStatus,
    forceRefresh
  };
};

export default useImpersonation; 