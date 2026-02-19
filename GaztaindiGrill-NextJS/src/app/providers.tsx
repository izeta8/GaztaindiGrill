"use client";

import { RunningProgramsProvider } from '@/contexts/RunningProgramsContext';
import { MqttProvider } from '@/hooks/useMqtt';
import { Toaster } from 'sonner';
import { ResettingOverlay } from '@/components/shared/ResettingOverlay';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MqttProvider>
      <ResettingOverlay />
      <RunningProgramsProvider>
        {children}
        <Toaster position="top-center" richColors />
      </RunningProgramsProvider>
    </MqttProvider>
  );
}