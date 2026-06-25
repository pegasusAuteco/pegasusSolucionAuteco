/**
 * Hook for accessing Workshop context state.
 *
 * Provides queue management, part tracking, and repair lifecycle
 * operations from the WorkshopProvider context.
 */
import { useContext } from 'react';
import { WorkshopContext } from '../contexts/WorkshopContext';

export function useWorkshop() {
  const context = useContext(WorkshopContext);
  if (context === undefined) {
    throw new Error('useWorkshop must be used within a WorkshopProvider');
  }
  return context;
}
