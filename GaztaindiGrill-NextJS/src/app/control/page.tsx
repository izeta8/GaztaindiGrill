"use client"

import { Suspense } from 'react'
import { useMqtt } from '@/hooks/useMqtt'
import { ConnectionStatus as ConnectionStatusEnum, GrillModes } from '@/types'
import { useRunningPrograms } from '@/contexts/RunningProgramsContext'
import { useGrillState } from '@/app/control/hooks/useGrillState'
import { useGrillCommands } from '@/app/control/hooks/useGrillCommands'
import { useCurrentMode } from '@/contexts/CurrentModeContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { GlobalStatusDock } from '@/components/shared/GlobalStatusDock'
import GrillScene from '@/components/three/GrillScene'
import { ControlColumn } from './components/ControlColumn'
import { ProgramExecutionStatus } from './components/ProgramExecutionStatus'
import { Loader2 } from 'lucide-react'

function GrillControlContent() {
  const { espConnectionStatus, clientConnectionStatus } = useMqtt()
  const { runningPrograms, isAnyProgramRunning } = useRunningPrograms()
  const { currentMode } = useCurrentMode()
  const isConnected = espConnectionStatus === ConnectionStatusEnum.Online && clientConnectionStatus === ConnectionStatusEnum.Online

  const state0 = useGrillState(0)
  const state1 = useGrillState(1)

  const commands0 = useGrillCommands(0)
  const commands1 = useGrillCommands(1)

  const isDualMode = currentMode === GrillModes.Dual

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-2 pb-20 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Dock */}
        <GlobalStatusDock />

        {/* Cabecera */}
        {/* <PageHeader
          pageTitle="Control de parrillas"
          pageDescription="Monitoreo de sensores y actuadores en tiempo real"
        /> */}

        {/* Modelo 3D */}
        <GrillScene grillState0={state0} grillState1={state1} />

        {/* Esperar a que se fetcheé el modo */}
        {currentMode === undefined && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 animate-in fade-in duration-700">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <p className="text-sm font-medium text-gray-400 animate-pulse uppercase tracking-widest">Sincronizando modo...</p>
          </div>
        )}

        {currentMode !== undefined && (
          <div className="flex justify-center items-start gap-8 sm:gap-16 mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
            
            {isDualMode ? (
              <ControlColumn
                label="Parrilla Dual"
                isConnected={isConnected}
                isRunning={isAnyProgramRunning()}
                commands={commands0}
                grillState={state0}
                grillIndex={0}
              />
            ) : (
              <>
                <ControlColumn
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
              </>
            )}
            
          </div>
        )}

        {/* Ejecucion de programas */}
        {isAnyProgramRunning() && (
          <ProgramExecutionStatus
            handleCancelPrograms={[commands0.handleCancelProgram, commands1.handleCancelProgram]}
            isConnected={isConnected}
          />
        )}
      </div>
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
