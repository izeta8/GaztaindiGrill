import { useState, useEffect } from 'react';
import { useMqtt } from '@/hooks/useMqtt';
import { TOPICS } from '@/constants/mqtt';
import type { GrillState } from '@/types';
import { toast } from 'sonner';

export function useGrillState(grillIndex: number, isConnected: boolean) {
  const { subscribe } = useMqtt();
  const [grillState, setGrillState] = useState<GrillState>({
    position: 0,
    temperature: 0,
    rotation: 0,
    lastUpdate: null
  });

  useEffect(() => {
    if (!isConnected) return;

    let isMounted = true;
    const unsubs: (() => void)[] = [];

    const setupSubscriptions = async () => {
      try {
        const createSub = async (topic: string, key: keyof GrillState) => {
          const unsub = await subscribe(`grill/${grillIndex}/${topic}`, (_, payload) => {
            if (!isMounted) return;
            const value = parseInt(payload.toString());
            if (!isNaN(value)) {
              setGrillState(prev => ({ ...prev, [key]: value, lastUpdate: new Date() }));
            }
          });
          if (isMounted) {
            unsubs.push(unsub);
          } else {
            unsub(); // Limpiamos si el componente se desmontó mientras esperábamos la promesa
          }
        };

        await Promise.all([
          createSub(TOPICS.STATUS.SENSOR.POSITION, 'position'),
          createSub(TOPICS.STATUS.SENSOR.TEMPERATURE, 'temperature'),
          createSub(TOPICS.STATUS.SENSOR.ROTATION, 'rotation')
        ]);
      } catch (error) {
        if (isMounted) toast.error('Error al suscribirse a actualizaciones de estado');
        console.error('MQTT subscription error:', error);
      }
    };

    setupSubscriptions();

    return () => {
      isMounted = false;
      unsubs.forEach(unsub => unsub?.());
    };
  }, [isConnected, subscribe, grillIndex]);

  return grillState;
}