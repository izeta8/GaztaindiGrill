
import React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ChevronUp, ChevronDown, RotateCcw, RotateCw, Square } from 'lucide-react';
import { PAYLOAD_CLOCKWISE, PAYLOAD_COUNTER_CLOCKWISE, PAYLOAD_DOWN, PAYLOAD_STOP, PAYLOAD_UP } from '@/constants/mqtt';
import type { GrillDirection, GrillRotation } from '@/lib/types';

// Definimos todas las props que el componente necesita
interface ControlPanelProps {
  grillName: string;
  isConnected: boolean;
  isProgramRunning: boolean;
  isLeftGrill: boolean;
  targetPosition: string;
  setTargetPosition: (value: string) => void;
  targetTemperature: string;
  setTargetTemperature: (value: string) => void;
  targetRotation: string;
  setTargetRotation: (value: string) => void;
  onDirectionCommand: (direction: GrillDirection) => void;
  onRotationCommand: (rotation: GrillRotation) => void;
  onSetPosition: () => void;
  onSetTemperature: () => void;
  onSetRotation: () => void;
}

export function ControlPanel({
  grillName,
  isConnected,
  isProgramRunning,
  isLeftGrill,
  targetPosition,
  setTargetPosition,
  targetTemperature,
  setTargetTemperature,
  targetRotation,
  setTargetRotation,
  onDirectionCommand,
  onRotationCommand,
  onSetPosition,
  onSetTemperature,
  onSetRotation,
}: ControlPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Control Parrilla {grillName}
      </h3>

      {/* Direction Controls */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Dirección</h4>
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={() => onDirectionCommand(PAYLOAD_UP)} disabled={!isConnected || isProgramRunning} variant="primary" className="flex flex-col items-center py-4">
            <ChevronUp className="h-5 w-5 mb-1" /> <span className="text-xs">Subir</span>
          </Button>
          <Button onClick={() => onDirectionCommand(PAYLOAD_STOP)} disabled={!isConnected || isProgramRunning} variant="primary" className="flex flex-col items-center py-4">
            <Square className="h-5 w-5 mb-1" /> <span className="text-xs">Parar</span>
          </Button>
          <Button onClick={() => onDirectionCommand(PAYLOAD_DOWN)} disabled={!isConnected || isProgramRunning} variant="primary" className="flex flex-col items-center py-4">
            <ChevronDown className="h-5 w-5 mb-1" /> <span className="text-xs">Bajar</span>
          </Button>
        </div>
      </div>

      {/* Rotation Controls (only for left grill) */}
      {isLeftGrill && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Rotación</h4>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Button onClick={() => onRotationCommand(PAYLOAD_COUNTER_CLOCKWISE)} disabled={!isConnected || isProgramRunning} variant="primary" className="flex flex-col items-center py-4">
              <RotateCcw className="h-5 w-5 mb-1" /> <span className="text-xs">Anti-horario</span>
            </Button>
            <Button onClick={() => onRotationCommand(PAYLOAD_STOP)} disabled={!isConnected || isProgramRunning} variant="primary" className="flex flex-col items-center py-4">
              <Square className="h-5 w-5 mb-1" /> <span className="text-xs">Parar</span>
            </Button>
            <Button onClick={() => onRotationCommand(PAYLOAD_CLOCKWISE)} disabled={!isConnected || isProgramRunning} variant="primary" className="flex flex-col items-center py-4">
              <RotateCw className="h-5 w-5 mb-1" /> <span className="text-xs">Horario</span>
            </Button>
          </div>
        </div>
      )}

      {/* Go-To controls */}
      <div className='w-full grid grid-cols-3 grid-auto-col mb-4'>
        <div className="flex items-center flex-col">
          <Input label="Posición (%)" type="number" value={targetPosition} onChange={setTargetPosition} placeholder="0-100" min={0} max={100} />
          <Button onClick={onSetPosition} disabled={!isConnected || isProgramRunning || !targetPosition} variant="primary" className="mt-2 w-1/2">Ir</Button>
        </div>
        <div className="flex items-center flex-col">
          <Input label="Temperatura (°C)" type="number" value={targetTemperature} onChange={setTargetTemperature} placeholder="0-500" min={0} max={500} />
          <Button onClick={onSetTemperature} disabled={!isConnected || isProgramRunning || !targetTemperature} variant="primary" className="mt-2 w-1/2">Ir</Button>
        </div>
        <div className="flex items-center flex-col">
          <Input label="Grados (0-360)" type="number" value={targetRotation} onChange={setTargetRotation} placeholder="0-360" min={0} max={360} />
          <Button onClick={onSetRotation} disabled={!isConnected || isProgramRunning || !targetRotation} variant="primary" className="mt-2 w-1/2">Ir</Button>
        </div>
      </div>

    </div>
  );
}