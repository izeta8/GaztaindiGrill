import { PAYLOAD_CLOCKWISE, PAYLOAD_COUNTER_CLOCKWISE, PAYLOAD_STOP, PAYLOAD_UP, PAYLOAD_DOWN, PAYLOAD_NORMAL, PAYLOAD_DUAL } from "@/constants/mqtt";
import type { ProgramStep } from "./program";

// Grill control types
export interface GrillState {
  position: number; // 0-100
  temperature: number; // degrees celsius
  rotation: number; // 0-360 (only for left grill)
  lastUpdate: Date | null;
}

export type GrillMode = typeof PAYLOAD_NORMAL | typeof PAYLOAD_DUAL;
export type GrillDirection = typeof PAYLOAD_UP | typeof PAYLOAD_DOWN | typeof PAYLOAD_STOP;
export type GrillRotation = typeof PAYLOAD_CLOCKWISE | typeof PAYLOAD_COUNTER_CLOCKWISE | typeof PAYLOAD_STOP;

// Mqtt connection 
export enum ConnectionStatus {
  Connecting = 'connecting',
  Online = 'online',
  Offline = 'offline',
}