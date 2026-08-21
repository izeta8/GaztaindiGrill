"use client";

import { RunningProgramsProvider } from '@/contexts/RunningProgramsContext';
import { MqttProvider } from '@/hooks/useMqtt';
import { Toaster } from 'sonner';
import { ResettingOverlay } from '@/components/shared/ResettingOverlay';
import { CurrentModeProvider } from '@/contexts/CurrentModeContext';
import { GrillStateProvider } from '@/contexts/GrillStateContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MqttProvider>
      <GrillStateProvider>
        <ResettingOverlay />
        <RunningProgramsProvider>
          <CurrentModeProvider>
          {children}
          <Toaster position="top-center" richColors />
          </CurrentModeProvider>
        </RunningProgramsProvider>
      </GrillStateProvider>
    </MqttProvider>
  );
}