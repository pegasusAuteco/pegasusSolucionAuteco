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
