import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, Wrench, Clock, CheckCircle2,
  Upload, FilePlus2, Construction, Zap, AlertCircle, X, CheckCheck
} from 'lucide-react';

const METRIC_CARDS = [
  { label: 'Motos en Reparación', value: '–', icon: Wrench, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  { label: 'Listas para Entrega', value: '–', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
  { label: 'Tiempo Promedio', value: '–', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { label: 'Eficiencia del Taller', value: '–', icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
];

const MANUAL_LIST = [
  { name: 'Benelli 180S — Manual Técnico.pdf', size: '4.2 MB', date: 'Ene 2024' },
  { name: 'TVS Apache 200RR — Guía de Mantenimiento.pdf', size: '3.8 MB', date: 'Feb 2024' },
  { name: 'Ninja 400 — Diagnóstico Electrónico.pdf', size: '5.1 MB', date: 'Mar 2024' },
];

const AdminMetrics = () => {
  const fileInputRef = useRef(null);
  const [uploadedManuals, setUploadedManuals] = useState(MANUAL_LIST);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      showToast('Solo se permiten archivos PDF.', 'error');
      return;
    }
    const newManual = {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      date: new Date().toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }),
    };
    setUploadedManuals(prev => [newManual, ...prev]);
    showToast(`Manual "${file.name}" añadido exitosamente.`);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col p-6 min-h-full relative">

      {/* Toast notification */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-medium ${
            toast.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-gray-900 dark:bg-white dark:text-gray-900 text-white'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCheck className="w-4 h-4 text-green-400 dark:text-green-600" />}
          {toast.msg}
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-auteco-blue dark:text-gray-100 tracking-tight">
            MÉTRICAS
          </h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Panel exclusivo de administración</p>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 px-3 py-1.5 rounded-full text-xs font-semibold">
          <Construction className="w-3.5 h-3.5" />
          En proceso
        </div>
      </div>

      {/* In-Progress Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-r from-gray-900 to-gray-800 dark:from-auteco-red/20 dark:to-gray-900 rounded-2xl p-5 mb-6 border border-gray-200 dark:border-auteco-red/30"
      >
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-auteco-red/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-auteco-red/20 dark:bg-auteco-red/30 rounded-xl">
            <Zap className="w-6 h-6 text-auteco-red" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Sistema de Análisis en Desarrollo</p>
            <p className="text-gray-400 text-xs mt-0.5">Las métricas en tiempo real estarán disponibles en la próxima versión de la plataforma.</p>
          </div>
        </div>
        <div className="mt-4 w-full bg-gray-700 rounded-full h-1.5 relative z-10">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '62%' }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
            className="h-1.5 rounded-full bg-gradient-to-r from-auteco-red to-orange-400"
          />
        </div>
        <p className="text-right text-xs text-gray-500 mt-1 relative z-10">62% completado</p>
      </motion.div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {METRIC_CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 + 0.4 }}
              className="relative bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 rounded-xl p-4 overflow-hidden"
            >
              {/* Blurred overlay — "coming soon" effect */}
              <div className="absolute inset-0 backdrop-blur-[2px] bg-white/40 dark:bg-gray-950/40 rounded-xl z-10 flex items-center justify-center">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                  Próximamente
                </span>
              </div>
              <div className={`w-8 h-8 ${card.bg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{card.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Chart Placeholder */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="relative bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 mb-6 overflow-hidden"
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-300">Rendimiento Mensual</h3>
        </div>
        <div className="flex items-end gap-2 h-24">
          {[35, 55, 42, 70, 60, 80, 65, 90, 50, 75, 40, 62].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-gradient-to-t from-auteco-red/30 to-auteco-red/60 opacity-40"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-2 uppercase tracking-widest">Ene — Dic (datos simulados)</p>
        {/* Blur overlay */}
        <div className="absolute inset-0 backdrop-blur-[3px] bg-white/30 dark:bg-gray-950/30 rounded-2xl flex items-center justify-center">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-full shadow text-sm text-gray-500 dark:text-gray-400">
            <Construction className="w-4 h-4 text-amber-500" />
            Gráficas en desarrollo
          </div>
        </div>
      </motion.div>

      {/* Manual Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <FilePlus2 className="w-5 h-5 text-auteco-red" />
            Manuales de Motos
          </h3>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-auteco-red text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-all active:scale-95 shadow-md"
          >
            <Upload className="w-4 h-4" />
            Añadir Manual PDF
          </button>
        </div>

        {/* Manuals list */}
        <div className="space-y-2">
          {uploadedManuals.map((manual, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 group hover:border-auteco-red/40 transition-colors"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="shrink-0 w-8 h-8 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <FilePlus2 className="w-4 h-4 text-auteco-red" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{manual.name}</p>
                  <p className="text-xs text-gray-400">{manual.size} · {manual.date}</p>
                </div>
              </div>
              <button
                onClick={() => setUploadedManuals(prev => prev.filter((_, idx) => idx !== i))}
                className="shrink-0 p-1 opacity-0 group-hover:opacity-100 hover:text-red-500 text-gray-400 transition-all rounded"
                title="Eliminar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {uploadedManuals.length === 0 && (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-6">
              No hay manuales cargados aún.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminMetrics;
