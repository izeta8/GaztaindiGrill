"use client";

import { RunningProgramsProvider } from '@/contexts/RunningProgramsContext';
import { MqttProvider } from '@/hooks/useMqtt';
import { Toaster } from 'sonner';
import { ResettingOverlay } from '@/components/shared/ResettingOverlay';
import { CurrentModeProvider } from '@/contexts/CurrentModeContext';
import { GrillStateProvider } from '@/contexts/GrillStateContext';
import { CurrentUserProvider } from '@/contexts/CurrentUserContext';
import { UserSelectionModal } from '@/components/shared/UserSelectionModal';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MqttProvider>
      <GrillStateProvider>
        <ResettingOverlay />
        <RunningProgramsProvider>
          <CurrentModeProvider>
            <CurrentUserProvider>
            {children}
            <UserSelectionModal />
            <Toaster position="top-center" richColors closeButton />
            </CurrentUserProvider>
          </CurrentModeProvider>
        </RunningProgramsProvider>
      </GrillStateProvider>
    </MqttProvider>
  );
}