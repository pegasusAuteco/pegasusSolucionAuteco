import React, { useState } from 'react';
import { useWorkshopStore } from '../../store/workshopStore';
import { Package, Plus, ArrowLeft, Wrench, CheckCircle } from 'lucide-react';

interface CompactMechanicQueueProps {
  isGrid?: boolean;
}

export default function CompactMechanicQueue({ isGrid = false }: CompactMechanicQueueProps) {
  const queue = useWorkshopStore((state) => state.queue);
  const activeRepairId = useWorkshopStore((state) => state.activeRepairId);
  const setActiveRepairId = useWorkshopStore((state) => state.setActiveRepairId);
  const addPartToEntry = useWorkshopStore((state) => state.addPartToEntry);
  const finishRepair = useWorkshopStore((state) => state.finishRepair);

  const pendingQueue = queue.filter(q => q.status === 'pending');
  const sortedQueue = [...pendingQueue].sort((a, b) => a.timestamp - b.timestamp);
  const activeRepair = activeRepairId ? queue.find((q) => q.id === activeRepairId && q.status === 'pending') : null;

  if (activeRepair) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-950 h-full">
        <div className="p-3 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={() => setActiveRepairId(null)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-auteco-red transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a la cola
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 items-center">
          <div className="w-full max-w-md">
            <h3 className="font-bold text-auteco-red mb-3 uppercase text-xs tracking-wider flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" />
              Reparación Activa
            </h3>
            <CompactMotorcycleCard 
              entry={activeRepair} 
              onAddPart={(part) => addPartToEntry(activeRepair.id, part)} 
              isActiveView={true}
            />
            <button
              onClick={() => finishRepair(activeRepair.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors mt-4"
            >
              <CheckCircle className="w-4 h-4" />
              Terminar Reparación
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (sortedQueue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">No hay motocicletas en cola</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase text-xs tracking-wider">
        Cola de Reparación ({sortedQueue.length})
      </h3>
      <div className={isGrid ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-4"}>
        {sortedQueue.map((entry) => (
          <CompactMotorcycleCard 
            key={entry.id} 
            entry={entry} 
            onAddPart={(part) => addPartToEntry(entry.id, part)} 
            onSelect={() => setActiveRepairId(entry.id)}
            isActiveView={false}
          />
        ))}
      </div>
    </div>
  );
}

function CompactMotorcycleCard({ 
  entry, 
  onAddPart, 
  onSelect,
  isActiveView
}: { 
  entry: any, 
  onAddPart: (part: any) => void,
  onSelect?: () => void,
  isActiveView: boolean
}) {
  const [partName, setPartName] = useState('');
  const [partQty, setPartQty] = useState(1);

  const handleAddPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (partName.trim() && partQty > 0) {
      onAddPart({ name: partName.trim(), quantity: partQty });
      setPartName('');
      setPartQty(1);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 border-l-4 ${isActiveView ? 'border-l-auteco-red border-y border-r border-gray-200 dark:border-gray-700 shadow-md' : 'border-l-gray-300 dark:border-l-gray-600 border-y border-r border-gray-100 dark:border-gray-800 shadow-sm'} rounded-r-lg p-3 flex flex-col gap-2 transition-all`}>
      <div className="flex justify-between items-start gap-2">
        <div>
          <h4 className={`font-bold text-sm leading-tight ${isActiveView ? 'text-auteco-red' : 'text-gray-800 dark:text-gray-200'}`}>{entry.model}</h4>
          <p className="text-xs text-gray-500 font-medium">{entry.plate}</p>
        </div>
        {!isActiveView && onSelect && (
          <button
            onClick={onSelect}
            className="text-[10px] uppercase tracking-wider font-bold bg-red-50 dark:bg-red-900/20 text-auteco-red hover:bg-red-100 dark:hover:bg-red-900/40 px-2.5 py-1.5 rounded transition-colors shrink-0"
          >
            Seleccionar
          </button>
        )}
      </div>
      
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded p-2 text-xs text-gray-600 dark:text-gray-400 italic border border-gray-100 dark:border-gray-800 line-clamp-2">
        "{entry.observations}"
      </div>

      {isActiveView && (
        <form onSubmit={handleAddPart} className="flex gap-1.5 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <input
            type="text"
            placeholder="Repuesto..."
            value={partName}
            onChange={(e) => setPartName(e.target.value)}
            className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded focus:ring-1 focus:ring-auteco-red dark:text-white outline-none"
          />
          <input
            type="number"
            min="1"
            value={partQty}
            onChange={(e) => setPartQty(parseInt(e.target.value) || 1)}
            className="w-12 px-1 py-1.5 text-xs text-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded focus:ring-1 focus:ring-auteco-red dark:text-white outline-none"
          />
          <button
            type="submit"
            disabled={!partName.trim()}
            className="px-2 py-1.5 bg-auteco-red text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {entry.parts && entry.parts.length > 0 && (
        <div className="mt-2 space-y-1">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Repuestos añadidos:</p>
          {entry.parts.map((part: any) => (
            <div key={part.id} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-2 py-1.5 rounded">
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 truncate">
                <Package className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{part.name}</span>
              </span>
              <span className="font-bold text-auteco-red ml-2 shrink-0">x{part.quantity}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
