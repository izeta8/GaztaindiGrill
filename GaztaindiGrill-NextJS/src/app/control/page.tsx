"use client"

import { Suspense, useState, useEffect } from 'react'
import { useMqtt } from '@/hooks/useMqtt'
import { ConnectionStatus as ConnectionStatusEnum } from '@/types'
import { useRunningPrograms } from '@/contexts/RunningProgramsContext'
import { useGrillState } from '@/app/control/grill/hooks/useGrillState'
import { useGrillCommands } from '@/app/control/grill/hooks/useGrillCommands'
import { ProgramExecutionStatus } from './grill/components/ProgramExecutionStatus'
import { PageHeader } from '@/components/shared/PageHeader'
import { GlobalStatusDock } from '@/components/shared/GlobalStatusDock'
import { Button } from '@/components/ui/Button'
import { ChevronUp, ChevronDown, CircleStop, RotateCw, RotateCcw } from 'lucide-react'
import { PAYLOAD_UP, PAYLOAD_DOWN, PAYLOAD_STOP, PAYLOAD_CLOCKWISE, PAYLOAD_COUNTER_CLOCKWISE } from '@/constants/mqtt'
import GrillScene from '@/components/three/GrillScene'

function GrillControlContent() {
  const { espConnectionStatus, clientConnectionStatus } = useMqtt()
  const { runningPrograms } = useRunningPrograms()
  const isConnected = espConnectionStatus === ConnectionStatusEnum.Online && clientConnectionStatus === ConnectionStatusEnum.Online

  const state0 = useGrillState(0)
  const state1 = useGrillState(1)
  
  const commands0 = useGrillCommands(0, isConnected, 'Izquierda', true)
  const commands1 = useGrillCommands(1, isConnected, 'Derecha', false)

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-2 pb-20 font-sans">
      <div className="max-w-4xl mx-auto">
        <GlobalStatusDock />

        <PageHeader 
          pageTitle="Centro de Control Dual"
          pageDescription="Monitoreo de sensores y actuadores en tiempo real"
        />

        <GrillScene grillState={state0} />

        <div className="flex justify-center items-start gap-8 sm:gap-16 mt-6">
          
          < ControlColumn 
            label="Parrilla I" 
            isConnected={isConnected}
            isRunning={!!runningPrograms[0]}
            commands={commands0}
            grillState={state0}
            grillIndex={0}
          />

          <ControlColumn 
            label="Parrilla D" 
            isConnected={isConnected}
            isRunning={!!runningPrograms[1]}
            commands={commands1}
            grillState={state1}
            grillIndex={1}
          />

        </div>
      </div>
    </div>
  )
}

interface ControlColumnProps {
  label: string;
  isConnected: boolean;
  isRunning: boolean;
  commands: ReturnType<typeof useGrillCommands>;
  grillState: any; 
  grillIndex: 0 | 1;
}

function ControlColumn({ label, isConnected, isRunning, commands, grillState, grillIndex }: ControlColumnProps) {
  const [targetPos, setTargetPos] = useState(grillState?.position?.toString() || '')

  // Sincronizar input con el estado real si no se está escribiendo
  useEffect(() => {
    if (!isRunning && grillState?.position !== undefined) {
      setTargetPos(grillState.position.toString())
    }
  }, [grillState?.position, isRunning])

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
            {/* Pad de Rotación (Solo Izquierda) */}
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
            {/* Fader Vertical de Posición (Paso de 5, invertido) */}
            <div className="relative w-16 h-44 bg-white rounded-3xl shadow-inner border border-gray-100 flex items-center justify-center overflow-hidden">
              {/* Indicador de posición actual (Relleno) */}
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
                style={{ writingMode: 'vertical-lr', WebkitAppearance: 'slider-vertical' } as any}
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

interface ControlPadProps {
  onUp: () => void;
  onStop: () => void;
  onDown: () => void;
  isConnected: boolean;
  icons: {
    up: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    stop: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    down: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  };
}

function ControlPad({ onUp, onStop, onDown, isConnected, icons }: ControlPadProps) {
  const IconUp = icons.up;
  const IconStop = icons.stop;
  const IconDown = icons.down;

  return (
    <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-1.5 w-full max-w-[80px]">
      <Button 
        onClick={onUp} 
        disabled={!isConnected}
        className="h-12 rounded-xl bg-slate-50 hover:bg-blue-50 text-black border-none transition-all group p-0"
      >
        <IconUp className="h-5 w-5 text-black group-active:scale-125 transition-transform" />
      </Button>

      <Button 
        onClick={onStop} 
        disabled={!isConnected}
        variant="secondary"
        className="h-12 rounded-xl bg-slate-100 text-black border-none transition-all p-0"
      >
        <IconStop className="h-5 w-5" />
      </Button>

      <Button 
        onClick={onDown} 
        disabled={!isConnected}
        className="h-12 rounded-xl bg-slate-50 hover:bg-blue-50 text-black border-none transition-all group p-0"
      >
        <IconDown className="h-5 w-5 text-black group-active:scale-125 transition-transform" />
      </Button>
    </div>
  )
}

export default function GrillControlPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center italic text-gray-400">Sincronizando sistemas...</div>}>
      <GrillControlContent />
    </Suspense>
  )
}