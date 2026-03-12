"use client"

import { useState, useEffect } from 'react'
import { GrillState } from '@/types'
import { useGrillCommands } from '@/app/control/grill/hooks/useGrillCommands'
import { ProgramExecutionStatus } from '@/app/control/grill/components/ProgramExecutionStatus'
import { Button } from '@/components/ui/Button'
import { ChevronUp, ChevronDown, CircleStop, RotateCw, RotateCcw } from 'lucide-react'
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
  const [targetPos, setTargetPos] = useState(grillState?.position?.toString() || '')

  const handleSendPosition = () => {
    if (targetPos === '') return
    commands.handleSetPosition(targetPos)
  }

  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">{label}</span>
      
      {!isRunning ? (
        <div className="flex flex-col items-center gap-8">
          
          {/* --- FILA 1: PADS DE CONTROL --- */}
          <div className="flex items-center justify-center gap-3">
            {grillIndex === 0 && (
              <ControlPad 
                onUp={() => commands.handleRotationCommand(PAYLOAD_COUNTER_CLOCKWISE)}
                onStop={() => commands.handleRotationCommand(PAYLOAD_STOP)}
                onDown={() => commands.handleRotationCommand(PAYLOAD_CLOCKWISE)}
                isConnected={isConnected}
                icons={{ up: RotateCcw, stop: CircleStop, down: RotateCw }}
              />
            )}

            {/* Pad de Dirección */}
            <ControlPad 
              onUp={() => commands.handleDirectionCommand(PAYLOAD_UP)}
              onStop={() => commands.handleDirectionCommand(PAYLOAD_STOP)}
              onDown={() => commands.handleDirectionCommand(PAYLOAD_DOWN)}
              isConnected={isConnected}
              icons={{ up: ChevronUp, stop: CircleStop, down: ChevronDown }}
            />
          </div>

          {/* --- FILA 2: SLIDERS Y ENTRADA DE POSICIÓN --- */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-44 bg-white rounded-3xl shadow-inner border border-gray-100 flex items-center justify-center overflow-hidden">
              <div 
                className="absolute bottom-0 w-full bg-blue-500/10 transition-all duration-700 ease-out pointer-events-none"
                style={{ height: `${grillState?.position || 0}%` }}
              />
              <input 
                type="range"
                min="0" max="100" step="5"
                value={targetPos}
                onChange={(e) => setTargetPos(e.target.value)}
                onMouseUp={handleSendPosition}
                onTouchEnd={handleSendPosition}
                disabled={!isConnected}
                className="absolute h-36 w-2 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:w-10 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-500 [&::-webkit-slider-thumb]:rounded-lg [&::-webkit-slider-thumb]:shadow-md rotate-180"
                style={{ writingMode: 'vertical-lr', WebkitAppearance: 'slider-vertical' }}
              />
            </div>

            {/* Input de posición directa y botón ENVIAR */}
            <div className="flex flex-col items-center gap-2 w-full max-w-[80px]">
              <div className="relative w-full">
                <input 
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  placeholder="%"
                  value={targetPos}
                  onChange={(e) => setTargetPos(e.target.value)}
                  onBlur={handleSendPosition}
                  disabled={!isConnected}
                  className="w-full h-10 px-2 bg-white border border-gray-100 rounded-xl text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                />
              </div>
              <Button 
                size="sm"
                disabled={!isConnected || targetPos === ''}
                onClick={handleSendPosition}
                className="w-full h-8 rounded-lg text-[10px] font-bold uppercase tracking-tighter"
              >
                ENVIAR
              </Button>
            </div>
          </div>

        </div>
      ) : (
        <div className="w-full">
          <ProgramExecutionStatus 
            handleCancelProgram={commands.handleCancelProgram} 
            isConnected={isConnected} 
            grillIndex={grillIndex} 
          />
        </div>
      )}
    </div>
  )
}
