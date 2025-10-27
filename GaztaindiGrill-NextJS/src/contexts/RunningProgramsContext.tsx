"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useMqtt } from '@/lib/mqtt/useMqtt';
import { TOPIC_PROGRAM_STATUS_RESPONSE, TOPIC_PROGRAM_STEP_CHANGED } from '@/constants/mqtt';
import { type RunningProgramStatus, type Program, type EnrichedProgramStatus, ConnectionStatus } from '@/lib/types';
import { toast } from 'sonner';

// -----------------------------------------------------------------------------
// Types and Context
// -----------------------------------------------------------------------------

// State for a single grill, using the { isLoading, data, error } pattern
type GrillProgramState = {
  isLoading: boolean;
  data: EnrichedProgramStatus | null; // null if no program is running
  error: string | null;
}

// Final state consumed by the UI (one state object per grill)
type RunningProgramsState = {
  [grillIndex: number]: GrillProgramState;
};

// Internal state for raw MQTT data
type EspProgramData = {
  [grillIndex: number]: RunningProgramStatus | null;
}

// Internal state for API cache
type ProgramApiCacheState = {
  [programId: number]: Program | null; // null means fetch failed
}

// Context value provided to consumers
interface RunningProgramsContextValue {
  runningPrograms: RunningProgramsState;
  getProgramOnGrill: (grillIndex: number) => GrillProgramState;
  checkIfProgramIsRunning: (programId: number) => { isRunning: boolean; grillIndex: number | null };
}

const RunningProgramsContext = createContext<RunningProgramsContextValue | undefined>(undefined);

const TOPIC_PROGRAM_CACHE_INVALIDATION = "programs/updated/+";

// -----------------------------------------------------------------------------
// Provider Component
// -----------------------------------------------------------------------------

