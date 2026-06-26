/**
 * Workshop motorcycle card component with full repair management.
 *
 * Displays client info, observations, mechanic notes, parts table,
 * and action buttons (Edit, Complete, WhatsApp notification, Close order).
 * Used in the MechanicDashboard's local queue view.
 */
import React, { useState, useEffect } from 'react';
import { useWorkshop } from '@hooks/useWorkshop';
import { useToastStore } from '../../store/toastStore';
import { Clock, Wrench, Plus, CheckCircle2, Package, Edit, Trash2, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { formatRelativeTime } from '../../utils/dates';
import { workshopService } from '../../services/workshopService';
import ReceptionForm from './ReceptionForm';

export default function MotorcycleCard({ entry }) {
  const [partName, setPartName] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [timeElapsed, setTimeElapsed] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [partsExpanded, setPartsExpanded] = useState(false);

  const { addPartToEntry, removeEntry, removePartFromEntry, finishRepair } = useWorkshop();
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    const updateTimer = () => {
      setTimeElapsed(formatRelativeTime(entry.timestamp));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [entry.timestamp]);

  const handleAddPart = (e) => {
    e.preventDefault();
    if (partName.trim() && partQty > 0) {
      addPartToEntry(entry.id, { name: partName.trim(), quantity: partQty });
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

      <div className="p-4 flex-1 flex flex-col gap-4">
        <div className="text-sm">
          <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Cliente</p>
          <p className="font-semibold text-gray-900 dark:text-white text-base">{entry.clientName}</p>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">CC/NIT: {entry.clientId}</p>
          {entry.phone && <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Celular: {entry.phone}</p>}
        </div>

        <div className="text-sm text-gray-700 dark:text-gray-300">
          <p className="font-semibold text-gray-900 dark:text-white mb-1">Observaciones iniciales:</p>
          <p className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 italic">
            "{entry.observations}"
          </p>
        </div>

        {entry.mechanicNotes && (
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <p className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-auteco-red" />
              Observaciones del Mecánico:
            </p>
            <p className="bg-red-50 dark:bg-red-900/10 p-2.5 rounded-lg border border-red-100 dark:border-red-900/20 italic">
              "{entry.mechanicNotes}"
            </p>
          </div>
        )}

        <div className="border-t border-gray-100 dark:border-gray-800 my-1"></div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3 text-auteco-red font-semibold">
            <Wrench className="w-4 h-4" />
            <h4 className="text-sm uppercase tracking-wide">Gestión de Suministros</h4>
          </div>

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

          {entry.parts.length > 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-3 py-2">Repuesto</th>
                    <th className="px-3 py-2 text-center w-16">Cant.</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {entry.parts.slice(0, partsExpanded ? undefined : 2).map((part) => (
                    <tr key={part.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-gray-700 dark:text-gray-300">
                      <td className="px-3 py-2 font-medium flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                        {part.name}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-auteco-red">{part.quantity}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => removePartFromEntry(entry.id, part.id)}
                          className="p-1 text-gray-400 hover:text-auteco-red hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {entry.parts.length > 2 && (
                <button
                  type="button"
                  onClick={() => setPartsExpanded(!partsExpanded)}
                  className="w-full py-2 flex items-center justify-center gap-1.5 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold text-gray-500 transition-colors border-t border-gray-100 dark:border-gray-800"
                >
                  {partsExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Mostrar menos
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Ver {entry.parts.length - 2} más
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-2">
              No se han agregado repuestos aún.
            </p>
          )}
        </div>
      </div>

      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
        {entry.status === 'pending' ? (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              Editar
            </button>
            <button
              onClick={async () => {
                try {
                  await workshopService.finishRepair(entry.id)
                  finishRepair(entry.id)
                } catch (err) {
                  addToast('error', ` Error al completar: ${err?.response?.data?.detail ?? err.message ?? 'Error desconocido'}`)
                }
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-lg transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Terminar
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={isSending}
              onClick={async () => {
                try {
                  setIsSending(true)
                  await workshopService.notifyWhatsApp(entry.id, entry.parts)
                  addToast('success', '¡Mensaje de WhatsApp enviado al cliente!')
                } catch (err) {
                  addToast('error', ` Error al enviar mensaje: ${err?.message || 'Error desconocido'}`)
                } finally {
                  setIsSending(false)
                }
              }}
              className="flex-1 group relative flex items-center justify-center gap-2 px-3 py-2.5 overflow-hidden rounded-lg bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white text-sm font-bold shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
              <svg className="w-[18px] h-[18px] drop-shadow-sm z-10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              <span className="z-10 drop-shadow-sm tracking-wide">
                {isSending ? 'Enviando...' : 'WhatsApp'}
              </span>
            </button>
            <button
              onClick={async () => {
                if (confirm('¿Seguro que deseas cerrar este pedido? El registro se eliminará de la lista.')) {
                  try {
                    await workshopService.deleteIngreso(entry.id)
                    removeEntry(entry.id)
                  } catch (err) {
                    addToast('error', ` Error al cerrar pedido: ${err?.response?.data?.detail ?? err.message ?? 'Error desconocido'}`)
                  }
                }
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-bold text-white bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Cerrar Pedido
            </button>
          </>
        )}
      </div>
    </div>
  );
}
