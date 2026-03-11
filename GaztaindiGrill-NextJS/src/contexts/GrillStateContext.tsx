"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMqtt } from '@/hooks/useMqtt';
import { TOPICS } from '@/constants/mqtt';
import { ConnectionStatus, type GrillState } from '@/types';
import { parseGrillIndex } from '@/utils';

type GrillStates = { 0: GrillState; 1: GrillState; };

const initialState: GrillState = { position: 0, temperature: 0, rotation: 0, lastUpdate: null };

const GrillStateContext = createContext<{ grillStates: GrillStates } | undefined>(undefined);

export function GrillStateProvider({ children }: { children: React.ReactNode }) {
  const { subscribe, clientConnectionStatus } = useMqtt();
  const [grillStates, setGrillStates] = useState<GrillStates>({ 0: { ...initialState }, 1: { ...initialState } });

  const handleUpdate = useCallback((topic: string, payload: Uint8Array) => {
    const idx = parseGrillIndex(topic);
    if (idx === undefined) return;
    const val = parseInt(payload.toString());
    if (isNaN(val)) return;

    let key: keyof GrillState | null = null;
    if (topic.includes(TOPICS.STATUS.SENSOR.POSITION)) key = 'position';
    else if (topic.includes(TOPICS.STATUS.SENSOR.TEMPERATURE)) key = 'temperature';
    else if (topic.includes(TOPICS.STATUS.SENSOR.ROTATION)) key = 'rotation';

    if (key) {
      setGrillStates(prev => ({
        ...prev,
        [idx]: { ...prev[idx], [key!]: val, lastUpdate: new Date() }
      }));
    }
  }, []);

  useEffect(() => {
    if (clientConnectionStatus !== ConnectionStatus.Online) return;
    let isMounted = true;
    const unsubs: (() => void)[] = [];

    const start = async () => {
      const sensors = [TOPICS.STATUS.SENSOR.POSITION, TOPICS.STATUS.SENSOR.TEMPERATURE, TOPICS.STATUS.SENSOR.ROTATION];
      const results = await Promise.all(sensors.map(s => subscribe(`grill/+/${s}`, handleUpdate)));
      if (isMounted) unsubs.push(...results);
      else results.forEach(u => u());
    };

    start();
    return () => { isMounted = false; unsubs.forEach(u => u()); };
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