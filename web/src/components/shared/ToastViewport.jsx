import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { useToastStore } from '@store/toastStore'

const toneClasses = {
  success: 'border-green-200 bg-green-50 text-green-700',
  error: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
}

const iconByType = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
}

export default function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = iconByType[toast.type]
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2 rounded-xl border px-3 py-3 shadow-lg ${toneClasses[toast.type]}`}
            role="status"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm leading-5">{toast.message}</p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="ml-auto rounded p-1 opacity-70 hover:opacity-100"
              aria-label="Cerrar notificación"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
