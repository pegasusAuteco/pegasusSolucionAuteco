import React, { useState } from 'react';
import ChatContainer from './Chat/ChatContainer';
import MotorcycleList from './Inventory/MotorcycleList';
import AdminMetrics from './Admin/AdminMetrics';
import { MessageSquare, Bike, BarChart3 } from 'lucide-react';

const DashboardLayout = ({ currentUser }) => {
  const isAdmin = currentUser?.role === 'admin';

  // 'chat', 'inventory', or 'metrics' (admin only)
  const [activeTab, setActiveTab] = useState('chat');
  const [activePanelDesktop, setActivePanelDesktop] = useState('inventory'); // desktop right panel: 'inventory' | 'metrics'

  return (
    <div className="flex flex-col h-screen bg-bg-light dark:bg-gray-950 overflow-hidden text-auteco-blue dark:text-gray-200 transition-colors duration-300">

      {/* Desktop Layout */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        {/* Left: Chat */}
        <div className="w-[40%] border-r border-gray-100 dark:border-gray-800 shadow-xl dark:shadow-2xl z-10 bg-white dark:bg-gray-900/40 dark:backdrop-blur-sm transition-colors duration-300 flex flex-col overflow-hidden">
          <ChatContainer />
        </div>

        {/* Right: Panel */}
        <div className="w-[60%] flex flex-col overflow-hidden">
          {/* Admin panel selector tabs */}
          {isAdmin && (
            <div className="flex items-center gap-1 px-4 pt-4 pb-0 shrink-0">
              <button
                onClick={() => setActivePanelDesktop('inventory')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-t-xl text-sm font-semibold transition-all border-b-2 ${
                  activePanelDesktop === 'inventory'
                    ? 'border-auteco-red text-auteco-red bg-red-50/50 dark:bg-red-900/10'
                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <Bike className="w-4 h-4" />
                Inventario
              </button>
              <button
                onClick={() => setActivePanelDesktop('metrics')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-t-xl text-sm font-semibold transition-all border-b-2 ${
                  activePanelDesktop === 'metrics'
                    ? 'border-auteco-red text-auteco-red bg-red-50/50 dark:bg-red-900/10'
                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Métricas Admin
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {isAdmin && activePanelDesktop === 'metrics'
              ? <AdminMetrics />
              : <MotorcycleList />
            }
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="flex lg:hidden flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'chat' && <ChatContainer />}
          {activeTab === 'inventory' && <MotorcycleList />}
          {activeTab === 'metrics' && isAdmin && <AdminMetrics />}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-3 flex justify-around items-center transition-colors duration-300 shrink-0">
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

          {isAdmin && (
            <button
              onClick={() => setActiveTab('metrics')}
              className={`flex flex-col items-center gap-1 ${activeTab === 'metrics' ? 'text-auteco-red font-bold' : 'text-gray-400 dark:text-gray-500'}`}
            >
              <BarChart3 className="w-6 h-6" />
              <span className="text-[10px] uppercase">Métricas</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
