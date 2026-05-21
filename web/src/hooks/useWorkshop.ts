import { useContext } from 'react';
import { WorkshopContext } from '../contexts/WorkshopContext';

// Re-export types so consumers can import from a single place
export type { MotorcycleEntry, Part, WorkshopContextType } from '../contexts/WorkshopContext';

export function useWorkshop() {
  const context = useContext(WorkshopContext);
  if (context === undefined) {
    throw new Error('useWorkshop must be used within a WorkshopProvider');
  }
  return context;
}
