import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/fetch'

const baseURL = import.meta.env.VITE_API_URL || '/api'

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Datos que se envían a la tabla ingresos_taller (columnas del schema) */
export interface IngresoTaller {
  cliente: string
  documento_identidad: string
  celular: string
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
    // 1. Verificamos si la placa ya existe
    const { data: existing, error: checkError } = await supabase
      .from('motorcycles')
      .select('id')
      .eq('plate', data.placa)
      .limit(1)

    if (checkError) {
      console.error('[workshopService] Error al verificar placa:', checkError.message)
      throw new Error('Error validando la placa en la base de datos')
    }

    if (existing && existing.length > 0) {
      throw new Error(`La placa ${data.placa} ya se encuentra registrada en el taller.`)
    }

    // 2. Mapeamos los datos del formulario a las columnas reales de 'motorcycles'
    const dbPayload = {
      client_name: data.cliente,
      client_id: data.documento_identidad,
      phone: data.celular,
      email: data.correo_electronico,
      entry_date: data.fecha_ingreso,
      model: data.marca_modelo,
      plate: data.placa,
      mileage: data.kilometraje,
      observations: data.observaciones,
      status: 'pending'
    }

    const { error } = await supabase.from('motorcycles').insert([dbPayload])
    if (error) {
      console.error('[workshopService] Error al insertar ingreso:', error.message)
      throw new Error(error.message)
    }
  },

  /**
   * Moves a completed repair from 'motorcycles' to 'motorcycles_completed'
   * via an atomic backend RPC call. Throws ApiError on failure.
   */
  completeRepair: async (motorcycleId: string): Promise<void> => {
    await apiFetch<unknown>(
      `${baseURL}/workshop/motorcycles/${motorcycleId}/complete`,
      { method: 'POST' },
    )
  },

  /**
   * Devuelve los ingresos para el mecánico desde Supabase 'motorcycles'.
   */
  getMotosMecanico: async (): Promise<MotoMecanico[]> => {
    const { data, error } = await supabase
      .from('motorcycles')
      .select('id, model, plate, observations, entry_date')
      .order('entry_date', { ascending: false })

    if (error) {
      console.error('[workshopService] Error al obtener motos:', error.message)
      throw new Error(error.message)
    }

    // Mapeamos de vuelta al formato que espera el frontend (MotoMecanico)
    return (data ?? []).map((row: any) => ({
      id: row.id,
      marca_modelo: row.model,
      placa: row.plate,
      observaciones: row.observations,
      fecha_ingreso: row.entry_date
    }))
  },
}
