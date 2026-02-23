import { TOPICS } from "@/constants/mqtt";
import { useMqtt } from "@/hooks/useMqtt";
import { ConnectionStatus, GrillMode, GrillModes } from "@/types";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

interface CurrentModeContextValue {
  currentMode: GrillMode;
}

const CurrentModeContext = createContext<CurrentModeContextValue | undefined>(undefined);

export function CurrentModeProvider({ children }: { children: React.ReactNode }) {

  const [currentMode, setCurrentMode] = useState<GrillMode>(GrillModes.Normal);
  const { subscribe, clientConnectionStatus } = useMqtt();

  const value = {
    currentMode,
  };

  const handleCurrentMode = useCallback((topic: string, payload: Uint8Array) => {
      try {
  
        // Parse the data received from mqtt
        const currentMode = payload.toString();

        // Validate MQTT input
        if (currentMode != GrillModes.Dual && currentMode != GrillModes.Normal) return

        setCurrentMode(currentMode)
  
      } catch (error) {
        console.error("[MQTT Handler] Error processing status message:", error);
        toast.error("Error processing MQTT data.");
      }
    }, []);

  // --- MQTT Subscriptions ---
  useEffect(() => {
    if (clientConnectionStatus !== ConnectionStatus.Online || !subscribe) return;

    // Usamos una variable para controlar si el efecto sigue montado
    let isMounted = true;
    let unsubscribeFn: (() => void) | null = null;

    const setupSubscriptions = async () => {
      try {

        console.log("llega aqui")

        const currentModeTopic = `grill/${TOPICS.GLOBAL.CURRENT_MODE}`;

        const unsub = await subscribe(currentModeTopic, handleCurrentMode);

        // Si para cuando terminó de suscribir el componente se desmontó, limpiamos inmediatamente
        if (!isMounted) {
          unsub();
        } else {
          unsubscribeFn = unsub;
        }
      } catch (error) {
        console.error("[MQTT Sub] Error during subscription:", error);
      }
    };

    setupSubscriptions();

    return () => {
      isMounted = false;
      if (unsubscribeFn) unsubscribeFn();
    };
  }, [clientConnectionStatus, subscribe, handleCurrentMode]);



  return (
    <CurrentModeContext.Provider value={value}>
      {children}
    </CurrentModeContext.Provider>
  );

}

export function useCurrentMode() {
  const context = useContext(CurrentModeContext);
  if (context === undefined) {
    throw new Error('useCurrentMode must be used within a CurrentModeProvider');
  }
  return context;
}