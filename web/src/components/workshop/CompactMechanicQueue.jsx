/**
 * Compact mechanic queue component for the main layout's right panel.
 *
 * Shows pending repairs in a grid or list layout. When a repair is selected,
 * displays a detailed repair panel with notes, parts management, and
 * a "Finish Repair" action button.
 */
import { useState } from 'react';
import { useWorkshop } from '@hooks/useWorkshop';
import { Package, Plus, ArrowLeft, Wrench, CheckCircle, FileText, Trash2 } from 'lucide-react';

export default function CompactMechanicQueue({ isGrid = false }) {
  const {
    queue,
    activeRepairId,
    setActiveRepairId,
    addPartToEntry,
    finishRepair,
    updateEntry,
    removePartFromEntry,
  } = useWorkshop();

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
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gray-50/30 dark:bg-gray-950/20">
          <div className="max-w-3xl">
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-auteco-red rounded-full block"></span>
              Panel de Reparación
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="p-4 lg:p-6">
                <CompactMotorcycleCard
                  entry={activeRepair}
                  onAddPart={(part) => addPartToEntry(activeRepair.id, part)}
                  onUpdateNotes={(notes) => updateEntry(activeRepair.id, { mechanicNotes: notes })}
                  onRemovePart={(partId) => removePartFromEntry(activeRepair.id, partId)}
                  isActiveView={true}
                />
              </div>
              <div className="px-4 lg:px-6 py-4 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <button
                  onClick={() => finishRepair(activeRepair.id)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-base font-bold rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 min-w-[250px]"
                >
                  <CheckCircle className="w-5 h-5" />
                  Finalizar Reparación
                </button>
              </div>
            </div>
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
            onRemovePart={(partId) => removePartFromEntry(entry.id, partId)}
            onSelect={() => setActiveRepairId(entry.id)}
            isActiveView={false}
          />
        ))}
      </div>
    </div>
  );
}

/** Individual motorcycle card with notes, parts management, and repair actions. */
function CompactMotorcycleCard({ entry, onAddPart, onSelect, onUpdateNotes, onRemovePart, isActiveView }) {
  const [partName, setPartName] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [notes, setNotes] = useState(entry.mechanicNotes || '');

  const handleAddPart = (e) => {
    e.preventDefault();
    if (partName.trim() && partQty > 0) {
      onAddPart({ name: partName.trim(), quantity: partQty });
      setPartName('');
      setPartQty(1);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 ${isActiveView ? '' : 'border-l-4 border-l-gray-300 dark:border-l-gray-600 border-y border-r border-gray-100 dark:border-gray-800 shadow-sm p-3 rounded-lg'} flex flex-col transition-all relative overflow-hidden`}>
      <div className={`flex justify-between items-start ${isActiveView ? 'mb-4' : 'mb-2'}`}>
        <div className={isActiveView ? 'flex items-center gap-4' : ''}>
          {isActiveView && (
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5 text-auteco-red" />
            </div>
          )}
          <div>
            <h4 className={`font-bold leading-tight ${isActiveView ? 'text-gray-900 dark:text-white text-lg mb-1' : 'text-gray-800 dark:text-gray-200 text-sm'}`}>{entry.model}</h4>
            <div className={`flex items-center gap-2 ${isActiveView ? 'text-sm' : 'text-xs'} font-medium`}>
              <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{entry.plate}</span>
            </div>
          </div>
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

      <div className={`bg-gray-50 dark:bg-gray-900/50 rounded-xl ${isActiveView ? 'p-4 text-sm mb-4 border-l-4 border-l-auteco-red' : 'p-2 text-xs mb-1'} text-gray-600 dark:text-gray-400 italic border border-gray-100 dark:border-gray-800 ${!isActiveView && 'line-clamp-2'}`}>
        <span className="font-semibold not-italic block mb-1 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Observaciones:</span>
        "{entry.observations}"
      </div>

      {isActiveView && (
        <div className="mt-4 space-y-4">
          <div className="bg-gray-50/50 dark:bg-gray-900/20 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 block flex items-center gap-2">
              <FileText className="w-4 h-4 text-auteco-red" />
              Observaciones del Mecánico
            </label>
            <textarea
              placeholder="Añade notas..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => onUpdateNotes && onUpdateNotes(notes)}
              className="w-full min-h-[60px] px-4 py-2 text-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-auteco-red/20 focus:border-auteco-red dark:text-white outline-none transition-all shadow-sm resize-y"
            />
          </div>

          <div className="bg-gray-50/50 dark:bg-gray-900/20 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 block flex items-center gap-2">
              <Package className="w-4 h-4 text-auteco-red" />
              Añadir Repuestos
            </label>
            <form onSubmit={handleAddPart} className="flex gap-3">
              <input
                type="text"
                placeholder="Ej: Filtro de aceite..."
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                className="flex-1 min-w-0 px-4 py-2 text-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-auteco-red/20 focus:border-auteco-red dark:text-white outline-none transition-all shadow-sm"
              />
              <input
                type="number"
                min="1"
                value={partQty}
                onChange={(e) => setPartQty(parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-2 text-sm text-center bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-auteco-red/20 focus:border-auteco-red dark:text-white outline-none transition-all shadow-sm"
              />
              <button
                type="submit"
                disabled={!partName.trim()}
                className="px-5 py-2 bg-auteco-red text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center shrink-0 shadow-md transform hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {entry.parts && entry.parts.length > 0 && (
        <div className={`space-y-2 ${isActiveView ? 'mt-4' : 'mt-2'}`}>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Lista de Repuestos:</p>
          <div className={isActiveView ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : ''}>
            {entry.parts.map((part) => (
              <div key={part.id} className={`flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg ${isActiveView ? 'px-4 py-3 text-sm shadow-sm' : 'px-2 py-1.5 text-xs'}`}>
                <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300 truncate">
                  <div className={`w-2 h-2 rounded-full bg-auteco-red ${isActiveView ? 'block' : 'hidden'}`}></div>
                  {!isActiveView && <Package className="w-3.5 h-3.5 shrink-0" />}
                  <span className="truncate font-medium">{part.name}</span>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold bg-gray-100 dark:bg-gray-800 text-auteco-red px-2 py-0.5 rounded">x{part.quantity}</span>
                  {isActiveView && onRemovePart && (
                    <button
                      onClick={() => onRemovePart(part.id)}
                      className="text-gray-400 hover:text-auteco-red hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
