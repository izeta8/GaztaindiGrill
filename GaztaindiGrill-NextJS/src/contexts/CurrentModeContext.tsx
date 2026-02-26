import { TOPICS } from "@/constants/mqtt";
import { useMqtt } from "@/hooks/useMqtt";
import { ConnectionStatus, GrillMode, GrillModes } from "@/types";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

interface CurrentModeContextValue {
  currentMode: GrillMode | undefined;
}

const CurrentModeContext = createContext<CurrentModeContextValue | undefined>(undefined);

export function CurrentModeProvider({ children }: { children: React.ReactNode }) {

  const [currentMode, setCurrentMode] = useState<GrillMode | undefined>(GrillModes.Single);
  const { subscribe, publish, clientConnectionStatus, espConnectionStatus } = useMqtt();

  const value = {
    currentMode,
  };

  const handleCurrentMode = useCallback((topic: string, payload: Uint8Array) => {
    try {

      // Parse the data received from mqtt
      const mode = payload.toString();

      // Validate MQTT input
      if (mode != GrillModes.Dual && mode != GrillModes.Single) return

      setCurrentMode(mode)

    } catch (error) {
      console.error("[MQTT Handler] Error processing status message:", error);
      toast.error("Error processing MQTT data.");
    }
  }, []);
  
  // Request ESP32 to publish the current mode 
  const requestCurrentMode = useCallback(async () => {
    if (clientConnectionStatus === ConnectionStatus.Online && espConnectionStatus === ConnectionStatus.Online) {
        await publish(`grill/${TOPICS.MODE.REQUEST_CURRENT_MODE}`, "requestCurrentMode", { qos: 1 })
    }
  }, [publish, clientConnectionStatus, espConnectionStatus]);


  // --- MQTT Subscriptions ---
  useEffect(() => {
    if (clientConnectionStatus !== ConnectionStatus.Online || !subscribe) return;

    // Use a variable to control if the effect is still mounted
    let isMounted = true;
    let unsubscribeFn: (() => void) | null = null;

    // Listen to ESP32 response.
    const setupSubscriptions = async () => {
      try {

        const currentModeTopic = `grill/${TOPICS.MODE.CURRENT_MODE}`;

        const unsub = await subscribe(currentModeTopic, handleCurrentMode);

        // Si para cuando terminó de suscribir el componente se desmontó, limpiamos inmediatamente
        if (!isMounted) {
          unsub();
        } else {
          unsubscribeFn = unsub;

          // After subscribing request to ESP32 the current mode
          requestCurrentMode();
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
  }, [clientConnectionStatus, subscribe, handleCurrentMode, requestCurrentMode]);

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