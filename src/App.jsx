import React, { useState, useEffect } from 'react';
import DashboardLayout from './components/DashboardLayout';
import { Moon, Sun } from 'lucide-react';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="App h-screen w-screen overflow-hidden relative">
      <DashboardLayout />
      
      {/* Theme Toggle Button */}
      <button 
        onClick={() => setIsDarkMode(!isDarkMode)}
        className="absolute top-4 right-4 z-50 p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 hover:scale-110 transition-transform"
        title="Alternar tema"
      >
        {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-500" />}
      </button>
    </div>
  );
}

export default App;
