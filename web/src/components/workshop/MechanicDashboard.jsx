/**
 * Mechanic dashboard component with dual-view tabs.
 *
 * Switches between:
 * - "Motos Ingresadas": View of Supabase intake records (read-only)
 * - "Cola de Trabajo": Local repair queue with MotorcycleCard management
 * Includes refresh, loading, and error states for the Supabase view.
 */
import { useState, useEffect, useCallback } from 'react';
import { useWorkshop } from '@hooks/useWorkshop';
import MotorcycleCard from './MotorcycleCard';
import {
  ClipboardCheck, Wrench, CheckCircle, Database, RefreshCw,
  Bike, Tag, FileText, AlertCircle, Loader2, Calendar,
} from 'lucide-react';
import { workshopService } from '../../services/workshopService';

/**
 * Local repair queue view with pending/finished tabs.
 * Filters and sorts the queue by status and timestamp, rendering
 * a MotorcycleCard for each entry.
 */
function LocalQueueView() {
  const { queue } = useWorkshop();
  const [tab, setTab] = useState('pending');

  const pending  = queue.filter(q => q.status === 'pending').sort((a, b) => a.timestamp - b.timestamp);
  const finished = queue.filter(q => q.status === 'finished').sort((a, b) => b.timestamp - a.timestamp);
  const displayed = tab === 'pending' ? pending : finished;

  return (
    <div className="space-y-4">
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit transition-colors duration-300">
        <button
          onClick={() => setTab('pending')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
            tab === 'pending'
              ? 'bg-white dark:bg-gray-700 text-auteco-red shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-auteco-red hover:bg-gray-200 dark:hover:bg-gray-700/50'
          }`}
        >
          <Wrench className="w-4 h-4" />
          En Reparación ({pending.length})
        </button>
        <button
          onClick={() => setTab('finished')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
            tab === 'finished'
              ? 'bg-white dark:bg-gray-700 text-auteco-red shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-auteco-red hover:bg-gray-200 dark:hover:bg-gray-700/50'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Listos ({finished.length})
        </button>
      </div>

      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
          <ClipboardCheck className="w-14 h-14 mb-3 text-gray-300 dark:text-gray-700" />
          <p className="font-semibold text-base">
            {tab === 'pending' ? 'Sin motocicletas en reparación' : 'Sin motos listas'}
          </p>
          <p className="text-sm mt-1">
            {tab === 'pending'
              ? 'Las motos de la cola de recepción aparecerán aquí.'
              : 'Las motos reparadas aparecerán aquí para entrega.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayed.map(entry => (
            <MotorcycleCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Motorcycle card for displaying intake records from Supabase with model, plate, and observations. */
function MotoMecanicoCard({ moto }) {
  /** Format intake date as a localized short date string. */
  const fechaFormateada = moto.fecha_ingreso
    ? new Date(moto.fecha_ingreso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="group relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-auteco-red rounded-l-2xl" />
      <div className="p-5 pl-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 flex items-center justify-center shrink-0 mt-0.5">
            <Bike className="w-5 h-5 text-auteco-red" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-black text-gray-900 dark:text-white text-base leading-tight truncate">{moto.marca_modelo}</h3>
            {fechaFormateada && (
              <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                <Calendar className="w-3 h-3" />
                {fechaFormateada}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Placa</span>
          <span className="ml-auto px-3 py-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-black rounded-lg tracking-widest uppercase">
            {moto.placa}
          </span>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 mb-4" />

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5" />
            Observaciones
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3 py-2.5 border border-gray-100 dark:border-gray-800">
            {moto.observaciones
              ? `"${moto.observaciones}"`
              : <span className="not-italic text-gray-400 dark:text-gray-500">Sin observaciones registradas</span>
            }
          </p>
        </div>
      </div>
    </div>
  );
}

/** Read-only list of motorcycle intake records fetched from Supabase with auto-refresh. */
function SupabaseIngresosList() {
  const [motos, setMotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  /**
   * Fetches intake records from Supabase via the BFF.
   * Updates local state with the received data and records the
   * last refresh timestamp. Handles network errors and updates
   * loading/error states accordingly.
   * @returns {Promise<void>}
   */
  const fetchMotos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workshopService.getMotosMecanico();
      setMotos(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMotos(); }, [fetchMotos]);

  const horaRefresh = lastRefresh.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin mb-3 text-auteco-red" />
        <p className="text-sm font-medium">Consultando Supabase...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-2xl text-center px-6">
        <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
        <p className="font-bold text-red-600 dark:text-red-400">Error de conexión</p>
        <p className="text-sm text-red-500 dark:text-red-400 mt-1 mb-4">{error}</p>
        <button onClick={fetchMotos} className="flex items-center gap-2 px-5 py-2 bg-auteco-red text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors">
          <RefreshCw className="w-4 h-4" /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span>
            {motos.length} {motos.length === 1 ? 'moto registrada' : 'motos registradas'} · Actualizado: {horaRefresh}
          </span>
        </div>
        <button onClick={fetchMotos} className="flex items-center gap-1.5 text-xs font-semibold text-auteco-blue dark:text-blue-400 hover:text-auteco-red transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar
        </button>
      </div>

      {motos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <Database className="w-14 h-14 text-gray-300 dark:text-gray-700 mb-3" />
          <p className="font-semibold text-gray-400 dark:text-gray-500">No hay motos registradas</p>
          <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">Usa el módulo de Recepción para ingresar motos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {motos.map(moto => <MotoMecanicoCard key={moto.id} moto={moto} />)}
        </div>
      )}
    </div>
  );
}

export default function MechanicDashboard() {
  const [mainTab, setMainTab] = useState('supabase');

  return (
    <div className="space-y-6">
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit transition-colors duration-300">
        <button
          onClick={() => setMainTab('supabase')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            mainTab === 'supabase'
              ? 'bg-white dark:bg-gray-700 text-auteco-blue dark:text-blue-300 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-auteco-blue dark:hover:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-700/50'
          }`}
        >
          <Database className="w-4 h-4" />
          Motos Ingresadas
        </button>
        <button
          onClick={() => setMainTab('local')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            mainTab === 'local'
              ? 'bg-white dark:bg-gray-700 text-auteco-red shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-auteco-red dark:hover:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-700/50'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Cola de Trabajo
        </button>
      </div>

      {mainTab === 'supabase' ? (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
          <SupabaseIngresosList />
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
          <LocalQueueView />
        </div>
      )}
    </div>
  );
}
