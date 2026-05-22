import { useState } from 'react';
import { z } from 'zod';
import { useWorkshop, MotorcycleEntry } from '@hooks/useWorkshop';
import { useToastStore } from '../../store/toastStore';
import { ClipboardList, PlusCircle, Save, X, Loader2 } from 'lucide-react';
import { getLocalISODate } from '../../utils/dates';
import { workshopService } from '../../services/workshopService';

const receptionSchema = z.object({
  clientName: z.string().min(1, 'El nombre del cliente es requerido'),
  clientId: z.string().min(1, 'El documento es requerido'),
  email: z.string().email('Formato de correo inválido').or(z.literal('')).optional(),
  entryDate: z.string().min(1, 'La fecha es requerida'),
  model: z.string().min(1, 'La marca/modelo es requerida'),
  plate: z.string().min(1, 'La placa es requerida'),
  mileage: z.number({ invalid_type_error: 'El kilometraje es requerido' }).min(0, 'Debe ser un valor positivo'),
  observations: z.string().min(1, 'Las observaciones son requeridas').max(500, 'Máximo 500 caracteres'),
});

type ReceptionFormData = z.infer<typeof receptionSchema>;

const MODELS = [
  'Advance R 110',
  'Agility 125',
  'Agility GO',
  'Benelli 180S CBS',
  'Benelli Imperiale 400',
  'MRX 150 Camo Pro CBS',
  'MRX Arizona ABS',
  'Ninja 400',
  'TVS Apache 200RR FI',
  'TVS Raider 125',
  'TVS Sport 100',
  'Zontes 368G',
];

interface ReceptionFormProps {
  initialData?: MotorcycleEntry;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ReceptionForm({ initialData, onSuccess, onCancel }: ReceptionFormProps) {
  const [formData, setFormData] = useState<ReceptionFormData>({
    clientName: initialData?.clientName ?? '',
    clientId: initialData?.clientId ?? '',
    email: initialData?.email ?? '',
    entryDate: initialData?.entryDate ?? getLocalISODate(),
    model: initialData?.model ?? '',
    plate: initialData?.plate ?? '',
    mileage: initialData?.mileage ?? ('' as unknown as number),
    observations: initialData?.observations ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { registerEntry, updateEntry } = useWorkshop();
  const addToast = useToastStore((state) => state.addToast);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'mileage' ? (value === '' ? ('' as unknown as number) : Number(value)) : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = receptionSchema.safeParse(formData);
    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = String(issue.path[0]);
        if (!formattedErrors[key]) formattedErrors[key] = issue.message;
      });
      setErrors(formattedErrors);
      return;
    }

    const data = result.data;
    setIsSubmitting(true);

