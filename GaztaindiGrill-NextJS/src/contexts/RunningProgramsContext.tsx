"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMqtt } from '@/hooks/useMqtt';
import { TOPICS } from '@/constants/mqtt';
import { type RunningProgram, ConnectionStatus } from '@/types';
import { toast } from 'sonner';

// Final state consumed by the UI
type RunningPrograms = {
  [grillIndex: number]: RunningProgram | null;
};

// Context value provided to consumers
interface RunningProgramsContextValue {
  runningPrograms: RunningPrograms;
  checkIfProgramIsRunning: (programId: number) => { isRunning: boolean; grillIndex: number | null };
}

const RunningProgramsContext = createContext<RunningProgramsContextValue | undefined>(undefined);

export function RunningProgramsProvider({ children }: { children: React.ReactNode }) {
  const { subscribe, clientConnectionStatus } = useMqtt();

  const [runningPrograms, setRunningPrograms] = useState<RunningPrograms>({0: null, 1: null});

  // --- MQTT Handlers ---

  const handleProgramCurrentStatus = useCallback((topic: string, payload: Uint8Array) => {
    try {

      // Get the grill index.
      const grillIndexMatch = topic.match(/grill\/(\d+)\//);
      if (!grillIndexMatch) return;
      const grillIndex = parseInt(grillIndexMatch[1], 10);
      if (isNaN(grillIndex) || (grillIndex !== 0 && grillIndex !== 1)) return;

      // Parse the data received from mqtt
      const programData: RunningProgram = JSON.parse(payload.toString());

      console.log("PROGRAM DATA: ", programData)

      // Reset grill data to null when no program is running and prevent unnecessary re-renders.
      if (!programData.isRunning) {
        setRunningPrograms(prev => {
          if (prev[grillIndex] === null) return prev;
          return { ...prev, [grillIndex]: null };
        });
        return;
      }

      // Set the program data to the corresponding indexz
      setRunningPrograms(prev => ({ ...prev, [grillIndex]: programData }));

    } catch (error) {
      console.error("[MQTT Handler] Error processing status message:", error);
      toast.error("Error processing MQTT data.");
    }
  }, []);

  // --- MQTT Subscriptions ---
  useEffect(() => {
    if (clientConnectionStatus !== ConnectionStatus.Online || !subscribe) return;

    // Usamos una variable para controlar si el efecto sigue montado
    let isMounted = true;
    let unsubscribeFn: (() => void) | null = null;

    const setupSubscriptions = async () => {
      try {
        const grillIndex = 0; 
        const programStatusTopic = `grill/${grillIndex}/${TOPICS.STATUS.PROGRAM.CURRENT}`;
        
        const unsub = await subscribe(programStatusTopic, handleProgramCurrentStatus);
        
        // Si para cuando terminó de suscribir el componente se desmontó, limpiamos inmediatamente
        if (!isMounted) {
          unsub();
        } else {
          unsubscribeFn = unsub;
        }
      } catch (error) {
        console.error("[MQTT Sub] Error during subscription:", error);
      }
    };

    setupSubscriptions();

    return () => {
      isMounted = false;
      if (unsubscribeFn) unsubscribeFn();
    };
  }, [clientConnectionStatus, subscribe, handleProgramCurrentStatus]);

  const checkIfProgramIsRunning = useCallback((programId: number): { isRunning: boolean; grillIndex: number | null } => {
    for (const key in runningPrograms) {
      if (Object.prototype.hasOwnProperty.call(runningPrograms, key)) {
          const index = parseInt(key, 10);
          if (runningPrograms[index]?.programId === programId) {
              return { isRunning: true, grillIndex: index };
          }
      }
    }
    return { isRunning: false, grillIndex: null };
  }, [runningPrograms]);

  const value = {
    runningPrograms,
    checkIfProgramIsRunning,
  };

  return (
    <RunningProgramsContext.Provider value={value}>
      {children}
    </RunningProgramsContext.Provider>
  );
}

export function useRunningPrograms() {
  const context = useContext(RunningProgramsContext);
  if (context === undefined) {
    throw new Error('useRunningPrograms must be used within a RunningProgramsProvider');
  }
  return context;
}