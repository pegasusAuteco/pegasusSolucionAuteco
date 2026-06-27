/**
 * Hook for accessing Workshop context state.
 *
 * Provides queue management, part tracking, and repair lifecycle
 * operations from the WorkshopProvider context.
 */
import { useContext } from 'react';
import { WorkshopContext } from '../contexts/WorkshopContext';

/**
 * Access the workshop context from any child component.
 *
 * Must be used inside a WorkshopProvider. Throws if used outside the provider.
 *
 * @returns {{ queue: Array, activeRepairId: string|null, setActiveRepairId: Function,
 *   registerEntry: Function, updateEntry: Function, addPartToEntry: Function,
 *   removePartFromEntry: Function, removeEntry: Function, finishRepair: Function }}
 *   The workshop context value.
 */
export function useWorkshop() {
  const context = useContext(WorkshopContext);
  if (context === undefined) {
    throw new Error('useWorkshop must be used within a WorkshopProvider');
  }
  return context;
}
