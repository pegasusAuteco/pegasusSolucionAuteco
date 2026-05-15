import { useState } from 'react';
import { useWorkshopStore } from '../../store/workshopStore';
import MotorcycleCard from './MotorcycleCard';
import { ClipboardCheck, Wrench, CheckCircle } from 'lucide-react';

export default function MechanicDashboard() {
  const queue = useWorkshopStore((state) => state.queue);
  const [activeTab, setActiveTab] = useState<'pending' | 'finished'>('pending');

  const pendingQueue = queue.filter(q => q.status === 'pending').sort((a, b) => a.timestamp - b.timestamp);
  const finishedQueue = queue.filter(q => q.status === 'finished').sort((a, b) => b.timestamp - a.timestamp); // Newest finished first

  const displayedQueue = activeTab === 'pending' ? pendingQueue : finishedQueue;

  return (
    <div className="space-y-6">
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit transition-colors duration-300">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'pending'
              ? 'bg-white dark:bg-gray-700 text-auteco-red shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-auteco-red dark:hover:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-700/50'
          }`}
        >
          <Wrench className="w-4 h-4" />
          En Reparación ({pendingQueue.length})
        </button>
        <button
          onClick={() => setActiveTab('finished')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'finished'
              ? 'bg-white dark:bg-gray-700 text-auteco-red shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-auteco-red dark:hover:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-700/50'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Listos para Entregar ({finishedQueue.length})
        </button>
      </div>

      {displayedQueue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <ClipboardCheck className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-xl font-bold text-gray-400 dark:text-gray-500">
            {activeTab === 'pending' ? 'No hay motocicletas en cola' : 'No hay motocicletas listas'}
          </h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {activeTab === 'pending' 
              ? 'Las motocicletas registradas en recepción aparecerán aquí.' 
              : 'Las motocicletas reparadas aparecerán aquí para facturación.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedQueue.map((entry) => (
            <MotorcycleCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
