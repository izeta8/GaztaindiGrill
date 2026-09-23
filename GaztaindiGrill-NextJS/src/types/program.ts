export interface Program {
  id: number;
  name: string;
  description?: string;
  categoryId?: number;
  stepsJson: string;
  usageCount: number;
  userId: number;
  userName: string;
  creationDate: string;
  updateDate: string;
  isActive: boolean;
  referenceType: ReferenceType;
}

// Type for steps JSON
export interface ProgramStep {
  time?: number;
  temperature?: number;
  position?: number;
  rotation?: number;
  action?: string;
}

// Type for create program
export interface CreateProgramRequest {
  name: string;
  description?: string;
  categoryId: number;
  stepsJson: string;
  userId: number;
  referenceType: ReferenceType;
}

// Type for update program
export interface UpdateProgramRequest {
  name?: string;
  description?: string;
  categoryId?: number;
  stepsJson?: string;
  usageCount?: number;
  updateDate?: string;
  userId?: number;
  isActive?: number;
  referenceType: ReferenceType;
}

export interface RunningProgramStep extends ProgramStep {
  stepStartUnix?: number;
}

// How the firmware is doing at holding a temperature step, while it holds one.
export type TemperatureHoldStatus =
  | 'reaching'
  | 'holding'
  | 'fire_too_weak'
  | 'fire_too_strong'
  | 'not_reached'
  | 'sensor_failed';

export interface TemperatureHold {
  temperature: number;
  band: number;
  status: TemperatureHoldStatus;
}

// Type for the data that a grill has when executing a program
export interface RunningProgram {
  isRunning: boolean;
  name: string;
  description: string,
  creatorName: string,
  usageCount: number,
  programId: number;
  currentStepIndex: number;
  elapsedTime: number;
  steps: RunningProgramStep[];
  referenceType?: ReferenceType;
  hold?: TemperatureHold;
}

// Final state consumed in RunningProgramsContext 
export type RunningPrograms = {
  0: RunningProgram | null;
  1: RunningProgram | null;
};


export const ReferenceTypes = {
  Absolute: 'absolute',
  Relative: 'relative'
} as const;

export type ReferenceType = typeof ReferenceTypes[keyof typeof ReferenceTypes];