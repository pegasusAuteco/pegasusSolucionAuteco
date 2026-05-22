import { supabase } from '../lib/supabase'

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Datos que se envían a la tabla ingresos_taller (columnas del schema) */
export interface IngresoTaller {
  cliente: string
  documento_identidad: string
  correo_electronico?: string
  fecha_ingreso: string
  marca_modelo: string
  placa: string
  kilometraje: number
  observaciones: string
}

/**
 * Vista del mecánico: solo marca_modelo, placa y observaciones.
 * Respeta la arquitectura definida en schema_usuarios.sql (vista_mecanicos_ingresos).
 */
export interface MotoMecanico {
  id: string
  marca_modelo: string
  placa: string
  observaciones: string | null
  fecha_ingreso?: string
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

export const workshopService = {
  /**
   * Registra el ingreso de una moto en Supabase.
   * Llamado desde ReceptionForm al hacer submit.
   */
  createIngreso: async (data: IngresoTaller): Promise<void> => {
    const { error } = await supabase.from('ingresos_taller').insert([data])
    if (error) {
      console.error('[workshopService] Error al insertar ingreso:', error.message)
      throw new Error(error.message)
    }
  },

  /**
   * Devuelve los ingresos para el mecánico.
   * Solo expone: id, marca_modelo, placa, observaciones, fecha_ingreso.
   * Equivale al endpoint GET /api/mecanicos/motos del schema.
   */
  getMotosMecanico: async (): Promise<MotoMecanico[]> => {
    const { data, error } = await supabase
      .from('ingresos_taller')
      .select('id, marca_modelo, placa, observaciones, fecha_ingreso')
      .order('fecha_ingreso', { ascending: false })

    if (error) {
      console.error('[workshopService] Error al obtener motos:', error.message)
      throw new Error(error.message)
    }
    return data ?? []
  },
}
