import { useCallback } from 'react';
import { toast } from 'sonner';
import { useMqtt } from '@/hooks/useMqtt';
import { TOPICS } from '@/constants';
import { ConnectionStatus as ConnectionStatusEnum } from '@/types';
import type { GrillDirection, GrillRotation } from '@/types';

// Centralizamos los límites para validaciones
const LIMITS = {
  POSITION_MAX: 100,
  TEMP_MAX: 500,
  ROTATION_MAX: 360,
};

export function useGrillCommands(grillIndex: number) {
  const { publish, espConnectionStatus, clientConnectionStatus } = useMqtt();
  
  const isConnected = espConnectionStatus === ConnectionStatusEnum.Online && clientConnectionStatus === ConnectionStatusEnum.Online;
  const isLeftGrill = grillIndex === 0;
  const grillName = isLeftGrill ? 'Izquierda' : 'Derecha';

  const sendCommand = useCallback(async (topic: string, payload: string) => {
    if (!isConnected) {
      toast.error('MQTT no conectado');
      return;
    }
    try {
      await publish(`grill/${grillIndex}/${topic}`, payload, { qos: 1, retain: false });
      toast.success(`Comando enviado a parrilla ${grillName.toLowerCase()}`);
    } catch (error) {
      toast.error('Error al enviar comando');
      console.error('MQTT publish error:', error);
    }
  }, [isConnected, publish, grillIndex, grillName]);

  const handleDirectionCommand = useCallback((direction: GrillDirection) => {
    sendCommand(TOPICS.ACTION.MOVEMENT.VERTICAL, direction);
  }, [sendCommand]);

  const handleRotationCommand = useCallback((rotation: GrillRotation) => {
    if (!isLeftGrill) return;
    sendCommand(TOPICS.ACTION.MOVEMENT.ROTATION, rotation);
  }, [isLeftGrill, sendCommand]);

  const handleSetPosition = useCallback((value: string) => {
    const pos = parseInt(value);
    if (isNaN(pos) || pos < 0 || pos > LIMITS.POSITION_MAX) {
      toast.error(`Posición debe estar entre 0 y ${LIMITS.POSITION_MAX}`);
      return;
    }
    sendCommand(TOPICS.ACTION.MOVEMENT.SET_POSITION, value);
  }, [sendCommand]);

  const handleSetTemperature = useCallback((value: string) => {
    const temp = parseInt(value);
    if (isNaN(temp) || temp < 0 || temp > LIMITS.TEMP_MAX) {
      toast.error(`Temperatura debe estar entre 0 y ${LIMITS.TEMP_MAX}°C`);
      return;
    }
    toast.info("Funcionalidad (Set Temperature) pendiente de implementación en el firmware.");
  }, []);

  const handleSetRotation = useCallback((value: string) => {
    if (!isLeftGrill) return;
    const rot = parseInt(value);
    if (isNaN(rot) || rot < 0 || rot > LIMITS.ROTATION_MAX) {
      toast.error(`Rotación debe estar entre 0 y ${LIMITS.ROTATION_MAX}°`);
      return;
    }
    sendCommand(TOPICS.ACTION.MOVEMENT.SET_ROTATION, value);
  }, [isLeftGrill, sendCommand]);

  const handleCancelProgram = useCallback(async () => {
    if (window.confirm(`¿Estás seguro de cancelar el programa en la parrilla ${grillName.toLowerCase()}?`)) {
      
      // Send command to ESP32 to cancel the program.
      sendCommand(TOPICS.ACTION.PROGRAM.CANCEL, '');

      // If environment is localhost get rid of mqtt message so the hook doesnt re-read.
      const isLocalhost = process.env.NEXT_PUBLIC_MQTT_SERVER === 'localhost';

      if (isLocalhost) {
        try {
          const payload = JSON.stringify({ isRunning: false });
          await publish(`grill/${grillIndex}/${TOPICS.STATUS.PROGRAM.CURRENT}`, payload, { qos: 1, retain: true });
        } catch (error) {
          console.error("Error updating local state in broker (simulation):", error);
        }
      }
    }
  }, [grillName, sendCommand, publish, grillIndex]);

  return {
    handleDirectionCommand,
    handleRotationCommand,
    handleSetPosition,
    handleSetTemperature,
    handleSetRotation,
    handleCancelProgram
  };
}