import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Part {
  id: string;
  name: string;
  quantity: number;
}

export interface MotorcycleEntry {
  id: string;
  clientName: string;
  clientId: string;
  email: string;
  entryDate: string;
  model: string;
  plate: string;
  mileage: number;
  observations: string;
  timestamp: number;
  status: 'pending' | 'finished';
  parts: Part[];
}

interface WorkshopState {
  queue: MotorcycleEntry[];
  registerEntry: (entry: Omit<MotorcycleEntry, 'id' | 'timestamp' | 'parts' | 'status'>) => void;
  addPartToEntry: (entryId: string, part: Omit<Part, 'id'>) => void;
  updateEntry: (entryId: string, updatedData: Partial<Omit<MotorcycleEntry, 'id' | 'timestamp' | 'parts' | 'status'>>) => void;
  removeEntry: (entryId: string) => void;
  finishRepair: (entryId: string) => void;
  activeRepairId: string | null;
  setActiveRepairId: (id: string | null) => void;
}

export const useWorkshopStore = create<WorkshopState>()(
  persist(
    (set) => ({
      queue: [],
      activeRepairId: null,
      setActiveRepairId: (id) => set({ activeRepairId: id }),
      registerEntry: (entryData) =>
        set((state) => ({
          queue: [
            ...state.queue,
            {
              ...entryData,
              id: crypto.randomUUID(),
              timestamp: Date.now(),
              status: 'pending',
              parts: [],
            },
          ],
        })),
      updateEntry: (entryId, updatedData) =>
        set((state) => ({
          queue: state.queue.map((entry) =>
            entry.id === entryId ? { ...entry, ...updatedData } : entry
          ),
        })),
      addPartToEntry: (entryId, partData) =>
        set((state) => ({
          queue: state.queue.map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  parts: [
                    ...entry.parts,
                    { ...partData, id: crypto.randomUUID() },
                  ],
                }
              : entry
          ),
        })),
      removeEntry: (entryId) =>
        set((state) => ({
          queue: state.queue.filter((entry) => entry.id !== entryId),
          activeRepairId: state.activeRepairId === entryId ? null : state.activeRepairId,
        })),
      finishRepair: (entryId) =>
        set((state) => ({
          queue: state.queue.map((entry) =>
            entry.id === entryId ? { ...entry, status: 'finished' } : entry
          ),
          activeRepairId: state.activeRepairId === entryId ? null : state.activeRepairId,
        })),
    }),
    {
      name: 'workshop-storage',
    }
  )
);
