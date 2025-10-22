"use client";

import { RunningProgramsProvider } from '@/contexts/RunningProgramsContext';
import { MqttProvider } from '@/lib/mqtt/useMqtt';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MqttProvider>
      <RunningProgramsProvider>
        {children}
        <Toaster position="top-right" richColors />
      </RunningProgramsProvider>
    </MqttProvider>
  );
}