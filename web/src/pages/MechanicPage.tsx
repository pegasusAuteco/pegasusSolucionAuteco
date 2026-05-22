import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench, RefreshCw, Bike, Tag, FileText,
  AlertCircle, Loader2, Calendar, LogOut,
} from 'lucide-react';
import { useAuthStore } from '@store/authStore';
import { useLogout } from '@hooks/useAuth';
import { workshopService, type MotoMecanico } from '../services/workshopService';

// ─── Tarjeta del mecánico (solo 3 campos) ────────────────────────────────────
function MotoCard({ moto }: { moto: MotoMecanico }) {
  const fecha = moto.fecha_ingreso
    ? new Date(moto.fecha_ingreso).toLocaleDateString('es-CO', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : null;

  return (
    <div className="relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-auteco-red rounded-l-2xl" />
      <div className="p-5 pl-6">
        {/* Modelo */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 flex items-center justify-center shrink-0">
            <Bike className="w-5 h-5 text-auteco-red" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-black text-gray-900 dark:text-white text-base leading-tight truncate">
              {moto.marca_modelo}
            </h3>
            {fecha && (
              <span className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                <Calendar className="w-3 h-3" /> {fecha}
              </span>
            )}
          </div>
        </div>

        {/* Placa */}
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Placa</span>
          <span className="ml-auto px-3 py-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-black rounded-lg tracking-widest uppercase">
            {moto.placa}
          </span>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 mb-4" />

        {/* Observaciones */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5" /> Observaciones
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3 py-2.5 border border-gray-100 dark:border-gray-800">
            {moto.observaciones
              ? `"${moto.observaciones}"`
              : <span className="not-italic text-gray-400">Sin observaciones registradas</span>
            }
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Lista de motos desde Supabase ───────────────────────────────────────────
function MechanicMotoList() {
  const [motos, setMotos] = useState<MotoMecanico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchMotos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workshopService.getMotosMecanico();
      setMotos(data);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMotos(); }, [fetchMotos]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
      <Loader2 className="w-10 h-10 animate-spin mb-3 text-auteco-red" />
      <p className="text-sm font-medium">Cargando cola de motos...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-2xl text-center px-6">
      <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
      <p className="font-bold text-red-600 dark:text-red-400">Error de conexión</p>
      <p className="text-sm text-red-500 mt-1 mb-4">{error}</p>
      <button onClick={fetchMotos} className="flex items-center gap-2 px-5 py-2 bg-auteco-red text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors">
        <RefreshCw className="w-4 h-4" /> Reintentar
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span>
            {motos.length} {motos.length === 1 ? 'moto asignada' : 'motos asignadas'} ·{' '}
            {lastRefresh.toLocaleTimeString('es-CO')}
          </span>
        </div>
        <button
          onClick={fetchMotos}
          className="flex items-center gap-1.5 text-xs font-semibold text-auteco-blue dark:text-blue-400 hover:text-auteco-red transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {motos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <Wrench className="w-14 h-14 text-gray-300 dark:text-gray-700 mb-3" />
          <p className="font-semibold text-gray-400">Sin motos en cola</p>
          <p className="text-sm text-gray-400 mt-1">El secretario registrará las motos aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {motos.map((m) => <MotoCard key={m.id} moto={m} />)}
        </div>
      )}
    </div>
  );
}

// ─── Página principal del mecánico ───────────────────────────────────────────
export default function MechanicPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const navigate = useNavigate();

  // Si el secretario llega aquí por error, lo redirige a /workshop
  useEffect(() => {
    if (user?.role === 'secretario') navigate('/workshop', { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans flex flex-col transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-5 shadow-sm shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase flex items-center gap-2">
              <Wrench className="w-6 h-6 text-auteco-red" />
              Cola de <span className="text-auteco-red ml-1">Reparación</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">
              Mecánico:{' '}
              <span className="font-bold text-gray-700 dark:text-gray-300">{user?.name}</span>
            </p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-auteco-red transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <MechanicMotoList />
        </div>
      </div>
    </div>
  );
}