export function RunningProgramsProvider({ children }: { children: React.ReactNode }) {
  const { subscribe, clientConnectionStatus } = useMqtt();

  const [espProgramsData, setEspProgramData] = useState<EspProgramData>({ 0: null, 1: null });
  const [programApiCache, setProgramApiCache] = useState<ProgramApiCacheState>({});
  const [loadingProgramIds, setLoadingProgramIds] = useState<Set<number>>(new Set());

  // Ref to hold the latest state, avoids dependency cycle in callbacks
  const espProgramsDataRef = useRef(espProgramsData);
  useEffect(() => {
    espProgramsDataRef.current = espProgramsData;
  }, [espProgramsData]);

  // --- Fetch and Cache Function ---
  const fetchAndCacheProgram = useCallback(async (
    programId: number,
    forceRefetch = false
  ) => {
    // Skip if already loading or if cached and not forced
    if (
      loadingProgramIds.has(programId) ||
      (programApiCache[programId] !== undefined && !forceRefetch)
    ) {
      return;
    }

    try {
      console.log(`[fetchAndCache] Start fetching program ${programId} (Force: ${forceRefetch})`);
      setLoadingProgramIds(prev => new Set(prev).add(programId));

      const url = `${process.env.NEXT_PUBLIC_API_URL}/programs/${programId}`;
      const response = await fetch(url);

      if (!response.ok) {
        toast.error(`Program with ID ${programId} not found.`);
        throw new Error(`Program ${programId} not found (Status: ${response.status})`);
      }

      const programData: Program = await response.json();
      console.log(`[fetchAndCache] Success fetching program ${programId}`);
      // Store successful fetch in cache
      setProgramApiCache(prev => ({ ...prev, [programId]: programData }));

    } catch (error) {
      console.error(`[fetchAndCache] Error fetching ${programId}:`, error);
      // Store null on error to prevent re-fetching
      setProgramApiCache(prev => ({ ...prev, [programId]: null }));
    } finally {
      // Remove from loading set regardless of outcome
      setLoadingProgramIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(programId);
        return newSet;
      });
    }
  }, [programApiCache, loadingProgramIds]);

  // --- MQTT Handlers ---

  // Handles status/step updates from the ESP32
  const handleProgramStatusUpdate = useCallback((topic: string, payload: Uint8Array) => {

    try {
      const grillIndexMatch = topic.match(/grill\/(\d+)\//);
      if (!grillIndexMatch) return;
      const grillIndex = parseInt(grillIndexMatch[1], 10);
      if (isNaN(grillIndex) || (grillIndex !== 0 && grillIndex !== 1)) return;

      const programData: RunningProgramStatus = JSON.parse(payload.toString());

      // Program stopped
      if (!programData.isRunning) {
        setEspProgramData(prev => {
          if (prev[grillIndex] === null) return prev; // No change
          return { ...prev, [grillIndex]: null };
        });
        return;
      }

      // Read from the ref to check if this is a new program
      const currentProgramId = espProgramsDataRef.current[grillIndex]?.programId;
      const newProgramId = programData.programId;
      const isNewProgram = currentProgramId !== newProgramId;

      // Store the latest raw data from the ESP
      setEspProgramData(prev => ({ ...prev, [grillIndex]: programData }));

      // Fetch program details (will be skipped if cached, forced if new)
      fetchAndCacheProgram(newProgramId, isNewProgram);

    } catch (error) {
      console.error("[MQTT Handler] Error processing status message:", error);
      toast.error("Error processing MQTT data.");
    }
  }, [fetchAndCacheProgram]);

  // Handles cache invalidation events from the API
  const handleCacheInvalidation = useCallback((topic: string, payload: Uint8Array) => {
    try {
      const programIdMatch = topic.match(/programs\/updated\/(\d+)/);
      if (!programIdMatch || programIdMatch.length < 2) return;

      const programId = parseInt(programIdMatch[1], 10);
      if (isNaN(programId)) return;

      console.log(`[Cache Invalidation] Event for program ID: ${programId}.`);

      // Always clear the cache so the next run gets fresh data
      setProgramApiCache(prevCache => {
        if (prevCache[programId] !== undefined) {
          console.log(`[Cache Invalidation] Clearing cache for ${programId}.`);
          const newCache = { ...prevCache };
          delete newCache[programId];
          return newCache;
        }
        return prevCache;
      });

      // Check if the updated program is running *right now* (read from ref)
      let isRunning = false;
      for (const espData of Object.values(espProgramsDataRef.current)) {
          if (espData?.programId === programId) {
              isRunning = true;
              break; // Found it
          }
      }

      // If it's running, show a toast
      if (isRunning) {
        console.log(`[Cache Invalidation] Program ${programId} is running. Showing toast.`);
        toast.info(`A running program (ID: ${programId}) was updated. Changes will apply on next run.`);
      }

    } catch (error) {
      console.error("[Cache Invalidation] Error processing message:", error);
    }
  }, []);

  // --- MQTT Subscriptions ---
  useEffect(() => {
      if (clientConnectionStatus !== ConnectionStatus.Connected) return;

      const grills = [0, 1];
      const unsubs: (() => void)[] = []; 

      const setupSubscriptions = async () => {
        try {
          // Suscripción de invalidación de caché
          const unsubCache = await subscribe(TOPIC_PROGRAM_CACHE_INVALIDATION, handleCacheInvalidation);
          unsubs.push(unsubCache);

          // Suscripciones por parrilla
          for (const index of grills) {
            const responseTopic = `grill/${index}/${TOPIC_PROGRAM_STATUS_RESPONSE}`;
            const stepChangedTopic = `grill/${index}/${TOPIC_PROGRAM_STEP_CHANGED}`;

            const unsubResp = await subscribe(responseTopic, handleProgramStatusUpdate);
            unsubs.push(unsubResp);

            const unsubStep = await subscribe(stepChangedTopic, handleProgramStatusUpdate);
            unsubs.push(unsubStep);
          }

        } catch (error) {
            console.error("[MQTT Sub] Error during subscription:", error);
            toast.error("Error subscribing to MQTT topics.");
        }
      };

      setupSubscriptions();

      return () => {
        unsubs.forEach(unsub => unsub?.());
      };
    }, [clientConnectionStatus, subscribe, handleProgramStatusUpdate, handleCacheInvalidation]);

  // --- Define the final state (using the new pattern) ---
  const runningPrograms: RunningProgramsState = useMemo(() => {

    // Start with a clean state for both grills
    const enrichedStates: RunningProgramsState = {
      0: { isLoading: false, data: null, error: null },
      1: { isLoading: false, data: null, error: null }
    };

    // Iterate over the raw MQTT data (0 and 1)
    for (const grillIndexStr in espProgramsData) {

      const grillIndex = parseInt(grillIndexStr, 10);
      const mqttData = espProgramsData[grillIndex];

      // Case 1: No program running on this grill.
      // The state remains { isLoading: false, data: null, error: null }
      if (!mqttData) {
        continue;
      }

      // --- A program IS running ---
      const programId = mqttData.programId;
      const apiData = programApiCache[programId];

      // Case 2: Success. We have MQTT data AND API data.
      if (apiData) {
        enrichedStates[grillIndex] = {
          isLoading: false,
          data: { ...mqttData, ...apiData }, // Full data
          error: null
        };
      }
      // Case 3: Error. API fetch failed.
      else if (apiData === null) {
        enrichedStates[grillIndex] = {
          isLoading: false,
          data: mqttData, // Return partial data (MQTT only)
          error: `Failed to load program data (ID: ${programId})`
        };
      }
      // Case 4: Loading.
      else { // (isLoadingApi is true OR apiData is undefined)
        enrichedStates[grillIndex] = {
          isLoading: true,
          data: {
            ...mqttData,
          },
          error: null
        };
      }
    }
    return enrichedStates;
  }, [espProgramsData, programApiCache, loadingProgramIds]);

  // --- Helper Functions ---
  const getProgramOnGrill = useCallback((grillIndex: number): GrillProgramState => {
    // Return the full state object for the grill
    return runningPrograms[grillIndex];
  }, [runningPrograms]);

  const checkIfProgramIsRunning = useCallback((programId: number): { isRunning: boolean; grillIndex: number | null } => {
    for (const key in runningPrograms) {
      if (Object.prototype.hasOwnProperty.call(runningPrograms, key)) {
          const index = parseInt(key, 10);
          // Check inside the .data property
          if (runningPrograms[index].data?.programId === programId) {
              return { isRunning: true, grillIndex: index };
          }
      }
    }
    return { isRunning: false, grillIndex: null };
  }, [runningPrograms]);

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