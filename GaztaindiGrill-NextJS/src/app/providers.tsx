// Contenido para el NUEVO archivo: src/app/providers.tsx

"use client";

import { MqttProvider } from '@/lib/mqtt/useMqtt';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MqttProvider>
      {children}
      <Toaster position="top-right" richColors />
    </MqttProvider>
  );
}