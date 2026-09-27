"use client"

import { GrillState } from '@/types'
import { useGrillCommands } from '@/app/control/hooks/useGrillCommands'
import { Button } from '@/components/ui/Button'
import { ChevronUp, ChevronDown, CircleStop, RotateCw, RotateCcw, Crosshair } from 'lucide-react'
import { PAYLOAD_UP, PAYLOAD_DOWN, PAYLOAD_STOP, PAYLOAD_CLOCKWISE, PAYLOAD_COUNTER_CLOCKWISE } from '@/constants/mqtt'
import { ControlPad } from './ControlPad'

interface ControlColumnProps {
  label: string;
  isConnected: boolean;
  isRunning: boolean;
  commands: ReturnType<typeof useGrillCommands>;
  grillState: GrillState;
  grillIndex: 0 | 1;
}

export function ControlColumn({ label, isConnected, isRunning, commands, grillState, grillIndex }: ControlColumnProps) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">{label}</span>

      <div className="relative">
        
        <div className="flex flex-col items-center gap-8">
          
          {/* --- PADS DE CONTROL --- */}
          {/* The zero button is out of flow: in flow it widens the row and the pads stop sitting under the 3D model. */}
          <div className="relative flex items-center justify-center gap-3">
            {grillIndex === 0 && (
              <>
                {/* The firmware refuses to move the zero while a program runs (rotor_busy). */}
                <Button
                  onClick={commands.handleResetRotation}
                  disabled={!isConnected || isRunning}
                  ariaLabel="Poner a cero la rotación"
                  className="absolute right-full top-1/2 -translate-y-1/2 mr-3 h-12 w-12 rounded-full p-0 border-none shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Crosshair className="h-5 w-5" />
                </Button>

                <ControlPad
                  onUp={() => commands.handleRotationCommand(PAYLOAD_COUNTER_CLOCKWISE)}
                  onStop={() => commands.handleRotationCommand(PAYLOAD_STOP)}
                  onDown={() => commands.handleRotationCommand(PAYLOAD_CLOCKWISE)}
                  isConnected={isConnected}
                  movement={grillState.rotation_movement}
                  holdToMove
                  icons={{ up: RotateCcw, stop: CircleStop, down: RotateCw }}
                />
              </>
            )}

            <ControlPad
              onUp={() => commands.handleDirectionCommand(PAYLOAD_UP)}
              onStop={() => commands.handleDirectionCommand(PAYLOAD_STOP)}
              onDown={() => commands.handleDirectionCommand(PAYLOAD_DOWN)}
              isConnected={isConnected}
              movement={grillState.movement}
              icons={{ up: ChevronUp, stop: CircleStop, down: ChevronDown }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
