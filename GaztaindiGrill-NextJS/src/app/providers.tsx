"use client";

import { RunningProgramsProvider } from '@/contexts/RunningProgramsContext';
import { MqttProvider } from '@/hooks/useMqtt';
import { Toaster } from 'sonner';
import { ResettingOverlay } from '@/components/shared/ResettingOverlay';
import { CurrentModeProvider } from '@/contexts/CurrentModeContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MqttProvider>
      <ResettingOverlay />
      <RunningProgramsProvider>
        <CurrentModeProvider>
        {children}
        <Toaster position="top-center" richColors />
        </CurrentModeProvider>
      </RunningProgramsProvider>
    </MqttProvider>
  );
}