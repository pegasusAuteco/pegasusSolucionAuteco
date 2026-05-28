// ── useWorkshop ───────────────────────────────────────────────────────────────
// Thin wrapper over useWorkshopStore that preserves the same call-site API
// as the previous Context implementation, so no workshop component needs to change.
// Types are re-exported from the store so consumers have a single import point.

import { useWorkshopStore } from '@store/workshopStore'

export type { MotorcycleEntry, Part, WorkshopState as WorkshopContextType } from '@store/workshopStore'

export function useWorkshop() {
  return useWorkshopStore()
}
