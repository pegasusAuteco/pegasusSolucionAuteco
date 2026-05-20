import { useState } from 'react';
import { PenTool, ClipboardEdit, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReceptionForm from '../components/workshop/ReceptionForm';
import MechanicDashboard from '../components/workshop/MechanicDashboard';

export default function WorkshopPage() {
  const [activeTab, setActiveTab] = useState<'reception' | 'mechanic'>('reception');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-light dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans flex flex-col transition-colors duration-300">
      {/* Workshop Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-6 shadow-sm shrink-0 transition-colors duration-300">
        <div className="max-w-6xl mx-auto flex flex-col gap-4">
          <button
            onClick={() => navigate('/chat')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-auteco-blue transition-colors w-fit font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Inicio
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-auteco-blue dark:text-white tracking-tight uppercase">
                Taller <span className="text-auteco-red">Pegasus</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
              Módulo de Gestión y Flujo Técnico
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full sm:w-auto transition-colors duration-300">
            <button
              onClick={() => setActiveTab('reception')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'reception'
                  ? 'bg-white dark:bg-gray-700 text-auteco-blue shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-auteco-blue dark:hover:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-700/50'
              }`}
            >
              <ClipboardEdit className="w-4 h-4" />
              Recepción
            </button>
            <button
              onClick={() => setActiveTab('mechanic')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'mechanic'
                  ? 'bg-white dark:bg-gray-700 text-auteco-blue shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-auteco-blue dark:hover:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-700/50'
              }`}
            >
              <PenTool className="w-4 h-4" />
              Equipo Técnico
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'reception' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ReceptionForm />
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <MechanicDashboard />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
