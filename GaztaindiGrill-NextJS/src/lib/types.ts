
export interface Program {
  id: number;
  name: string;
  description?: string;
  categoryId?: number;
  stepsJson: string;
  usageCount: number;
  creatorName: string;
  creationDate: string;
  updateDate: string;
  isActive: boolean;
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
  creatorName: string;
}

// Type for update program
export interface UpdateProgramRequest {
  name?: string;
  description?: string;
  categoryId?: number;
  stepsJson?: string;
  usageCount?: number;
  updateDate?: string;
  creatorName?: string;
  isActive?: number;
}

// Grill control types
export interface GrillState {
  position: number; // 0-100
  temperature: number; // degrees celsius
  rotation: number; // 0-360 (only for left grill)
  isConnected: boolean;
  lastUpdate: Date | null;
}

export type GrillMode = 'normal' | 'burruntzi' | 'dual';
export type GrillDirection = 'subir' | 'bajar' | 'parar';
export type GrillRotation = 'horario' | 'antihorario' | 'parar';

