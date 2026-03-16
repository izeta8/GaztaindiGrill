"use client"

import { useGrillStateContext } from '@/contexts/GrillStateContext';

export function useGrillState(grillIndex: 0 | 1) {
  const { grillStates } = useGrillStateContext();
  // Retornamos los datos del contexto correspondientes al índice solicitado
  return grillStates[grillIndex];
}