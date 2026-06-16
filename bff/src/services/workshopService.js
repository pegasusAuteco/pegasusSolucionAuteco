import supabase from './supabaseClient.js'

export async function getMotorcycles() {
  const { data, error } = await supabase
    .from('ingresos_taller')
    .select('*')
    .order('fecha_ingreso', { ascending: false })
  if (error) throw error
  return data
}

// Usa la vista vista_mecanicos_ingresos (sin PII: sin cliente, cédula, correo).
export async function getMechanicQueue() {
  const { data, error } = await supabase
    .from('vista_mecanicos_ingresos')
    .select('*')
    .eq('estado', 'en_cola')
  if (error) throw error
  return data
}

export async function createIngreso(data) {
  const { data: row, error } = await supabase
    .from('ingresos_taller')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return row
}

// Requiere columna `estado VARCHAR(50)` en ingresos_taller (ver schema_usuarios.sql Camino 1).
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

export async function completarMoto(id) {
  return updateMotorcycleStatus(id, 'completada')
}

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

export async function deleteIngreso(id) {
  const { error } = await supabase
    .from('ingresos_taller')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function notifyWhatsApp(id, parts = []) {
  // 1. Obtener la info completa del ingreso
  const { data: ingreso, error } = await supabase
    .from('ingresos_taller')
    .select('*')
    .eq('id', id)
    .single()
    
  if (error) throw error
  if (!ingreso) throw new Error('Ingreso no encontrado')

  // 2. Construir el payload para n8n
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
    console.warn('N8N_WEBHOOK_URL no está configurada, ignorando envío')
    return { success: false, message: 'Webhook URL no configurada' }
  }

  // 3. Enviar a n8n
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
