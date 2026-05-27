import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface Part {
  id: string;
  name: string;
  quantity: number;
}

export interface MotorcycleEntry {
  id: string;
  clientName: string;
  clientId: string;
  phone: string;
  email: string;
  entryDate: string;
  model: string;
  plate: string;
  mileage: number;
  observations: string;
  mechanicNotes?: string;
  timestamp: number;
  status: 'pending' | 'finished';
  parts: Part[];
}

export interface WorkshopContextType {
  queue: MotorcycleEntry[];
  activeRepairId: string | null;
  setActiveRepairId: (id: string | null) => void;
  registerEntry: (entry: Omit<MotorcycleEntry, 'id' | 'timestamp' | 'parts' | 'status'>) => void;
  addPartToEntry: (entryId: string, part: Omit<Part, 'id'>) => void;
  removePartFromEntry: (entryId: string, partId: string) => void;
  updateEntry: (entryId: string, updatedData: Partial<Omit<MotorcycleEntry, 'id' | 'timestamp' | 'parts' | 'status'>>) => void;
  removeEntry: (entryId: string) => void;
  finishRepair: (entryId: string) => void;
}

export const WorkshopContext = createContext<WorkshopContextType | undefined>(undefined);

function readFromStorage(): { queue: MotorcycleEntry[]; activeRepairId: string | null } {
  try {
    const item = window.localStorage.getItem('workshop-storage');
    if (!item) return { queue: [], activeRepairId: null };
    const parsed = JSON.parse(item);
    // Formato Zustand persist: { state: { queue, activeRepairId }, version }
    if (parsed?.state?.queue !== undefined) {
      return { queue: parsed.state.queue, activeRepairId: parsed.state.activeRepairId ?? null };
    }
    // Formato nuevo Context: { queue, activeRepairId }
    if (Array.isArray(parsed?.queue)) {
      return { queue: parsed.queue, activeRepairId: parsed.activeRepairId ?? null };
    }
    return { queue: [], activeRepairId: null };
  } catch {
    return { queue: [], activeRepairId: null };
  }
}

export function WorkshopProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<MotorcycleEntry[]>(() => readFromStorage().queue);
  const [activeRepairId, setActiveRepairId] = useState<string | null>(() => readFromStorage().activeRepairId);

  useEffect(() => {
    try {
      window.localStorage.setItem('workshop-storage', JSON.stringify({ queue, activeRepairId }));
    } catch (error) {
      console.warn('Error saving to localStorage', error);
    }
  }, [queue, activeRepairId]);

  const registerEntry = useCallback((entryData: Omit<MotorcycleEntry, 'id' | 'timestamp' | 'parts' | 'status'>) => {
    setQueue((prev) => [
      ...prev,
      { ...entryData, id: crypto.randomUUID(), timestamp: Date.now(), status: 'pending', parts: [] },
    ]);
  }, []);

  const updateEntry = useCallback((entryId: string, updatedData: Partial<Omit<MotorcycleEntry, 'id' | 'timestamp' | 'parts' | 'status'>>) => {
    setQueue((prev) => prev.map((e) => (e.id === entryId ? { ...e, ...updatedData } : e)));
  }, []);

  const addPartToEntry = useCallback((entryId: string, partData: Omit<Part, 'id'>) => {
    setQueue((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, parts: [...e.parts, { ...partData, id: crypto.randomUUID() }] } : e
      )
    );
  }, []);

  const removePartFromEntry = useCallback((entryId: string, partId: string) => {
    setQueue((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, parts: e.parts.filter((p) => p.id !== partId) } : e))
    );
  }, []);

  const removeEntry = useCallback((entryId: string) => {
    setQueue((prev) => prev.filter((e) => e.id !== entryId));
    setActiveRepairId((prev) => (prev === entryId ? null : prev));
  }, []);

  const finishRepair = useCallback((entryId: string) => {
    setQueue((prev) => prev.map((e) => (e.id === entryId ? { ...e, status: 'finished' } : e)));
    setActiveRepairId((prev) => (prev === entryId ? null : prev));
  }, []);

  return (
    <WorkshopContext.Provider
      value={{ queue, activeRepairId, setActiveRepairId, registerEntry, updateEntry, addPartToEntry, removePartFromEntry, removeEntry, finishRepair }}
    >
      {children}
    </WorkshopContext.Provider>
  );
}
