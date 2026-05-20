import React from 'react';
import { MotorcycleEntry } from '../../store/workshopStore';
import { FileText, X, Printer, CheckCircle } from 'lucide-react';

interface InvoiceModalProps {
  entry: MotorcycleEntry;
  onClose: () => void;
}

export default function InvoiceModal({ entry, onClose }: InvoiceModalProps) {
  // Costos ficticios
  const BASE_LABOR_COST = 50000;
  const PART_COST = 25000;

  const totalPartsCost = entry.parts.reduce((acc, part) => acc + (part.quantity * PART_COST), 0);
  const totalCost = BASE_LABOR_COST + totalPartsCost;
  const iva = totalCost * 0.19;
  const grandTotal = totalCost + iva;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg my-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-auteco-blue px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <h2 className="font-bold text-lg tracking-wider">Factura de Servicio</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Body */}
        <div className="p-8">
          <div className="flex justify-between items-start mb-8 border-b border-gray-100 dark:border-gray-800 pb-6">
            <div>
              <h1 className="text-2xl font-black text-auteco-red uppercase tracking-tighter">PEGASUS</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-widest uppercase mt-0.5">Centro Técnico</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Factura N° {entry.id.substring(0, 8).toUpperCase()}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date().toLocaleDateString('es-CO')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mb-1">Cliente</p>
              <p className="font-semibold text-gray-900 dark:text-white">{entry.clientName}</p>
              <p className="text-gray-600 dark:text-gray-400">CC/NIT: {entry.clientId}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mb-1">Vehículo</p>
              <p className="font-semibold text-gray-900 dark:text-white">{entry.model}</p>
              <p className="text-gray-600 dark:text-gray-400">Placa: {entry.plate}</p>
            </div>
          </div>

          <div className="mb-6">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs uppercase font-semibold border-y border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-3 py-3">Descripción</th>
                  <th className="px-3 py-3 text-center">Cant.</th>
                  <th className="px-3 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                <tr>
                  <td className="px-3 py-3 font-medium">Servicio Técnico / Mano de obra</td>
                  <td className="px-3 py-3 text-center">1</td>
                  <td className="px-3 py-3 text-right font-medium">{formatCurrency(BASE_LABOR_COST)}</td>
                </tr>
                {entry.parts.map((part) => (
                  <tr key={part.id}>
                    <td className="px-3 py-3">{part.name}</td>
                    <td className="px-3 py-3 text-center">{part.quantity}</td>
                    <td className="px-3 py-3 text-right font-medium">{formatCurrency(part.quantity * PART_COST)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal</span>
              <span>{formatCurrency(totalCost)}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>IVA (19%)</span>
              <span>{formatCurrency(iva)}</span>
            </div>
            <div className="flex justify-between items-center text-lg font-black text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-800">
              <span>TOTAL</span>
              <span className="text-auteco-red">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-2 text-green-600 dark:text-green-500 font-bold bg-green-50 dark:bg-green-900/20 py-2 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            Listo para Entrega
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex gap-3">
          <button
            onClick={() => {
              alert('Imprimiendo factura...');
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-auteco-blue text-white font-bold rounded-xl hover:bg-blue-900 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimir Factura
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
