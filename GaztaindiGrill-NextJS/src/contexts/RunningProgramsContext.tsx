"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMqtt } from '@/lib/mqtt/useMqtt';
import { TOPIC_PROGRAM_STATUS_RESPONSE, TOPIC_PROGRAM_STEP_CHANGED } from '@/constants/mqtt';
import type { RunningProgramStatus, Program, EnrichedProgramStatus } from '@/lib/types';
import { toast } from 'sonner';

// The global state will be an object where the key is the grill index (0 or 1)
type RunningProgramsState = {
  [grillIndex: number]: EnrichedProgramStatus | null;
};

// What the context will provide
interface RunningProgramsContextValue {
  runningPrograms: RunningProgramsState;
  getProgramOnGrill: (grillIndex: number) => EnrichedProgramStatus | null;
  checkIfProgramIsRunning: (programId: number) => { isRunning: boolean; grillIndex: number | null };
}

const RunningProgramsContext = createContext<RunningProgramsContextValue | undefined>(undefined);

export function RunningProgramsProvider({ children }: { children: React.ReactNode }) {
  const { subscribe, clientConnectionStatus } = useMqtt();
  const [runningPrograms, setRunningPrograms] = useState<RunningProgramsState>({ 0: null, 1: null });

  useEffect(() => {
    console.log("-> runningPrograms")
    console.log(runningPrograms)
  }, [runningPrograms])

  const handleProgramStatusUpdate = useCallback(async (topic: string, payload: Uint8Array) => {
    try {
      const grillIndex = parseInt(topic.split('/')[1], 10);
      if (isNaN(grillIndex) || (grillIndex !== 0 && grillIndex !== 1)) return;

      const programData: RunningProgramStatus = JSON.parse(payload.toString());

      if (!programData.isRunning) {
        setRunningPrograms(prev => ({ ...prev, [grillIndex]: null }));
        return;
      }

      const existingProgram = runningPrograms[grillIndex];
      if (existingProgram && existingProgram.programId === programData.programId) {
        setRunningPrograms(prev => ({
          ...prev,
          [grillIndex]: {
            ...existingProgram,
            currentStepIndex: programData.currentStepIndex,
            elapsedTime: programData.elapsedTime,
          }
        }));
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/${programData.programId}`);
      if (!response.ok) {
        toast.error(`Program with ID ${programData.programId} not found in the database.`);
        return;
      }
      const apiProgramData: Program = await response.json();

      const enrichedData: EnrichedProgramStatus = {
        ...programData,
        name: apiProgramData.name,
        description: apiProgramData.description,
        creatorName: apiProgramData.creatorName
      };

      setRunningPrograms(prev => ({ ...prev, [grillIndex]: enrichedData }));

    } catch (error) {
      console.error("Error processing program status:", error);
    }
  }, []);

  useEffect(() => {
    if (clientConnectionStatus !== 'connected') return;

    const responseTopic = `grill/+/${TOPIC_PROGRAM_STATUS_RESPONSE}`;
    const stepChangedTopic = `grill/+/${TOPIC_PROGRAM_STEP_CHANGED}`;

    let unsubResponse: (() => void) | null = null;
    let unsubStepChanged: (() => void) | null = null;

    const setupSubscriptions = async () => {
      unsubResponse = await subscribe(responseTopic, handleProgramStatusUpdate);
      unsubStepChanged = await subscribe(stepChangedTopic, handleProgramStatusUpdate);
    };

    setupSubscriptions();

    return () => {
      unsubResponse?.();
      unsubStepChanged?.();
    };
  }, [clientConnectionStatus, subscribe, handleProgramStatusUpdate]);

  const getProgramOnGrill = (grillIndex: number) => runningPrograms[grillIndex] || null;

  const checkIfProgramIsRunning = (programId: number) => {
    for (const grillIndex in runningPrograms) {
      if (runningPrograms[grillIndex]?.programId === programId) {
        return { isRunning: true, grillIndex: parseInt(grillIndex, 10) };
      }
    }
    return { isRunning: false, grillIndex: null };
  };

  const value = {
    runningPrograms,
    getProgramOnGrill,
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

