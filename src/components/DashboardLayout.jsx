import React, { useState } from 'react';
import ChatContainer from './Chat/ChatContainer';
import MotorcycleList from './Inventory/MotorcycleList';
import { MessageSquare, Bike } from 'lucide-react';

const DashboardLayout = () => {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'inventory'

  return (
    <div className="flex flex-col h-screen bg-bg-light overflow-hidden">
      {/* Desktop Layout */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        <div className="w-[40%] border-r border-gray-100 shadow-xl z-10">
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
        <div className="bg-white border-t border-gray-100 px-6 py-3 flex justify-around items-center">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'chat' ? 'text-auteco-red font-bold' : 'text-gray-400'}`}
          >
            <MessageSquare className="w-6 h-6" />
            <span className="text-[10px] uppercase">Chat IA</span>
          </button>
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'inventory' ? 'text-auteco-red font-bold' : 'text-gray-400'}`}
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
