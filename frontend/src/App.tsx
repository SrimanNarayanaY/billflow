import { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { api } from './utils/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState<'admin' | 'tenant' | null>(null);

  useEffect(() => {
    const token = api.getToken();
    const apiKey = localStorage.getItem('billflow_api_key');
    if (token) {
      setIsAuthenticated(true);
      setUserType('admin');
    } else if (apiKey) {
      setIsAuthenticated(true);
      setUserType('tenant');
    }
  }, []);

  const handleLoginSuccess = () => {
    const token = api.getToken();
    const apiKey = localStorage.getItem('billflow_api_key');
    if (token) {
      setUserType('admin');
    } else if (apiKey) {
      setUserType('tenant');
    }
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    api.logout();
    setIsAuthenticated(false);
    setUserType(null);
  };

  return (
    <>
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} userType={userType} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
}

export default App;