    if (initialData) {
      try {
        updateEntry(initialData.id, {
          clientName: data.clientName,
          clientId: data.clientId,
          email: data.email || '',
          model: data.model,
          plate: data.plate.toUpperCase(),
          mileage: data.mileage,
          entryDate: data.entryDate,
          observations: data.observations,
        });
        addToast('success', 'Registro actualizado correctamente');
        if (onSuccess) onSuccess();
      } finally {
        setIsSubmitting(false);
      }
    } else {
      try {
        // 1. Guardar en Supabase (fuente de la verdad)
        await workshopService.createIngreso({
          cliente: data.clientName,
          documento_identidad: data.clientId,
          correo_electronico: data.email || undefined,
          fecha_ingreso: data.entryDate,
          marca_modelo: data.model,
          placa: data.plate.toUpperCase(),
          kilometraje: data.mileage,
          observaciones: data.observations,
        });

        // 2. Actualizar estado local para la cola del mecánico
        registerEntry({
          clientName: data.clientName,
          clientId: data.clientId,
          email: data.email || '',
          model: data.model,
          plate: data.plate.toUpperCase(),
          mileage: data.mileage,
          entryDate: data.entryDate,
          observations: data.observations,
        });

        addToast('success', '✅ Moto registrada y guardada en Supabase');
        setFormData({
          clientName: '',
          clientId: '',
          email: '',
          entryDate: getLocalISODate(),
          model: '',
          plate: '',
          mileage: '' as unknown as number,
          observations: '',
        });
        setErrors({});
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        addToast('error', `❌ Error al guardar en Supabase: ${msg}`);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const inputClass = (field: string) =>
    `w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border ${
      errors[field] ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
    } rounded-lg focus:ring-2 focus:ring-auteco-red dark:text-white outline-none text-sm transition-colors`;

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 sm:p-8 font-sans transition-colors duration-300">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
        <ClipboardList className="w-6 h-6 text-auteco-red" />
        <h2 className="text-xl font-bold text-auteco-blue dark:text-white tracking-tight">Registro de Ingreso</h2>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Cliente */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Cliente</label>
            <input
              type="text"
              name="clientName"
              value={formData.clientName}
              onChange={handleChange}
              placeholder="Nombre del cliente"
              className={inputClass('clientName')}
            />
            {errors.clientName && <p className="text-xs text-red-500">{errors.clientName}</p>}
          </div>

          {/* CC/NIT */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">CC/NIT</label>
            <input
              type="text"
              name="clientId"
              value={formData.clientId}
              onChange={handleChange}
              placeholder="Documento"
              className={inputClass('clientId')}
            />
            {errors.clientId && <p className="text-xs text-red-500">{errors.clientId}</p>}
          </div>

          {/* Correo */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Correo Electrónico</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="usuario@dominio.com"
              className={inputClass('email')}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>

          {/* Fecha de ingreso */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Fecha de Ingreso</label>
            <input
              type="date"
              name="entryDate"
              value={formData.entryDate}
              onChange={handleChange}
              className={inputClass('entryDate')}
            />
            {errors.entryDate && <p className="text-xs text-red-500">{errors.entryDate}</p>}
          </div>

          {/* Marca / Modelo */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Marca / Modelo</label>
            <select
              name="model"
              value={formData.model}
              onChange={handleChange}
              className={inputClass('model')}
            >
              <option value="">Seleccione una marca...</option>
              {MODELS.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            {errors.model && <p className="text-xs text-red-500">{errors.model}</p>}
          </div>

          {/* Placa */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Placa</label>
            <input
              type="text"
              name="plate"
              value={formData.plate}
              onChange={handleChange}
              placeholder="Ej: ABC12D"
              className={`${inputClass('plate')} uppercase`}
            />
            {errors.plate && <p className="text-xs text-red-500">{errors.plate}</p>}
          </div>

          {/* Kilometraje */}
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Kilometraje Actual</label>
            <div className="relative">
              <input
                type="number"
                name="mileage"
                value={formData.mileage as unknown as string}
                onChange={handleChange}
                placeholder="0"
                min="0"
                className={inputClass('mileage')}
              />
              <span className="absolute right-4 top-2.5 text-gray-400 dark:text-gray-500 font-medium text-sm">km</span>
            </div>
            {errors.mileage && <p className="text-xs text-red-500">{errors.mileage}</p>}
          </div>

          {/* Observaciones */}
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Observaciones</label>
            <textarea
              name="observations"
              value={formData.observations}
              onChange={handleChange}
              rows={4}
              maxLength={500}
              placeholder="Detalle el estado inicial de la moto..."
              className={`${inputClass('observations')} resize-none`}
            />
            {errors.observations && <p className="text-xs text-red-500">{errors.observations}</p>}
          </div>
        </div>

        {initialData ? (
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold text-lg rounded-xl transition-all"
            >
              <X className="w-6 h-6" />
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-auteco-red hover:bg-red-700 text-white font-bold text-lg rounded-xl shadow-lg transition-all active:scale-[0.98] hover:shadow-xl"
            >
              <Save className="w-6 h-6" />
              Guardar Cambios
            </button>
          </div>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-auteco-red hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl shadow-lg transition-all active:scale-[0.98] hover:shadow-xl"
          >
            {isSubmitting ? (
              <><Loader2 className="w-6 h-6 animate-spin" /> Guardando...</>
            ) : (
              <><PlusCircle className="w-6 h-6" /> Registrar Ingreso</>
            )}
          </button>
        )}
      </form>
    </div>
  );
}
