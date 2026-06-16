import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import * as workshopService from '../services/workshopService.js'

const router = Router()

router.use(requireAuth)

// GET /workshop/motorcycles
router.get('/motorcycles', async (req, res) => {
  try {
    const data = await workshopService.getMotorcycles()
    res.json(data)
  } catch (err) {
    console.error('[workshop] GET /motorcycles', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /workshop/mechanic-queue
router.get('/mechanic-queue', async (req, res) => {
  try {
    const data = await workshopService.getMechanicQueue()
    res.json(data)
  } catch (err) {
    console.error('[workshop] GET /mechanic-queue', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /workshop/ingreso
router.post('/ingreso', async (req, res) => {
  const { cliente, documento_identidad, marca_modelo, placa, kilometraje } = req.body
  if (!cliente || !documento_identidad || !marca_modelo || !placa || !kilometraje) {
    return res.status(400).json({ error: 'cliente, documento_identidad, marca_modelo, placa y kilometraje son requeridos' })
  }
  try {
    const row = await workshopService.createIngreso(req.body)
    res.status(201).json(row)
  } catch (err) {
    console.error('[workshop] POST /ingreso', err)
    res.status(500).json({ error: err.message })
  }
})

// PUT /workshop/ingreso/:id
router.put('/ingreso/:id', async (req, res) => {
  try {
    const data = await workshopService.updateIngreso(req.params.id, req.body)
    res.json(data)
  } catch (err) {
    console.error('[workshop] PUT /ingreso/:id', err)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /workshop/ingreso/:id
router.delete('/ingreso/:id', async (req, res) => {
  try {
    await workshopService.deleteIngreso(req.params.id)
    res.status(204).end()
  } catch (err) {
    console.error('[workshop] DELETE /ingreso/:id', err)
    res.status(500).json({ error: err.message })
  }
})

// PUT /workshop/motorcycles/:id
router.put('/motorcycles/:id', async (req, res) => {
  const { status } = req.body
  if (!status) {
    return res.status(400).json({ error: 'status es requerido' })
  }
  try {
    const data = await workshopService.updateMotorcycleStatus(req.params.id, status)
    res.json(data)
  } catch (err) {
    console.error('[workshop] PUT /motorcycles/:id', err)
    res.status(500).json({ error: err.message })
  }
})

// PUT /workshop/motorcycles/:id/complete
router.put('/motorcycles/:id/complete', async (req, res) => {
  try {
    const data = await workshopService.completarMoto(req.params.id)
    res.json(data)
  } catch (err) {
    console.error('[workshop] PUT /motorcycles/:id/complete', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /workshop/motorcycles/:id/whatsapp
router.post('/motorcycles/:id/whatsapp', async (req, res) => {
  try {
    const data = await workshopService.notifyWhatsApp(req.params.id, req.body.parts)
    if (!data.success) {
      return res.status(400).json({ error: data.message })
    }
    res.json(data)
  } catch (err) {
    console.error('[workshop] POST /motorcycles/:id/whatsapp', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
