import { PAYLOAD_CLOCKWISE, PAYLOAD_COUNTER_CLOCKWISE, PAYLOAD_STOP, PAYLOAD_UP, PAYLOAD_DOWN } from "@/constants/mqtt";

// Grill control types
export interface GrillState {
  position: number; // 0-100
  temperature: number; // degrees celsius
  rotation: number; // 0-360 (only for left grill)
  lastUpdate: Date | null;
}

export type GrillDirection = typeof PAYLOAD_UP | typeof PAYLOAD_DOWN | typeof PAYLOAD_STOP;
export type GrillRotation = typeof PAYLOAD_CLOCKWISE | typeof PAYLOAD_COUNTER_CLOCKWISE | typeof PAYLOAD_STOP;

// Mqtt connection 
export enum ConnectionStatus {
  Connecting = 'connecting',
  Online = 'online',
  Offline = 'offline',
}

export enum ResetStatus {
  Resetting = 'resetting',
  Ready = 'ready'
}

export const GrillModes = {
  Single: 'single',
  Dual: 'dual'
} as const;

export type GrillMode = typeof GrillModes[keyof typeof GrillModes];