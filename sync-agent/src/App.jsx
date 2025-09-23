import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import MainApp from './components/MainApp';
import { ipcRenderer } from 'electron';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored credentials on startup
    ipcRenderer.invoke('check-auth').then(result => {
      setIsAuthenticated(result);
      setIsLoading(false);
    });
  }, []);

  const handleLogin = async (credentials) => {
    const result = await ipcRenderer.invoke('login', credentials);
    if (result.success) {
      setIsAuthenticated(true);
    }
    return result;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!isAuthenticated ? (
        <Login onLogin={handleLogin} />
      ) : (
        <MainApp />
      )}
    </div>
  );
}

export default App; 