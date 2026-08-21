import { toast } from 'sonner';
import { TOPICS } from '@/constants/mqtt';
import type { Program, ProgramStep } from '@/types';
import type { IClientPublishOptions } from 'mqtt';

type PublishFunction = (topic: string, payload: string, options?: IClientPublishOptions) => Promise<void>;

export const simulateProgramExecution = async (
  publish: PublishFunction,
  grillIndex: 0 | 1,
  program: Program | undefined
) => {
  if (!program) {
    toast.error("No hay un programa disponible para simular.");
    return;
  }

  try {
    const steps = JSON.parse(program.stepsJson);
    
    const simulatePayload = {
      isRunning: true,
      name: program.name,
      programId: program.id,
      currentStepIndex: 0,
      steps: steps.map((s: ProgramStep, i: number) => ({
        ...s,
        ...(i === 0 ? { stepStartUnix: Math.floor(Date.now() / 1000) } : {})
      }))
    };

    const topic = `grill/${grillIndex}/${TOPICS.STATUS.PROGRAM.CURRENT}`;
    
    await publish(topic, JSON.stringify(simulatePayload), { qos: 1, retain: true });
    
    toast.success(`Simulación enviada a MQTT (Grill ${grillIndex})`);
  } catch (error) {
    console.error("Error al crear el payload de simulación:", error);
    toast.error("Error al parsear los pasos del programa para la simulación.");
  }
};