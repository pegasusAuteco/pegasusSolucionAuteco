import { createContext, useState, useEffect, useCallback } from 'react';

export const WorkshopContext = createContext(undefined);

function readFromStorage() {
  try {
    const item = window.localStorage.getItem('workshop-storage');
    if (!item) return { queue: [], activeRepairId: null };
    const parsed = JSON.parse(item);
    if (parsed?.state?.queue !== undefined) {
      return { queue: parsed.state.queue, activeRepairId: parsed.state.activeRepairId ?? null };
    }
    if (Array.isArray(parsed?.queue)) {
      return { queue: parsed.queue, activeRepairId: parsed.activeRepairId ?? null };
    }
    return { queue: [], activeRepairId: null };
  } catch {
    return { queue: [], activeRepairId: null };
  }
}

export function WorkshopProvider({ children }) {
  const [queue, setQueue] = useState(() => readFromStorage().queue);
  const [activeRepairId, setActiveRepairId] = useState(() => readFromStorage().activeRepairId);

  useEffect(() => {
    try {
      window.localStorage.setItem('workshop-storage', JSON.stringify({ queue, activeRepairId }));
    } catch (error) {
      console.warn('Error saving to localStorage', error);
    }
  }, [queue, activeRepairId]);

  const registerEntry = useCallback((entryData) => {
    setQueue((prev) => [
      ...prev,
      { ...entryData, id: entryData.id ?? crypto.randomUUID(), timestamp: Date.now(), status: 'pending', parts: [] },
    ]);
  }, []);

  const updateEntry = useCallback((entryId, updatedData) => {
    setQueue((prev) => prev.map((e) => (e.id === entryId ? { ...e, ...updatedData } : e)));
  }, []);

  const addPartToEntry = useCallback((entryId, partData) => {
    setQueue((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, parts: [...e.parts, { ...partData, id: crypto.randomUUID() }] } : e
      )
    );
  }, []);

  const removePartFromEntry = useCallback((entryId, partId) => {
    setQueue((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, parts: e.parts.filter((p) => p.id !== partId) } : e))
    );
  }, []);

  const removeEntry = useCallback((entryId) => {
    setQueue((prev) => prev.filter((e) => e.id !== entryId));
    setActiveRepairId((prev) => (prev === entryId ? null : prev));
  }, []);

  const finishRepair = useCallback((entryId) => {
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
