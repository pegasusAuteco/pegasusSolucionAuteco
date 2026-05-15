import React, { useState, useEffect } from 'react';
import { MotorcycleEntry, useWorkshopStore } from '../../store/workshopStore';
import { Clock, Wrench, Plus, CheckCircle2, Package, Edit, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import ReceptionForm from './ReceptionForm';

interface MotorcycleCardProps {
  entry: MotorcycleEntry;
}

export default function MotorcycleCard({ entry }: MotorcycleCardProps) {
  const [partName, setPartName] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [timeElapsed, setTimeElapsed] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  const addPartToEntry = useWorkshopStore((state) => state.addPartToEntry);
  const removeEntry = useWorkshopStore((state) => state.removeEntry);

  useEffect(() => {
    const updateTimer = () => {
      setTimeElapsed(
        formatDistanceToNow(entry.timestamp, { addSuffix: false, locale: es })
      );
    };
    updateTimer();
    const interval = setInterval(updateTimer, 60000); // update every minute
    return () => clearInterval(interval);
  }, [entry.timestamp]);

  const handleAddPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (partName.trim() && partQty > 0) {
      addPartToEntry(entry.id, {
        name: partName.trim(),
        quantity: partQty,
      });
      setPartName('');
      setPartQty(1);
    }
  };

  if (isEditing) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
          <ReceptionForm 
            initialData={entry} 
            onSuccess={() => setIsEditing(false)} 
            onCancel={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md font-sans h-full">
      {/* Header */}
      <div className="border-l-4 border-auteco-red px-5 py-4 flex justify-between items-start bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-100 dark:border-gray-800">
        <div className="flex flex-col">
          <span className="font-black text-xl leading-tight text-auteco-blue dark:text-white">{entry.model}</span>
          <span className="text-gray-500 text-xs font-bold tracking-wider mt-0.5">{entry.plate}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-md text-xs font-bold text-gray-500 dark:text-gray-400 shadow-sm">
          <Clock className="w-3.5 h-3.5" />
          <span>{timeElapsed}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col gap-4">
        {/* Client info */}
        <div className="text-sm">
          <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Cliente</p>
          <p className="font-semibold text-gray-900 dark:text-white text-base">{entry.clientName}</p>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">CC/NIT: {entry.clientId}</p>
        </div>

        <div className="text-sm text-gray-700 dark:text-gray-300">
          <p className="font-semibold text-gray-900 dark:text-white mb-1">Observaciones iniciales:</p>
          <p className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 italic">
            "{entry.observations}"
          </p>
        </div>

        {/* Separator */}
        <div className="border-t border-gray-100 dark:border-gray-800 my-1"></div>

        {/* Materiales / Repuestos */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3 text-auteco-red font-semibold">
            <Wrench className="w-4 h-4" />
            <h4 className="text-sm uppercase tracking-wide">Gestión de Suministros</h4>
          </div>

          {entry.status === 'pending' && (
            <form onSubmit={handleAddPart} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Ej: Filtro de aceite"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-auteco-red dark:text-white outline-none transition-colors"
              />
              <input
                type="number"
                min="1"
                value={partQty}
                onChange={(e) => setPartQty(parseInt(e.target.value) || 1)}
                className="w-16 px-2 py-1.5 text-sm text-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-auteco-red dark:text-white outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!partName.trim()}
                className="px-3 py-1.5 bg-auteco-red text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          )}

          {entry.parts.length > 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-3 py-2">Repuesto</th>
                    <th className="px-3 py-2 text-center w-16">Cant.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {entry.parts.map((part) => (
                    <tr key={part.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-gray-700 dark:text-gray-300">
                      <td className="px-3 py-2 font-medium flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                        {part.name}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-auteco-red">
                        {part.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-2">
              No se han agregado repuestos aún.
            </p>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
        {entry.status === 'pending' ? (
          <>
            <button
              onClick={() => setIsEditing(true)}
              title="Editar"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              Editar
            </button>
            <button
              onClick={() => useWorkshopStore.getState().finishRepair(entry.id)}
              title="Finalizar"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-lg transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Terminar
            </button>
          </>
        ) : (
          <button
            onClick={() => {
              if(confirm('¿Seguro que deseas cerrar este pedido? El registro se eliminará de la lista.')) {
                removeEntry(entry.id);
              }
            }}
            title="Cerrar Pedido"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Cerrar Pedido
          </button>
        )}
      </div>
    </div>
  );
}
