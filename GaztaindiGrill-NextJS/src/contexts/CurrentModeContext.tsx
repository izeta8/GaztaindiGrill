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

  const [currentMode, setCurrentMode] = useState<GrillMode | undefined>(undefined);
  const { subscribe, publish, clientConnectionStatus, espConnectionStatus } = useMqtt();

  const value = {
    currentMode,
  };

  const handleCurrentMode = useCallback((_topic: string, payload: Uint8Array) => {
    try {
      const mode = payload.toString();
      if (mode != GrillModes.Dual && mode != GrillModes.Single) return;
      setCurrentMode(mode);
    } catch (error) {
      console.error("[MQTT Handler] Error processing status message:", error);
      toast.error("Error processing MQTT data.");
    }
  }, []);

  // --- MQTT Subscriptions ---
  useEffect(() => {
    if (clientConnectionStatus !== ConnectionStatus.Online || !subscribe) return;

    let isMounted = true;
    let unsubscribeFn: (() => void) | null = null;

    const setupSubscriptions = async () => {
      try {
        const currentModeTopic = `grill/${TOPICS.MODE.CURRENT_MODE}`;
        const unsub = await subscribe(currentModeTopic, handleCurrentMode);

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

  // Request current mode every 1s if undefined
  useEffect(() => {
    if (currentMode !== undefined) return;
    if (clientConnectionStatus !== ConnectionStatus.Online || espConnectionStatus !== ConnectionStatus.Online) return;

    const interval = setInterval(() => {
      console.log("[CurrentModeContext] Polling: Requesting current mode...");
      publish(`grill/${TOPICS.MODE.REQUEST_CURRENT_MODE}`, "requestCurrentMode", { qos: 1 });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentMode, clientConnectionStatus, espConnectionStatus, publish]);

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