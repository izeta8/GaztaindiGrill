"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMqtt } from '@/hooks/useMqtt';
import { TOPICS } from '@/constants/mqtt';
import { ConnectionStatus, type GrillState } from '@/types';
import { parseGrillIndex } from '@/utils';

type GrillStates = { 0: GrillState; 1: GrillState; };

const initialState: GrillState = { 
  position: 0, 
  temperature: 0, 
  rotation: 0, 
  movement: 'stop', 
  rotation_movement: 'stop',
  lastUpdate: null 
};

const GrillStateContext = createContext<{ grillStates: GrillStates } | undefined>(undefined);

// Los topics de acción llevan el sobre { value, requestId }; los de estado, el valor pelado.
function unwrapEnvelope(payload: string): string {
  if (!payload.startsWith('{')) return payload;
  try {
    const parsed = JSON.parse(payload);
    return parsed?.value !== undefined ? String(parsed.value) : payload;
  } catch {
    return payload;
  }
}

// Define how to handle each topic
const TOPIC_HANDLERS: Record<string, { key: keyof GrillState; type: 'number' | 'string' }> = {
  [TOPICS.STATUS.SENSOR.POSITION]: { key: 'position', type: 'number' },
  [TOPICS.STATUS.SENSOR.TEMPERATURE]: { key: 'temperature', type: 'number' },
  [TOPICS.STATUS.SENSOR.ROTATION]: { key: 'rotation', type: 'number' },
  [TOPICS.ACTION.MOVEMENT.VERTICAL]: { key: 'movement', type: 'string' },
  [TOPICS.ACTION.MOVEMENT.ROTATION]: { key: 'rotation_movement', type: 'string' },
};

export function GrillStateProvider({ children }: { children: React.ReactNode }) {
  const { subscribe, clientConnectionStatus } = useMqtt();
  const [grillStates, setGrillStates] = useState<GrillStates>({ 
    0: { ...initialState }, 
    1: { ...initialState } 
  });

  const handleUpdate = useCallback((topic: string, payload: Uint8Array) => {
    const idx = parseGrillIndex(topic);
    if (idx === undefined) return;

    // Find which handler matches this topic
    const handlerEntry = Object.entries(TOPIC_HANDLERS).find(([t]) => topic.includes(t));
    if (!handlerEntry) return;

    const { key, type } = handlerEntry[1];
    const payloadStr = unwrapEnvelope(payload.toString());

    let value: string | number = payloadStr;
    if (type === 'number') {
      const parsedValue = parseInt(payloadStr);
      if (isNaN(parsedValue)) return;
      value = parsedValue;
    }

    setGrillStates(prev => ({
      ...prev,
      [idx]: { 
        ...prev[idx], 
        [key]: value, 
        lastUpdate: new Date() 
      }
    }));
  }, []);

  useEffect(() => {
    if (clientConnectionStatus !== ConnectionStatus.Online) return;
    let isMounted = true;
    const unsubs: (() => void)[] = [];

    const start = async () => {
      const topicsToSubscribe = Object.keys(TOPIC_HANDLERS);
      
      const results = await Promise.all(
        topicsToSubscribe.map(t => subscribe(`grill/+/${t}`, handleUpdate))
      );

      if (isMounted) unsubs.push(...results);
      else results.forEach(u => u());
    };

    start();
    return () => { 
      isMounted = false; 
      unsubs.forEach(u => u()); 
    };
  }, [clientConnectionStatus, subscribe, handleUpdate]);

  return (
    <GrillStateContext.Provider value={{ grillStates }}>
      {children}
    </GrillStateContext.Provider>
  );
}

export const useGrillStateContext = () => {
  const ctx = useContext(GrillStateContext);
  if (!ctx) throw new Error('useGrillStateContext debe usarse dentro de GrillStateProvider');
  return ctx;
};