import { useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WorkshopContext } from '../contexts/WorkshopContext';
import { workshopService } from '../services/api';
import type { UpdateMotorcycleData, CreateMotorcycleData } from '@types';

export type { MotorcycleEntry, Part } from '../types/index';

// ─── UI state (tracks which repair is active on screen) ─────────────────────

export function useWorkshop() {
  const context = useContext(WorkshopContext);
  if (context === undefined) {
    throw new Error('useWorkshop must be used within a WorkshopProvider');
  }
  return context;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useMotorcycles(status?: 'pending' | 'finished') {
  return useQuery({
    queryKey: ['workshop', status ?? 'all'],
    queryFn: () => workshopService.list(status),
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useRegisterMotorcycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMotorcycleData) => workshopService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workshop'] }),
  });
}

export function useUpdateMotorcycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateMotorcycleData) =>
      workshopService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workshop'] }),
  });
}

export function useFinishRepair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workshopService.finish(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workshop'] }),
  });
}

export function useDeleteMotorcycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workshopService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workshop'] }),
  });
}

export function useAddPart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ motorcycleId, name, quantity }: { motorcycleId: string; name: string; quantity: number }) =>
      workshopService.addPart(motorcycleId, { name, quantity }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workshop'] }),
  });
}

export function useRemovePart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ motorcycleId, partId }: { motorcycleId: string; partId: string }) =>
      workshopService.removePart(motorcycleId, partId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workshop'] }),
  });
}
