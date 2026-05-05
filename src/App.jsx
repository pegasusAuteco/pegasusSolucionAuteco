import React, { useState, useEffect } from 'react';
import DashboardLayout from './components/DashboardLayout';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import { Moon, Sun, LogOut } from 'lucide-react';

// Seed initial admin user if no users exist
const seedAdmin = () => {
  const users = localStorage.getItem('users');
  if (!users) {
    localStorage.setItem('users', JSON.stringify([
      { id: 1, name: 'Administrador', email: 'admin@pegasus.com', password: 'admin123', role: 'admin' }
    ]));
  }
};

function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login' or 'register'

  useEffect(() => {
    seedAdmin();
    // Check if there's an active session
    const activeSession = sessionStorage.getItem('currentUser');
    if (activeSession) {
      setCurrentUser(JSON.parse(activeSession));
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    sessionStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    sessionStorage.removeItem('currentUser');
    setAuthView('login');
  };

  return (
    <div className="App h-screen w-screen overflow-hidden relative">
      {/* Theme Toggle Button */}
      <button 
        onClick={() => setIsDarkMode(!isDarkMode)}
        className="absolute top-4 right-4 z-50 p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 hover:scale-110 transition-transform flex items-center justify-center"
        title="Alternar tema"
      >
        {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-500" />}
      </button>

      {isAuthenticated && (
        <button
          onClick={handleLogout}
          className="absolute top-4 right-20 z-50 p-3 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 shadow-lg border border-red-100 dark:border-red-800/50 hover:scale-110 transition-transform flex items-center justify-center"
          title="Cerrar Sesión"
        >
          <LogOut className="w-5 h-5" />
        </button>
      )}

      {!isAuthenticated ? (
        authView === 'login' ? (
          <Login 
            onLogin={handleLogin} 
            onNavigateRegister={() => setAuthView('register')} 
          />
        ) : (
          <Register 
            onRegisterSuccess={handleLogin} 
            onNavigateLogin={() => setAuthView('login')} 
          />
        )
      ) : (
        <DashboardLayout currentUser={currentUser} />
      )}
    </div>
  );
}

export default App;
