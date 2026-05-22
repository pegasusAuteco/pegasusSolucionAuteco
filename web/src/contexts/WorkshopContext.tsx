import { createContext, useState, ReactNode } from 'react';

// Re-export types so existing imports like `import { MotorcycleEntry } from '../../contexts/WorkshopContext'` keep working
export type { MotorcycleEntry, Part } from '../types/index';

interface WorkshopContextType {
  activeRepairId: string | null;
  setActiveRepairId: (id: string | null) => void;
}

export const WorkshopContext = createContext<WorkshopContextType | undefined>(undefined);

export function WorkshopProvider({ children }: { children: ReactNode }) {
  const [activeRepairId, setActiveRepairId] = useState<string | null>(null);

  return (
    <WorkshopContext.Provider value={{ activeRepairId, setActiveRepairId }}>
      {children}
    </WorkshopContext.Provider>
  );
}
