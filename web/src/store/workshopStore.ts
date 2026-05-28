import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Domain types ──────────────────────────────────────────────────────────────

export interface Part {
  id: string
  name: string
  quantity: number
}

export interface MotorcycleEntry {
  id: string
  clientName: string
  clientId: string
  phone: string
  email: string
  entryDate: string
  model: string
  plate: string
  mileage: number
  observations: string
  mechanicNotes?: string
  timestamp: number
  status: 'pending' | 'finished'
  parts: Part[]
}

// ── Store shape ───────────────────────────────────────────────────────────────

export interface WorkshopState {
  queue: MotorcycleEntry[]
  activeRepairId: string | null
  setActiveRepairId: (id: string | null) => void
  registerEntry: (entry: Omit<MotorcycleEntry, 'id' | 'timestamp' | 'parts' | 'status'>) => void
  updateEntry: (id: string, data: Partial<Omit<MotorcycleEntry, 'id' | 'timestamp' | 'parts' | 'status'>>) => void
  addPartToEntry: (entryId: string, part: Omit<Part, 'id'>) => void
  removePartFromEntry: (entryId: string, partId: string) => void
  removeEntry: (id: string) => void
  finishRepair: (id: string) => void
}

// ── localStorage migration ────────────────────────────────────────────────────
// The previous Context implementation saved data as { queue, activeRepairId }.
// Zustand persist expects { state: { queue, activeRepairId }, version }.
// This function runs once at module load and rewrites the stored item so that
// Zustand can rehydrate the existing queue without data loss.
function migrateContextFormat(): void {
  const key = 'workshop-storage'
  try {
    const item = localStorage.getItem(key)
    if (!item) return
    const parsed = JSON.parse(item)
    // Already in Zustand persist format — nothing to do.
    if (parsed?.state !== undefined) return
    // Context format detected: { queue: [...], activeRepairId: "..." }
    if (Array.isArray(parsed?.queue)) {
      localStorage.setItem(key, JSON.stringify({
        state: { queue: parsed.queue, activeRepairId: parsed.activeRepairId ?? null },
        version: 0,
      }))
    }
  } catch {
    // Ignore parse errors — the store will hydrate with the default empty state.
  }
}

migrateContextFormat()

// ── Store ─────────────────────────────────────────────────────────────────────
// Uses zustand/persist so the queue survives page refreshes.
// The storage key matches the one used by the previous implementations,
// ensuring a transparent migration for existing users.

export const useWorkshopStore = create<WorkshopState>()(
  persist(
    (set) => ({
      queue: [],
      activeRepairId: null,

      setActiveRepairId: (id) => set({ activeRepairId: id }),

      // Appends a new entry with a generated id, current timestamp, and empty parts list.
      registerEntry: (data) =>
        set((s) => ({
          queue: [
            ...s.queue,
            { ...data, id: crypto.randomUUID(), timestamp: Date.now(), status: 'pending', parts: [] },
          ],
        })),

      updateEntry: (id, data) =>
        set((s) => ({ queue: s.queue.map((e) => (e.id === id ? { ...e, ...data } : e)) })),

      addPartToEntry: (entryId, part) =>
        set((s) => ({
          queue: s.queue.map((e) =>
            e.id === entryId
              ? { ...e, parts: [...e.parts, { ...part, id: crypto.randomUUID() }] }
              : e
          ),
        })),

      removePartFromEntry: (entryId, partId) =>
        set((s) => ({
          queue: s.queue.map((e) =>
            e.id === entryId ? { ...e, parts: e.parts.filter((p) => p.id !== partId) } : e
          ),
        })),

      // Clears activeRepairId if the removed entry was the active one.
      removeEntry: (id) =>
        set((s) => ({
          queue: s.queue.filter((e) => e.id !== id),
          activeRepairId: s.activeRepairId === id ? null : s.activeRepairId,
        })),

      // Marks the entry as finished and clears it from the active slot.
      finishRepair: (id) =>
        set((s) => ({
          queue: s.queue.map((e) => (e.id === id ? { ...e, status: 'finished' } : e)),
          activeRepairId: s.activeRepairId === id ? null : s.activeRepairId,
        })),
    }),
    { name: 'workshop-storage' }
  )
)
