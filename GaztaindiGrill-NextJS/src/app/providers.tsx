"use client";

import { RunningProgramsProvider } from '@/contexts/RunningProgramsContext';
import { MqttProvider } from '@/hooks/useMqtt';
import { Toaster } from 'sonner';
import { ResettingOverlay } from '@/components/shared/ResettingOverlay';
import { CurrentModeProvider } from '@/contexts/CurrentModeContext';
import { GrillStateProvider } from '@/contexts/GrillStateContext';
import { CurrentUserProvider } from '@/contexts/CurrentUserContext';
import { UserSelectionModal } from '@/components/shared/UserSelectionModal';
import { SharedGrillCanvasProvider } from '@/components/three/SharedGrillCanvas';
import type { MqttConfig } from '@/types';

export function Providers({ mqttConfig, children }: { mqttConfig: MqttConfig, children: React.ReactNode }) {
  return (
    <MqttProvider config={mqttConfig}>
      <GrillStateProvider>
        <ResettingOverlay />
        <RunningProgramsProvider>
          <CurrentModeProvider>
            <CurrentUserProvider>
            <SharedGrillCanvasProvider>
            {children}
            </SharedGrillCanvasProvider>
            <UserSelectionModal />
            <Toaster position="top-center" richColors closeButton />
            </CurrentUserProvider>
          </CurrentModeProvider>
        </RunningProgramsProvider>
      </GrillStateProvider>
    </MqttProvider>
  );
}