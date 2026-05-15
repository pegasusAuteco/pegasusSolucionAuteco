import { useForm } from 'react-hook-form';
import { useWorkshopStore, MotorcycleEntry } from '../../store/workshopStore';
import { useToastStore } from '../../store/toastStore';
import { ClipboardList, PlusCircle, Save, X } from 'lucide-react';
import { format } from 'date-fns';

interface ReceptionFormData {
  clientName: string;
  clientId: string;
  email: string;
  model: string;
  plate: string;
  mileage: number;
  entryDate: string;
  observations: string;
}

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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReceptionFormData>({
    defaultValues: initialData ? {
      clientName: initialData.clientName,
      clientId: initialData.clientId,
      email: initialData.email || '',
      model: initialData.model,
      plate: initialData.plate,
      mileage: initialData.mileage,
      entryDate: initialData.entryDate || format(new Date(), 'yyyy-MM-dd'),
      observations: initialData.observations,
    } : {
      entryDate: format(new Date(), 'yyyy-MM-dd')
    }
  });
  
  const registerEntry = useWorkshopStore((state) => state.registerEntry);
  const updateEntry = useWorkshopStore((state) => state.updateEntry);
  const addToast = useToastStore((state) => state.addToast);

  const onSubmit = (data: ReceptionFormData) => {
    if (initialData) {
      updateEntry(initialData.id, {
        clientName: data.clientName,
        clientId: data.clientId,
        email: data.email,
        model: data.model,
        plate: data.plate.toUpperCase(),
        mileage: Number(data.mileage),
        entryDate: data.entryDate,
        observations: data.observations,
      });
      addToast('success', 'Registro actualizado correctamente');
      if (onSuccess) onSuccess();
    } else {
      registerEntry({
        clientName: data.clientName,
        clientId: data.clientId,
        email: data.email,
        model: data.model,
        plate: data.plate.toUpperCase(),
        mileage: Number(data.mileage),
        entryDate: data.entryDate,
        observations: data.observations,
      });
      addToast('success', 'Registro guardado correctamente');
      reset({ entryDate: format(new Date(), 'yyyy-MM-dd') });
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 sm:p-8 font-sans transition-colors duration-300">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
        <ClipboardList className="w-6 h-6 text-auteco-red" />
        <h2 className="text-xl font-bold text-auteco-blue dark:text-white tracking-tight">Registro de Ingreso</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Cliente */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Cliente</label>
            <input
              type="text"
              placeholder="Nombre del cliente"
              {...register('clientName', { required: 'El nombre del cliente es requerido' })}
              className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border ${errors.clientName ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-lg focus:ring-2 focus:ring-auteco-red dark:text-white outline-none text-sm transition-colors`}
            />
            {errors.clientName && <p className="text-xs text-red-500">{errors.clientName.message}</p>}
          </div>

          {/* CC/NIT */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">CC/NIT</label>
            <input
              type="text"
              placeholder="Documento"
              {...register('clientId', { required: 'El documento es requerido' })}
              className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border ${errors.clientId ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-lg focus:ring-2 focus:ring-auteco-red dark:text-white outline-none text-sm transition-colors`}
            />
            {errors.clientId && <p className="text-xs text-red-500">{errors.clientId.message}</p>}
          </div>

          {/* Correo */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Correo Electrónico</label>
            <input
              type="email"
              placeholder="usuario@dominio.com"
              {...register('email', { 
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Formato de correo inválido' }
              })}
              className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border ${errors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-lg focus:ring-2 focus:ring-auteco-red dark:text-white outline-none text-sm transition-colors`}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          {/* Fecha de ingreso */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Fecha de Ingreso</label>
            <input
              type="date"
              {...register('entryDate', { required: 'La fecha es requerida' })}
              className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border ${errors.entryDate ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-lg focus:ring-2 focus:ring-auteco-red dark:text-white outline-none text-sm transition-colors`}
            />
            {errors.entryDate && <p className="text-xs text-red-500">{errors.entryDate.message}</p>}
          </div>

          {/* Marca / Modelo */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Marca / Modelo</label>
            <select
              {...register('model', { required: 'La marca/modelo es requerida' })}
              className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border ${errors.model ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-lg focus:ring-2 focus:ring-auteco-red dark:text-white outline-none text-sm transition-colors`}
            >
              <option value="">Seleccione una marca...</option>
              {MODELS.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            {errors.model && <p className="text-xs text-red-500">{errors.model.message}</p>}
          </div>

          {/* Placa */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Placa</label>
            <input
              type="text"
              placeholder="Ej: ABC12D"
              {...register('plate', { required: 'La placa es requerida' })}
              className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border ${errors.plate ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-lg focus:ring-2 focus:ring-auteco-red dark:text-white outline-none text-sm uppercase transition-colors`}
            />
            {errors.plate && <p className="text-xs text-red-500">{errors.plate.message}</p>}
          </div>

          {/* Kilometraje */}
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Kilometraje Actual</label>
            <div className="relative">
              <input
                type="number"
                placeholder="0"
                min="0"
                {...register('mileage', { 
                  required: 'El kilometraje es requerido',
                  min: { value: 0, message: 'Debe ser un valor positivo' },
                  valueAsNumber: true
                })}
                className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border ${errors.mileage ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-lg focus:ring-2 focus:ring-auteco-red dark:text-white outline-none text-sm transition-colors`}
              />
              <span className="absolute right-4 top-2.5 text-gray-400 dark:text-gray-500 font-medium text-sm">km</span>
            </div>
            {errors.mileage && <p className="text-xs text-red-500">{errors.mileage.message}</p>}
          </div>

          {/* Observaciones */}
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Observaciones</label>
            <textarea
              rows={4}
              maxLength={500}
              placeholder="Detalle el estado inicial de la moto..."
              {...register('observations', { 
                required: 'Las observaciones son requeridas',
                maxLength: { value: 500, message: 'Máximo 500 caracteres' }
              })}
              className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border ${errors.observations ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-lg focus:ring-2 focus:ring-auteco-red dark:text-white outline-none text-sm resize-none transition-colors`}
            />
            {errors.observations && <p className="text-xs text-red-500">{errors.observations.message}</p>}
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
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-auteco-red hover:bg-red-700 text-white font-bold text-lg rounded-xl shadow-lg transition-all active:scale-[0.98] hover:shadow-xl"
          >
            <PlusCircle className="w-6 h-6" />
            Registrar Ingreso
          </button>
        )}
      </form>
    </div>
  );
}
