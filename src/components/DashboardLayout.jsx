import React, { useState } from 'react';
import ChatContainer from './Chat/ChatContainer';
import MotorcycleList from './Inventory/MotorcycleList';
import { MessageSquare, Bike } from 'lucide-react';

const DashboardLayout = () => {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'inventory'

  return (
    <div className="flex flex-col h-screen bg-bg-light dark:bg-gray-950 overflow-hidden text-auteco-blue dark:text-gray-200 transition-colors duration-300">
      {/* Desktop Layout */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        <div className="w-[40%] border-r border-gray-100 dark:border-gray-800 shadow-xl dark:shadow-2xl z-10 bg-white dark:bg-gray-900/40 dark:backdrop-blur-sm transition-colors duration-300">
          <ChatContainer />
        </div>
        <div className="w-[60%] overflow-y-auto">
          <MotorcycleList />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="flex lg:hidden flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'chat' ? <ChatContainer /> : <MotorcycleList />}
        </div>
        
        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-3 flex justify-around items-center transition-colors duration-300">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'chat' ? 'text-auteco-red font-bold' : 'text-gray-400 dark:text-gray-500'}`}
          >
            <MessageSquare className="w-6 h-6" />
            <span className="text-[10px] uppercase">Chat IA</span>
          </button>
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'inventory' ? 'text-auteco-red font-bold' : 'text-gray-400 dark:text-gray-500'}`}
          >
            <Bike className="w-6 h-6" />
            <span className="text-[10px] uppercase">Motos</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
