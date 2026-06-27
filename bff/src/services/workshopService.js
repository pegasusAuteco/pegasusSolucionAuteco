/**
 * Workshop management service for Supabase database operations.
 *
 * Handles CRUD operations for motorcycle intake records (ingresos_taller)
 * and WhatsApp notification integration via n8n webhooks.
 */
import supabase from './supabaseClient.js'

/**
 * Retrieves all workshop intake records ordered by intake date (newest first).
 *
 * @returns {Promise<Array>} List of intake records
 */
export async function getMotorcycles() {
  const { data, error } = await supabase
    .from('ingresos_taller')
    .select('*')
    .order('fecha_ingreso', { ascending: false })
  if (error) throw error
  return data
}

/**
 * Retrieves the mechanic queue from the vista_mecanicos_ingresos view.
 *
 * Uses a database view that excludes PII (no client name, ID, or email).
 * Only returns records with status 'en_cola' (in queue).
 *
 * @returns {Promise<Array>} List of queued intake records
 */
export async function getMechanicQueue() {
  const { data, error } = await supabase
    .from('vista_mecanicos_ingresos')
    .select('*')
    .eq('estado', 'en_cola')
  if (error) throw error
  return data
}

/**
 * Creates a new workshop intake record.
 *
 * @param {object} data - Intake data (cliente, documento_identidad, marca_modelo, placa, kilometraje, etc.)
 * @returns {Promise<object>} The created record
 */
export async function createIngreso(data) {
  const { data: row, error } = await supabase
    .from('ingresos_taller')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return row
}

/**
 * Updates the status of a motorcycle intake record.
 *
 * Requires the 'estado VARCHAR(50)' column in ingresos_taller table.
 *
 * @param {string} id - Record ID
 * @param {string} status - New status value
 * @returns {Promise<object>} The updated record
 */
export async function updateMotorcycleStatus(id, status) {
  const { data, error } = await supabase
    .from('ingresos_taller')
    .update({ estado: status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Marks a motorcycle intake as completed.
 *
 * @param {string} id - Record ID
 * @returns {Promise<object>} The updated record with status 'completada'
 */
export async function completarMoto(id) {
  return updateMotorcycleStatus(id, 'completada')
}

/**
 * Updates a workshop intake record with arbitrary fields.
 *
 * @param {string} id - Record ID
 * @param {object} data - Fields to update
 * @returns {Promise<object>} The updated record
 */
export async function updateIngreso(id, data) {
  const { data: row, error } = await supabase
    .from('ingresos_taller')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return row
}

/**
 * Deletes a workshop intake record.
 *
 * @param {string} id - Record ID
 */
export async function deleteIngreso(id) {
  const { error } = await supabase
    .from('ingresos_taller')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/**
 * Sends a WhatsApp notification via n8n webhook when a motorcycle is ready.
 *
 * Fetches the intake record, builds a structured payload with customer,
 * vehicle, and service details, and posts it to the configured n8n webhook.
 *
 * @param {string} id - Intake record ID
 * @param {Array} [parts=[]] - List of parts used in the service
 * @returns {Promise<{success: boolean, payload?: object, message?: string}>}
 */
export async function notifyWhatsApp(id, parts = []) {
  // 1. Fetch the complete intake record
  const { data: ingreso, error } = await supabase
    .from('ingresos_taller')
    .select('*')
    .eq('id', id)
    .single()
    
  if (error) throw error
  if (!ingreso) throw new Error('Ingreso no encontrado')

  // 2. Build the n8n webhook payload
  const payload = {
    event: 'motorcycle_ready',
    customer: {
      name: ingreso.cliente,
      phone: ingreso.celular || '', 
      id_document: ingreso.documento_identidad,
      email: ingreso.correo_electronico || ''
    },
    vehicle: {
      plate: ingreso.placa,
      model: ingreso.marca_modelo,
      mileage: ingreso.kilometraje
    },
    details: {
      observations: ingreso.observaciones,
      mechanic_notes: ingreso.notas_mecanico || '',
      parts: parts || []
    }
  }

  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL
  if (!n8nWebhookUrl) {
    console.warn('N8N_WEBHOOK_URL not configured, skipping send')
    return { success: false, message: 'Webhook URL no configurada' }
  }

  // 3. Send to n8n
  const response = await fetch(n8nWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error('Error al enviar webhook a n8n: ' + response.statusText)
  }

  return { success: true, payload }
}
